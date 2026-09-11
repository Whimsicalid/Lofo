# Lofo · 校园寻物

面向校园社区的失物招领网站：发布寻物启事与失物招领，Campux 统一登录，审核员网页审核，并可将待审稿件实时推送到 QQ 群（NapCat）。

## 功能

- 寻物 / 招领发布、列表筛选与关键词搜索
- 图片上传、详情页、「我的发布」管理（编辑 / 删除 / 标记已解决）
- Campux OAuth2 登录（PKCE S256），首个登录用户自动成为管理员
- 角色：管理员 / 审核员 / 普通用户
- 审核流：提交待审 → 网页通过/拒绝；可选是否强制审核
- NapCat（OneBot 11）QQ 群通知：新稿件推送、带图通知；群内引用 + @机器人 回「通过 / 拒绝」可完成审核
- 管理后台：用户角色与封禁、站点名称、主页 Hero 背景图、统计概览
- 响应式布局（桌面导航 + 移动端底部栏）

## 技术栈

| 端 | 技术 |
|----|------|
| 前端 | React 18 · Vite · TailwindCSS · React Router · Axios |
| 后端 | Node.js · Express · better-sqlite3 · express-session · multer · ws |
| 认证 | Campux OAuth2 + PKCE |
| 通知 | NapCat / OneBot 11（WebSocket 客户端接入） |

## 目录结构

```
lofo/
├── server/                 # 后端
│   ├── src/
│   │   ├── index.js        # 入口（API + 生产托管前端）
│   │   ├── config.js
│   │   ├── db.js
│   │   ├── oauth.js
│   │   ├── napcat.js
│   │   ├── upload.js
│   │   ├── middleware/
│   │   └── routes/
│   ├── data/               # SQLite（运行时生成，勿提交）
│   ├── uploads/            # 上传文件（运行时生成，勿提交）
│   └── .env.example
├── web/                    # 前端
│   ├── src/
│   └── vite.config.js
└── package.json
```

## 快速开始（本地开发）

### 环境要求

- Node.js **18+**（建议 20/22 LTS；`better-sqlite3` 可能需要在服务器端编译原生模块）
- 可访问的 Campux 实例（用于登录；本地可先只看列表与静态页）

### 1. 安装依赖

```bash
npm run install:all
# 等价于：
# cd server && npm install
# cd ../web && npm install
```

### 2. 配置后端环境变量

```bash
cp server/.env.example server/.env
```

编辑 `server/.env`（详见下方「配置说明」）。本地最小示例：

```env
PORT=3000
SESSION_SECRET=请改成足够长的随机字符串

CAMPUX_BASE_URL=https://campux.example.com
CAMPUX_CLIENT_ID=你的-client-id
CAMPUX_CLIENT_SECRET=你的-client-secret
CAMPUX_REDIRECT_URI=http://localhost:3000/api/auth/callback

FRONTEND_URL=http://localhost:5173
UPLOAD_DIR=./uploads
```

### 3. 启动

```bash
# 前后端同时启动（后端 :3000，前端 :5173）
npm run dev
```

或分别启动：

```bash
npm run dev:server
npm run dev:web
```

开发时前端通过 Vite 代理访问 `/api` 与 `/uploads`。

浏览器打开 `http://localhost:5173`。

### 4. 生产构建

```bash
npm run build          # 产出 web/dist
npm start              # 启动 server（若存在 web/dist 则一并托管 SPA）
```

生产模式下请将 `FRONTEND_URL`、`CAMPUX_REDIRECT_URI` 改为实际对外域名，并在反向代理上正确设置 `X-Forwarded-Proto`（HTTPS 时配合 `COOKIE_SECURE=true` 与 `app.set('trust proxy', 1)`，代码中已启用 trust proxy）。

---

## 配置说明

### 环境变量 `server/.env`

| 变量 | 说明 |
|------|------|
| `PORT` | 后端监听端口，默认 `3000` |
| `SESSION_SECRET` | Session 签名密钥，请使用随机长字符串，**不要提交到 Git** |
| `CAMPUX_BASE_URL` | Campux 站点根地址，如 `https://zhs.campux.top` |
| `CAMPUX_CLIENT_ID` | Campux OAuth 应用 Client ID |
| `CAMPUX_CLIENT_SECRET` | Campux OAuth 应用 Client Secret（**仅放服务端**） |
| `CAMPUX_REDIRECT_URI` | 回调地址，须与 Campux 后台登记**完全一致** |
| `FRONTEND_URL` | 登录成功后跳回的站点地址（生产为对外 HTTPS 域名） |
| `UPLOAD_DIR` | 上传目录；生产建议放到部署目录之外，例如 `/data/lofo-uploads`，避免覆盖部署时丢文件 |
| `COOKIE_SECURE` | 设为 `true` 时仅在 HTTPS 下发送安全 Cookie；纯 HTTP 请勿开启 |

**安全提醒：** `.env` 已在 `.gitignore` 中忽略。请勿把真实 Client Secret、会话密钥、NapCat Token 写入任何会公开的文件。

### Campux OAuth 应用

1. 用校园墙管理员登录 Campux Web 后台，切换到目标校园墙。
2. 启用 OAuth 服务，创建应用。
3. **回调地址**填：`https://你的域名/api/auth/callback`（与 `.env` 中 `CAMPUX_REDIRECT_URI` 一致；本地开发可先用 `http://localhost:3000/api/auth/callback`）。
4. **Scope** 至少包含 `profile`（用户信息）。若你的校园墙不支持 `tenant`，代码当前仅请求 `profile`。
5. 保存后复制 Client ID / Client Secret 写入 `.env`，重启后端。

官方文档：<https://docs.campux.top/reference/oauth>

### 管理后台（登录后）

首个成功登录的用户自动为 **管理员**。

路径：`/admin`（或手机端底部「管理」）。

#### 系统设置

| 配置项 | 说明 |
|--------|------|
| 站点名称 | 顶栏 Logo 旁标题 |
| 主页顶部背景图 | 上传后用于首页 Hero；可清除恢复默认渐变 |
| 发布需要审核 | 开启后新稿件为「待审核」，并触发 QQ 群通知 |
| NapCat 连接端口 | 后端 WebSocket 监听端口（默认示例 `3002`，可改；改后需重启） |
| NapCat Token | 与 NapCat 侧连接 Token 一致（可留空表示不鉴权，生产建议设置） |
| 通知 QQ 群号 | 新稿件推送到的群 |

保存后立即生效（端口类变更需重启后端）。

#### 用户管理

修改角色（普通用户 / 审核员 / 管理员）、封禁 / 解封。不能修改自己的角色或封禁自己。

### NapCat QQ 群通知

Lofo **作为 WebSocket 服务端**监听端口，NapCat 以「**WebSocket 客户端**」主动连入（仅此一种连接方式）。

1. 部署并登录 NapCat（Docker 或其他方式），机器人 QQ 加入目标群。
2. NapCat 网络配置 → 新建 **WebSocket 客户端**：
   - 地址：`ws://服务器IP:端口`（与后台「NapCat 连接端口」一致；同机可 `ws://127.0.0.1:3002`）
   - Token：若后台设置了 Token，则此处必须一致
3. 在云安全组 / 防火墙放行该端口（若 NapCat 在公网或不同机器）。
4. 打开 Lofo 管理后台 → 系统设置，确认状态为绿色「已连接」。

**群内审核：**

- 审核员**引用**审核通知消息，并 **@机器人**，发送：`通过` / `过` → 通过；`拒绝` / `拒` → 打回。
- 审核人 QQ 必须已在 Lofo 登录过，且角色为审核员或管理员。

### 角色与权限（概览）

| 角色 | 能力 |
|------|------|
| user | 登录后发布、管理自己的稿件 |
| reviewer | 另可访问 `/review` 审核；可查看待审详情 |
| admin | 另可访问 `/admin`（用户、设置、背景图、统计） |

---

## 常见问题

**登录回调报 redirect_uri 未注册 / mismatch**  
Campux 后台登记的回调与 `.env` 中 `CAMPUX_REDIRECT_URI` 必须逐字符一致（协议、域名、路径、末尾斜杠）。

**HTTPS + 反代后登录 CSRF / state 无效**  
确认反代传递 `X-Forwarded-Proto`，后端已 `trust proxy`，且 `COOKIE_SECURE=true` 仅在全站 HTTPS 时开启。

**上传图片部署后丢失**  
将 `UPLOAD_DIR` 指到部署目录之外的持久化路径，备份该目录与 `server/data/`。

**群通知无图 / 图片失败**  
NapCat 若在 Docker 内，请保证可通过公网 URL 访问图片，或依赖代码中对本机文件的 base64 发送逻辑（需 NapCat 能通过 WebSocket 接收消息段）。

**better-sqlite3 安装失败**  
确认 Node 版本符合依赖要求；Linux 生产环境可安装构建工具后重装依赖：`npm install`。

---

## 许可证

本项目未附带开源许可证；使用与部署前请与仓库所有者确认。
