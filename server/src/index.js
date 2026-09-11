// Lofo 后端服务主入口
import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import './db.js'; // 初始化数据库

// 路由模块
import authRoutes from './routes/auth.js';
import itemsRoutes from './routes/items.js';
import reviewRoutes from './routes/review.js';
import adminRoutes from './routes/admin.js';
import siteRoutes from './routes/site.js';
import { startNapCatServer } from './napcat.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 创建 Express 应用
const app = express();

// 信任反向代理（nginx），使 COOKIE_SECURE 在 HTTPS 反代下正确工作
app.set('trust proxy', 1);

// ==================== 中间件配置 ====================

// 解析 JSON 请求体
app.use(express.json());
// 解析 URL 编码的请求体
app.use(express.urlencoded({ extended: true }));
// 解析 Cookie
app.use(cookieParser());

// 配置 CORS 跨域（允许前端携带凭证）
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));

// 配置会话
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    // 仅在显式配置 COOKIE_SECURE=true 时启用安全 Cookie（需 HTTPS）
    // IP 直连/HTTP 部署时不启用，避免登录会话失效
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天有效期
  },
}));

// ==================== 静态文件服务 ====================

// 上传文件的静态服务（/uploads 路径映射到上传目录）
const uploadDir = path.resolve(__dirname, '..', config.uploadDir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// ==================== API 路由挂载 ====================

app.use('/api/auth', authRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/review', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/site', siteRoutes);

// 健康检查接口
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ==================== 前端静态文件服务（生产环境） ====================

// 如果 web/dist 目录存在，则提供前端静态文件服务（SPA 模式）
const frontendDistPath = path.resolve(__dirname, '..', '..', 'web', 'dist');
if (fs.existsSync(frontendDistPath)) {
  // 提供前端静态资源
  app.use(express.static(frontendDistPath));

  // SPA 回退：所有非 API 的 GET 请求返回 index.html
  app.get('*', (req, res) => {
    // 排除 API 路由和上传文件路由
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
      return res.status(404).json({ error: '接口不存在' });
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// ==================== 全局错误处理 ====================

// 统一错误响应格式
app.use((err, req, res, next) => {
  // Multer 文件大小超限错误
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: '文件大小超过 10MB 限制' });
  }
  // Multer 文件类型错误
  if (err.message && err.message.includes('仅允许上传')) {
    return res.status(400).json({ error: err.message });
  }
  // 其他错误
  console.error('未处理的错误:', err);
  res.status(500).json({ error: err.message || '服务器内部错误' });
});

// ==================== 启动服务器 ====================

app.listen(config.port, () => {
  console.log(`Lofo 后端服务已启动: http://localhost:${config.port}`);
  console.log(`前端地址: ${config.frontendUrl}`);
  // 启动 NapCat WebSocket 服务器（等待 NapCat 以 WebSocket 客户端方式连接）
  startNapCatServer();
});
