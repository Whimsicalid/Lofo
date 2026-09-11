// 数据库初始化与辅助函数模块
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 确保数据目录存在
const dataDir = join(__dirname, '..', 'data');
mkdirSync(dataDir, { recursive: true });

// 初始化数据库连接
const dbPath = join(dataDir, 'lofo.db');
const db = new Database(dbPath);

// 开启 WAL 模式提升并发性能
db.pragma('journal_mode = WAL');

// 创建数据库表
db.exec(`
  -- 用户表
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sub TEXT UNIQUE,             -- Campux 用户唯一标识
    qq TEXT,                     -- QQ 号码
    username TEXT,               -- 显示名称
    role TEXT DEFAULT 'user',    -- 角色：admin / reviewer / user
    is_banned INTEGER DEFAULT 0, -- 是否被封禁：0 否，1 是
    tenant_id TEXT,              -- 租户 ID
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- 物品表（失物/招领）
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id), -- 发布者
    type TEXT,                             -- 类型：lost / found
    title TEXT,                            -- 标题
    description TEXT,                      -- 描述
    image_path TEXT,                       -- 图片路径
    location TEXT,                         -- 丢失/拾取地点
    contact TEXT,                          -- 联系方式
    status TEXT DEFAULT 'pending',         -- 状态：pending / approved / rejected / resolved
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- 系统设置表（键值对）
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  -- 审核日志表
  CREATE TABLE IF NOT EXISTS review_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER REFERENCES items(id),   -- 关联物品
    reviewer_id INTEGER REFERENCES users(id), -- 审核员
    action TEXT,                            -- 操作：approved / rejected
    reason TEXT,                            -- 原因（拒绝时填写）
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- 群通知消息映射表（QQ 消息 id -> 稿件 id，用于群内引用审核）
  CREATE TABLE IF NOT EXISTS review_notify_messages (
    message_id TEXT PRIMARY KEY, -- QQ 群消息 id
    item_id INTEGER,             -- 关联的稿件 id
    group_id TEXT,               -- 通知所在的群号
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// 插入默认设置（如果不存在）
const insertDefaultSetting = db.prepare(
  'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
);
insertDefaultSetting.run('napcat_ws_port', '3002');
insertDefaultSetting.run('napcat_token', '');
insertDefaultSetting.run('napcat_qq_group', '');
insertDefaultSetting.run('site_name', 'Lofo 寻物');
insertDefaultSetting.run('require_review', 'true');
insertDefaultSetting.run('hero_bg_image', '');

// ==================== 用户相关辅助函数 ====================

// 根据 Campux sub 查询用户
export function getUserBySub(sub) {
  return db.prepare('SELECT * FROM users WHERE sub = ?').get(sub);
}

// 根据 ID 查询用户
export function getUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

// 根据 QQ 号查询用户（用于群内审核身份校验）
export function getUserByQq(qq) {
  if (!qq) return null;
  return db.prepare('SELECT * FROM users WHERE qq = ?').get(String(qq));
}

// 插入或更新用户信息（首次注册的用户自动成为管理员）
export function upsertUser({ sub, qq, username, tenant_id }) {
  const existing = getUserBySub(sub);
  if (existing) {
    // 已存在用户，更新信息
    db.prepare(`
      UPDATE users SET qq = ?, username = ?, tenant_id = ? WHERE id = ?
    `).run(qq || existing.qq, username || existing.username, tenant_id || existing.tenant_id, existing.id);
    return getUserById(existing.id);
  }
  // 判断是否为首个用户（users 表为空时自动设为管理员）
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const role = userCount === 0 ? 'admin' : 'user';
  const result = db.prepare(`
    INSERT INTO users (sub, qq, username, role, tenant_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(sub, qq || null, username || null, role, tenant_id || null);
  return getUserById(result.lastInsertRowid);
}

// 更新用户角色
export function updateUserRole(userId, role) {
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);
  return getUserById(userId);
}

// 更新用户封禁状态
export function updateUserBanStatus(userId, isBanned) {
  db.prepare('UPDATE users SET is_banned = ? WHERE id = ?').run(isBanned ? 1 : 0, userId);
  return getUserById(userId);
}

// 分页查询所有用户
export function getAllUsers(page, pageSize) {
  const offset = (page - 1) * pageSize;
  const users = db.prepare(`
    SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all(pageSize, offset);
  const total = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  return { users, total };
}

// ==================== 物品相关辅助函数 ====================

// 查询已审核通过的物品（分页 + 筛选）
export function getApprovedItems({ type, keyword, page, pageSize }) {
  const offset = (page - 1) * pageSize;
  let query = `
    SELECT i.*, u.username as user_name
    FROM items i
    JOIN users u ON i.user_id = u.id
    WHERE i.status = 'approved'
  `;
  const params = [];

  // 按类型筛选
  if (type) {
    query += ' AND i.type = ?';
    params.push(type);
  }
  // 关键词搜索标题和描述
  if (keyword) {
    query += ' AND (i.title LIKE ? OR i.description LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  query += ' ORDER BY i.created_at DESC LIMIT ? OFFSET ?';
  params.push(pageSize, offset);

  const items = db.prepare(query).all(...params);

  // 统计总数
  let countQuery = "SELECT COUNT(*) as count FROM items WHERE status = 'approved'";
  const countParams = [];
  if (type) {
    countQuery += ' AND type = ?';
    countParams.push(type);
  }
  if (keyword) {
    countQuery += ' AND (title LIKE ? OR description LIKE ?)';
    countParams.push(`%${keyword}%`, `%${keyword}%`);
  }
  const total = db.prepare(countQuery).get(...countParams).count;

  return { items, total };
}

// 查询单个物品（包含作者信息）
export function getItemById(id) {
  return db.prepare(`
    SELECT i.*, u.username as user_name, u.qq as user_qq
    FROM items i
    JOIN users u ON i.user_id = u.id
    WHERE i.id = ?
  `).get(id);
}

// 创建物品
export function createItem({ user_id, type, title, description, image_path, location, contact, status }) {
  const result = db.prepare(`
    INSERT INTO items (user_id, type, title, description, image_path, location, contact, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(user_id, type, title, description, image_path, location, contact, status);
  return getItemById(result.lastInsertRowid);
}

// 更新物品信息（不能修改 type）
export function updateItem(id, { title, description, location, contact }) {
  db.prepare(`
    UPDATE items SET title = ?, description = ?, location = ?, contact = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(title, description, location, contact, id);
  return getItemById(id);
}

// 删除物品
export function deleteItem(id) {
  return db.prepare('DELETE FROM items WHERE id = ?').run(id);
}

// 设置物品状态
export function setItemStatus(id, status) {
  db.prepare(`
    UPDATE items SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(status, id);
  return getItemById(id);
}

// 查询待审核物品（分页）
export function getPendingItems(page, pageSize) {
  const offset = (page - 1) * pageSize;
  const items = db.prepare(`
    SELECT i.*, u.username as user_name
    FROM items i
    JOIN users u ON i.user_id = u.id
    WHERE i.status = 'pending'
    ORDER BY i.created_at DESC LIMIT ? OFFSET ?
  `).all(pageSize, offset);
  const total = db.prepare("SELECT COUNT(*) as count FROM items WHERE status = 'pending'").get().count;
  return { items, total };
}

// 查询指定用户发布的物品（分页，包含所有状态）
export function getItemsByUserId(userId, page, pageSize) {
  const offset = (page - 1) * pageSize;
  const items = db.prepare(`
    SELECT i.*, u.username as user_name
    FROM items i
    JOIN users u ON i.user_id = u.id
    WHERE i.user_id = ?
    ORDER BY i.created_at DESC LIMIT ? OFFSET ?
  `).all(userId, pageSize, offset);
  const total = db.prepare('SELECT COUNT(*) as count FROM items WHERE user_id = ?').get(userId).count;
  return { items, total };
}

// ==================== 审核日志相关辅助函数 ====================

// 创建审核日志
export function createReviewLog({ item_id, reviewer_id, action, reason }) {
  return db.prepare(`
    INSERT INTO review_logs (item_id, reviewer_id, action, reason)
    VALUES (?, ?, ?, ?)
  `).run(item_id, reviewer_id, action, reason || null);
}

// ==================== 群通知消息映射相关辅助函数 ====================

// 记录群通知消息 id 与稿件 id 的对应关系（用于群内引用审核）
export function saveReviewNotifyMessage({ message_id, item_id, group_id }) {
  return db.prepare(`
    INSERT INTO review_notify_messages (message_id, item_id, group_id)
    VALUES (?, ?, ?)
    ON CONFLICT(message_id) DO UPDATE SET item_id = excluded.item_id, group_id = excluded.group_id
  `).run(String(message_id), item_id, group_id || null);
}

// 根据被引用的群消息 id 反查稿件 id
export function getItemIdByReviewMessageId(messageId) {
  const row = db.prepare(
    'SELECT item_id FROM review_notify_messages WHERE message_id = ?'
  ).get(String(messageId));
  return row ? row.item_id : null;
}

// ==================== 设置相关辅助函数 ====================

// 获取所有设置
export function getAllSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

// 获取单个设置项
export function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

// 更新设置项（不存在则插入）
export function updateSetting(key, value) {
  db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value);
}

// ==================== 统计相关辅助函数 ====================

// 获取仪表盘统计数据
export function getStats() {
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const totalItems = db.prepare('SELECT COUNT(*) as count FROM items').get().count;
  const pendingItems = db.prepare('SELECT COUNT(*) as count FROM items WHERE status = \'pending\'').get().count;
  const approvedItems = db.prepare('SELECT COUNT(*) as count FROM items WHERE status = \'approved\'').get().count;
  const resolvedItems = db.prepare('SELECT COUNT(*) as count FROM items WHERE status = \'resolved\'').get().count;
  return { totalUsers, totalItems, pendingItems, approvedItems, resolvedItems };
}

export default db;
