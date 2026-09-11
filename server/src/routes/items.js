// 物品路由模块（失物/招领 CRUD）
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from '../config.js';
import {
  getApprovedItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  setItemStatus,
  getSetting,
  getItemsByUserId,
} from '../db.js';
import { notifyNewSubmission } from '../napcat.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// ==================== Multer 文件上传配置 ====================

// 确保上传目录存在
const uploadDir = path.resolve(__dirname, '..', config.uploadDir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置 multer 存储
const storage = multer.diskStorage({
  // 存储目录
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  // 文件名：时间戳-随机数.扩展名
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    cb(null, filename);
  },
});

// 文件过滤器：仅允许图片文件
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('仅允许上传 jpg、png、gif、webp 格式的图片文件'));
  }
};

// 创建 multer 实例，最大 10MB
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ==================== 路由定义 ====================

// GET /api/items/my - 获取当前用户发布的物品（包含所有状态）
router.get('/my', requireAuth, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 12;
  const { items, total } = getItemsByUserId(req.user.id, page, pageSize);
  res.json({ items, total, page, pageSize });
});

// GET /api/items - 获取已审核通过的物品列表（分页 + 筛选）
router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 12;
  const type = req.query.type || null;
  const keyword = req.query.keyword || null;

  const { items, total } = getApprovedItems({ type, keyword, page, pageSize });

  res.json({
    items,
    total,
    page,
    pageSize,
  });
});

// GET /api/items/:id - 获取单个物品详情
// 仅允许查看已审核通过的物品，或物品所有者/管理员查看
router.get('/:id', optionalAuth, (req, res) => {
  const id = parseInt(req.params.id);
  const item = getItemById(id);

  if (!item) {
    return res.status(404).json({ error: '物品不存在' });
  }

  // 如果物品未审核通过，则仅允许所有者、管理员或审核员查看
  if (item.status !== 'approved') {
    if (!req.user) {
      return res.status(403).json({ error: '该物品正在审核中，暂不可见' });
    }
    const isOwner = req.user.id === item.user_id;
    const isStaff = req.user.role === 'admin' || req.user.role === 'reviewer';
    if (!isOwner && !isStaff) {
      return res.status(403).json({ error: '该物品正在审核中，暂不可见' });
    }
  }

  res.json({ item });
});

// POST /api/items - 创建新物品（需要登录）
// Multer 处理单文件上传，字段名为 "image"
router.post('/', requireAuth, upload.single('image'), async (req, res) => {
  const { type, title, description, location, contact } = req.body;

  // 参数校验
  if (!type || !['lost', 'found'].includes(type)) {
    return res.status(400).json({ error: '物品类型必须是 lost 或 found' });
  }
  if (!title) {
    return res.status(400).json({ error: '标题不能为空' });
  }

  // 构建图片路径（相对 URL）
  let imagePath = null;
  if (req.file) {
    imagePath = `/uploads/${req.file.filename}`;
  }

  // 根据设置决定物品初始状态
  const requireReview = getSetting('require_review') === 'true';
  const status = requireReview ? 'pending' : 'approved';

  // 创建物品
  const item = createItem({
    user_id: req.user.id,
    type,
    title,
    description: description || null,
    image_path: imagePath,
    location: location || null,
    contact: contact || null,
    status,
  });

  // 如果需要审核，则发送 QQ 群通知
  if (status === 'pending') {
    // 异步通知，不阻塞响应
    notifyNewSubmission(item, req.user);
  }

  res.status(201).json({ item });
});

// PUT /api/items/:id - 更新物品信息（需要登录，仅所有者或管理员）
router.put('/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  const item = getItemById(id);

  if (!item) {
    return res.status(404).json({ error: '物品不存在' });
  }

  // 权限检查：仅所有者或管理员可修改
  const isOwner = req.user.id === item.user_id;
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: '无权修改他人物品' });
  }

  const { title, description, location, contact } = req.body;

  // 更新物品（不能修改 type）
  const updatedItem = updateItem(id, {
    title: title || item.title,
    description: description !== undefined ? description : item.description,
    location: location !== undefined ? location : item.location,
    contact: contact !== undefined ? contact : item.contact,
  });

  res.json({ item: updatedItem });
});

// DELETE /api/items/:id - 删除物品（需要登录，仅所有者或管理员）
router.delete('/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  const item = getItemById(id);

  if (!item) {
    return res.status(404).json({ error: '物品不存在' });
  }

  // 权限检查：仅所有者或管理员可删除
  const isOwner = req.user.id === item.user_id;
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: '无权删除他人物品' });
  }

  // 删除关联的图片文件
  if (item.image_path) {
    const filename = path.basename(item.image_path);
    const filePath = path.join(uploadDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  // 从数据库删除物品
  deleteItem(id);
  res.json({ success: true });
});

// POST /api/items/:id/resolve - 标记物品为已解决（需要登录，仅所有者）
router.post('/:id/resolve', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  const item = getItemById(id);

  if (!item) {
    return res.status(404).json({ error: '物品不存在' });
  }

  // 权限检查：仅所有者可标记为已解决
  const isOwner = req.user.id === item.user_id;
  if (!isOwner) {
    return res.status(403).json({ error: '仅物品发布者可标记为已解决' });
  }

  const updatedItem = setItemStatus(id, 'resolved');
  res.json({ item: updatedItem });
});

export default router;
