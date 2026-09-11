// 管理员路由模块（需要管理员权限）
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  getAllUsers,
  getUserById,
  updateUserRole,
  updateUserBanStatus,
  getAllSettings,
  updateSetting,
  getSetting,
  getStats,
} from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getNapCatStatus } from '../napcat.js';
import { uploadDir, imageFileFilter } from '../upload.js';

const router = express.Router();

// 主页背景图上传：10MB 限制，仅图片
const heroUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `hero-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`);
    },
  }),
  fileFilter: imageFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// 所有路由均需要登录 + 管理员权限
router.use(requireAuth, requireRole('admin'));

// GET /api/admin/users - 获取所有用户列表（分页）
router.get('/users', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 12;

  const { users, total } = getAllUsers(page, pageSize);

  res.json({
    users,
    total,
    page,
    pageSize,
  });
});

// PUT /api/admin/users/:id/role - 更新用户角色
router.put('/users/:id/role', (req, res) => {
  const id = parseInt(req.params.id);
  const { role } = req.body;

  // 角色合法性校验
  if (!['admin', 'reviewer', 'user'].includes(role)) {
    return res.status(400).json({ error: '角色必须是 admin、reviewer 或 user' });
  }

  // 不能修改自己的角色
  if (id === req.user.id) {
    return res.status(400).json({ error: '不能修改自己的角色' });
  }

  const user = getUserById(id);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  const updatedUser = updateUserRole(id, role);
  res.json({ user: updatedUser });
});

// PUT /api/admin/users/:id/ban - 封禁/解封用户
router.put('/users/:id/ban', (req, res) => {
  const id = parseInt(req.params.id);
  const { isBanned } = req.body;

  // 不能封禁自己
  if (id === req.user.id) {
    return res.status(400).json({ error: '不能封禁自己' });
  }

  const user = getUserById(id);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  const updatedUser = updateUserBanStatus(id, isBanned);
  res.json({ user: updatedUser });
});

// GET /api/admin/settings - 获取所有系统设置
router.get('/settings', (req, res) => {
  const settings = getAllSettings();
  res.json({ settings });
});

// PUT /api/admin/settings - 批量更新系统设置
router.put('/settings', (req, res) => {
  const settings = req.body;

  // 遍历更新所有设置项
  for (const [key, value] of Object.entries(settings)) {
    updateSetting(key, String(value));
  }

  // 返回更新后的所有设置
  const updatedSettings = getAllSettings();
  res.json({ settings: updatedSettings });
});

// POST /api/admin/settings/hero-bg - 上传并设置主页顶部背景图
router.post('/settings/hero-bg', heroUpload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '请选择要上传的图片' });
  }

  // 删除旧的 Hero 背景文件（避免残留）
  const prev = getSetting('hero_bg_image');
  if (prev && prev.startsWith('/uploads/')) {
    const prevPath = path.join(uploadDir, path.basename(prev));
    if (fs.existsSync(prevPath)) {
      try { fs.unlinkSync(prevPath); } catch { /* 忽略删除失败 */ }
    }
  }

  const imagePath = `/uploads/${req.file.filename}`;
  updateSetting('hero_bg_image', imagePath);
  res.json({ settings: getAllSettings(), hero_bg_image: imagePath });
});

// DELETE /api/admin/settings/hero-bg - 清除主页背景图（回退默认渐变）
router.delete('/settings/hero-bg', (req, res) => {
  const prev = getSetting('hero_bg_image');
  if (prev && prev.startsWith('/uploads/')) {
    const prevPath = path.join(uploadDir, path.basename(prev));
    if (fs.existsSync(prevPath)) {
      try { fs.unlinkSync(prevPath); } catch { /* 忽略删除失败 */ }
    }
  }
  updateSetting('hero_bg_image', '');
  res.json({ settings: getAllSettings(), hero_bg_image: '' });
});

// GET /api/admin/stats - 获取仪表盘统计数据
router.get('/stats', (req, res) => {
  const stats = getStats();
  res.json(stats);
});

// GET /api/admin/napcat-status - 获取 NapCat 连接状态
router.get('/napcat-status', (req, res) => {
  res.json(getNapCatStatus());
});

export default router;
