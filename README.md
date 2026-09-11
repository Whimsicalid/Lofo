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

### Campux 绑定与登录配置（详细）

本项目登录**完全依赖 Campux OAuth2**，没有账号密码本地登录。你需要在 Campux 侧创建应用，再在 Lofo 的 `server/.env` 里填对应参数。

#### 1. 先想清楚你要用的对外地址

| 场景 | 用户浏览器地址 | 回调地址 `CAMPUX_REDIRECT_URI` | 登录成功后跳回 `FRONTEND_URL` |
|------|----------------|--------------------------------|-------------------------------|
| 本地开发 | `http://localhost:5173` | `http://localhost:3000/api/auth/callback` | `http://localhost:5173` |
| 生产（单进程托管） | `https://你的域名` | `https://你的域名/api/auth/callback` | `https://你的域名` |
| 生产（后端非 80/443） | 仍用对外域名/端口 | 仍是 `https://对外域名/api/auth/callback` | 仍是 `https://对外域名` |

要点：

- 回调地址是 **Lofo 后端** 的路径，不是 Campux 的地址。
- 生产一般由 Nginx / OpenResty 把 80/443 反代到后端（例如 3000/3011），**对 Campux 只暴露对外域名**，不要写 `https://域名:后端端口` 除非你真用那个端口对外。
- 回调必须以 `/api/auth/callback` 结尾（对应代码路由 `GET /api/auth/callback`）。

#### 2. 在 Campux 后台创建 OAuth 应用（回调在这里填）

Campux 官方说明：<https://docs.campux.top/reference/oauth>

1. 打开你的 Campux 站点（例如 `https://zhs.campux.top`），用**校园墙管理员**登录。
2. 进入 **OAuth 应用管理**（通常在运营/管理相关菜单下）。
3. 若提示 OAuth 服务未启用，先 **启用 OAuth 服务**。
4. **新建应用**，按下列字段填写：

| 字段 | 填什么 | 示例 |
|------|--------|------|
| 应用名称 | 任意 | `Lofo 校园寻物` |
| 应用描述 | 可选 | `校园失物招领登录` |
| **回调地址 / redirectUris** | Lofo 的回调（必须与 `.env` 完全一致） | `https://lofo.example.com/api/auth/callback` |
| **Scope** | 至少 `profile` | `profile` |
| PKCE | 推荐 / 默认 S256 | `S256`（Lofo 已按 S256 实现） |

5. 保存后立刻复制 **Client ID**、**Client Secret**（Secret 往往只显示一次）。
6. 若你的校园墙后台提供多个回调输入，**必须包含**上面那条完整回调 URL。

#### 3. 在 Lofo 侧配置（只改 `server/.env`，不要写进 Git）

编辑 `server/.env`：

```env
# 监听端口（生产反代时对内即可）
PORT=3000

# 会话密钥：足够长的随机字符串
SESSION_SECRET=请替换成随机长字符串

# Campux 站点根地址（不要带路径，不要末尾斜杠）
CAMPUX_BASE_URL=https://campux.example.com

# 上一步从 Campux 复制的应用凭据
CAMPUX_CLIENT_ID=your-client-id
CAMPUX_CLIENT_SECRET=your-client-secret

# 回调：必须与 Campux 后台 redirectUris 逐字符一致
CAMPUX_REDIRECT_URI=https://your-domain.example/api/auth/callback

# 登录成功后跳回的站点根地址（前端页面）
FRONTEND_URL=https://your-domain.example

# 上传目录
UPLOAD_DIR=./uploads

# 全站 HTTPS 时再开；纯 HTTP 保持不开启
# COOKIE_SECURE=true
```

本地最小可跑示例（未配真实 Client 时登录会失败，页面仍可浏览）：

```env
PORT=3000
SESSION_SECRET=dev-secret-change-me
CAMPUX_BASE_URL=https://campux.example.com
CAMPUX_CLIENT_ID=dev-client-id
CAMPUX_CLIENT_SECRET=dev-client-secret
CAMPUX_REDIRECT_URI=http://localhost:3000/api/auth/callback
FRONTEND_URL=http://localhost:5173
UPLOAD_DIR=./uploads
```

改完 `.env` 后重启后端：

```bash
# 开发
npm run dev:server

# PM2 生产
pm2 restart lofo
```

#### 4. 登录入口与完整流程（代码里怎么用）

| 步骤 | 地址 / 行为 | 谁实现 |
|------|-------------|--------|
| 用户点「Campux 登录」 | 打开 `GET /api/auth/login` | 前端 `window.location.href = '/api/auth/login'` |
| 后端生成 `state` + PKCE | 重定向到 Campux 授权页 | `server/src/oauth.js` → `getAuthorizationUrl` |
| Campux 授权页 | 用户登录校园墙并同意 | Campux |
| 授权完成 | Campux 跳回 `CAMPUX_REDIRECT_URI` | `GET /api/auth/callback` |
| 后端换 Token、拉 userinfo | 创建/更新用户，写入 Session | `server/src/routes/auth.js` |
| 成功 | 302 到 `FRONTEND_URL` | 回调里 `res.redirect(config.frontendUrl)` |
| 前端拿当前用户 | `GET /api/auth/me` | 首个用户自动成为 `admin` |

授权时使用的 `scope` 当前为 **`profile`**（见 `server/src/oauth.js`）。无需 `tenant`。

#### 5. 常见绑定失败对照

| 现象 | 原因 | 处理 |
|------|------|------|
| `redirect_uri 未在应用中注册` | Campux 后台没登记该回调，或域名/协议不一致 | 核对 Campux 应用与 `.env` 中 URI 完全一致 |
| `redirect_uri mismatch` | 授权时用的 URI ≠ 换 Token 时的 URI | 只改一处会失败；两边都用同一字符串 |
| `invalid_client` | Client ID / Secret 错误或不属于该校园墙 | 重新复制密钥，确认应用未禁用 |
| `PKCE code_challenge 是必需的` | 极少数 Campux 配置要求 PKCE | Lofo 已实现 S256，一般无需改代码 |
| 登录成功后仍像未登录 | Session Cookie 未种上（常见于 HTTPS 反代） | 反代传递 `X-Forwarded-Proto`；HTTPS 下设 `COOKIE_SECURE=true` |
| `state` 无效 / CSRF | 多实例或未信任代理导致 Session 不一致 | 确认 `app.set('trust proxy', 1)`（代码已有）；不要多进程共用错误 cookie 域 |

#### 6. 安全清单

- Client Secret、`SESSION_SECRET` 只放服务器 `.env`，**禁止**提交到 GitHub。
- `.env` 已被 `.gitignore` 忽略；仓库内只有 `.env.example` 占位模板。
- 回调地址不要用通配域名；只登记可信域名。
- 生产优先 HTTPS。

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
