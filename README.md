# Lofo · 校园寻物

面向校园社区的失物招领网站：发布寻物启事与失物招领，Campux 统一登录，审核员网页审核，并可将待审核稿件实时推送到 QQ 群（NapCat）。

## 功能

- 寻物 / 招领发布、列表筛选与关键词搜索
- 图片上传、详情页、「我的发布」管理（编辑 / 删除 / 标记已解决）
- Campux OAuth2 登录（PKCE S256），首个登录用户自动成为管理员
- 角色：管理员 / 审核员 / 普通用户
- 审核流：提交待审 → 网页通过/拒绝；可选是否强制审核
- NapCat（OneBot 11）QQ 群通知：新稿件推送、带图通知；群内引用 + @机器人 回「通过 / 拒绝」可完成审核
- 管理后台：用户角色与封禁、站点名称、主页 Hero 背景图、统计概览、NapCat 连接状态
- 响应式布局（桌面导航 + 移动端底部栏）

## 技术栈

| 端 | 技术 |
|----|------|
| 前端 | React 18 · Vite · TailwindCSS · React Router · Axios |
| 后端 | Node.js · Express · better-sqlite3 · express-session · multer · ws |
| 认证 | Campux OAuth2 + PKCE |
| 通知 | NapCat / OneBot 11（Lofo 作 WebSocket 服务端，NapCat 作客户端连入） |

## 目录结构

```
lofo/
├── server/                 # 后端
│   ├── src/
│   │   ├── index.js        # 入口（API + 生产托管 web/dist）
│   │   ├── config.js       # 读取 .env
│   │   ├── db.js           # SQLite 初始化与查询
│   │   ├── oauth.js        # Campux OAuth2 + PKCE
│   │   ├── napcat.js       # NapCat WebSocket 通知 / 群内审核
│   │   ├── upload.js       # 上传目录与文件过滤
│   │   ├── middleware/auth.js
│   │   └── routes/         # auth / items / review / admin / site
│   ├── data/               # SQLite 数据库（运行时生成，勿提交）
│   ├── uploads/            # 默认上传目录（运行时生成，勿提交）
│   └── .env.example        # 环境变量模板（可提交）
├── web/                    # 前端
│   ├── public/             # favicon、logo、manifest
│   ├── src/
│   └── vite.config.js      # 开发代理 /api /uploads → 后端
└── package.json
```

---

# 配置方法（最细）

本项目需要配置三块：**① Campux 登录 ② Lofo 后端环境变量 ③（可选）NapCat QQ 通知**。  
代码与仓库**不含**真实密钥；请始终把真实配置写在服务器上的 `server/.env`（已被 `.gitignore` 忽略）。

## 一、Campux OAuth 绑定（登录必做）

没有 Campux 应用则无法登录。目标：让 Campux 允许你的 Lofo 站点用校园墙账号登录。

### 1.1 先确定对外地址

| 场景 | 用户访问 | 回调 `CAMPUX_REDIRECT_URI` | 登录成功跳回 `FRONTEND_URL` |
|------|----------|----------------------------|-----------------------------|
| 本地开发 | `http://localhost:5173` | `http://localhost:3000/api/auth/callback` | `http://localhost:5173` |
| 生产（Nginx 80/443） | `https://lofo.example.com` | `https://lofo.example.com/api/auth/callback` | `https://lofo.example.com` |
| 生产（同机后端 3011） | 仍是对外域名，**不写** `:3011` | 仍是 `https://域名/api/auth/callback` | 仍是 `https://域名` |

**回调地址规则（必须同时满足）：**

1. 协议与域名和用户浏览器里看到的站点一致（HTTPS 站用 `https://`）。
2. 路径固定为 **`/api/auth/callback`**（对应后端 `GET /api/auth/callback`）。
3. **末尾不要多写 `/`**（`.../callback` 正确，`.../callback/` 会 mismatch）。
4. 与 Lofo 的 `.env` 中 `CAMPUX_REDIRECT_URI` **逐字符相同**。
5. 登记在 Campux 应用的 **redirectUris**（回调地址列表）里。

### 1.2 在 Campux 后台创建应用（回调填在这里）

官方文档：<https://docs.campux.top/reference/oauth>

1. 打开 Campux 站点（例：`https://zhs.campux.top`），用**该校园墙管理员**账号登录。
2. 进入 **OAuth 应用管理**。
3. 若 OAuth 服务未开启，先 **启用 OAuth 服务**。
4. **新建应用**，填写：

| Campux 字段 | 填什么 | 示例 |
|-------------|--------|------|
| 应用名称 | 任意标识 | `Lofo 校园寻物` |
| 应用描述 | 可选 | `失物招领网站登录` |
| **回调地址 / redirectUris** | Lofo 后端回调 | `https://lofo.example.com/api/auth/callback` |
| **Scope** | 至少 `profile` | `profile` |
| PKCE | 默认/推荐 S256 | 保持默认（Lofo 已实现 S256） |

5. 保存后立即复制：
   - **Client ID**
   - **Client Secret**（只显示一次，妥善保存）
6. 确认应用状态为启用，且属于正确的校园墙。

### 1.3 把密钥写入 Lofo

只改服务器/本机的 **`server/.env`**，不要提交到 Git。

```env
# 必填：Campux 站点根地址（不要带路径、不要末尾斜杠）
CAMPUX_BASE_URL=https://campux.example.com

# 必填：上一步复制的应用凭据
CAMPUX_CLIENT_ID=你的-client-id
CAMPUX_CLIENT_SECRET=你的-client-secret

# 必填：与 Campux 后台 redirectUris 完全一致
CAMPUX_REDIRECT_URI=https://your-domain.example/api/auth/callback

# 必填：登录成功后 302 到的站点根地址（前端页面）
FRONTEND_URL=https://your-domain.example
```

改完后重启后端（开发：`npm run dev:server`；生产：`pm2 restart lofo`）。

### 1.4 登录时各 URL 实际是什么

| 步骤 | URL / 行为 |
|------|------------|
| 用户点击「Campux 登录」 | 前端跳转 **`/api/auth/login`**（相对当前域名） |
| 后端生成 state + PKCE | 302 到 `{CAMPUX_BASE_URL}/oauth/authorize?response_type=code&client_id=...&redirect_uri=...&scope=profile&state=...&code_challenge=...&code_challenge_method=S256` |
| Campux 授权页 | 用户登录校园墙并同意 |
| 授权成功 | Campux 跳回 **`CAMPUX_REDIRECT_URI`**，带 `code` + `state` |
| 后端换 token | POST `{CAMPUX_BASE_URL}/oauth/token`，再 GET `/oauth/userinfo` |
| 成功 | 302 到 **`FRONTEND_URL`**，并种下 Session Cookie |
| 前端读用户 | `GET /api/auth/me`；**第一个成功登录的用户自动成为管理员** |

用户不会直接手敲上述授权 URL，只要登录按钮和回调配对即可。

### 1.5 Campux 绑定失败排查

| 报错 / 现象 | 原因 | 怎么改 |
|-------------|------|--------|
| `redirect_uri 未在应用中注册` | Campux 未登记该回调，或域名/协议/路径不一致 | Campux 后台补全，与 `.env` 完全一致 |
| `redirect_uri mismatch` | 授权时的 URI ≠ 换 token 时的 URI | 两处使用同一字符串；检查末尾斜杠 |
| `invalid_client` | Client ID/Secret 错误、应用禁用、应用不属于当前校园墙 | 重新复制密钥；确认校园墙上下文 |
| `PKCE code_challenge 是必需的` | 未带 PKCE | Lofo 已默认 S256，一般无需改代码 |
| 授权后仍显示未登录 | HTTPS 反代下 Session Cookie 未生效 | 见下文「HTTPS / Nginx」；确认 `trust proxy` 与 `COOKIE_SECURE` |
| `无效的 state 参数` | Session 没写上或丢失 | 反代传 `X-Forwarded-Proto`；清站点 Cookie 再试 |

---

## 二、Lofo 后端环境变量（`server/.env` 完整清单）

模板：复制 `server/.env.example` → `server/.env`。

```bash
cp server/.env.example server/.env
```

| 变量 | 必填 | 默认/示例 | 说明 |
|------|------|-----------|------|
| `PORT` | 是 | `3000` 或 `3011` | Node 监听端口。仅服务器内部使用；对外一般由 Nginx 转发 |
| `SESSION_SECRET` | 生产必填 | 随机长字符串 | Express Session 签名密钥；请用足够随机的值 |
| `CAMPUX_BASE_URL` | 是 | `https://zhs.campux.top` | Campux 根地址 |
| `CAMPUX_CLIENT_ID` | 是 | Campux 后台复制 | OAuth Client ID |
| `CAMPUX_CLIENT_SECRET` | 是 | Campux 后台复制 | OAuth Client Secret，**仅服务端** |
| `CAMPUX_REDIRECT_URI` | 是 | `https://域名/api/auth/callback` | 回调，与 Campux 完全一致 |
| `FRONTEND_URL` | 是 | `https://域名` | 登录成功后跳回地址；生产不要用 `localhost` |
| `UPLOAD_DIR` | 建议 | `./uploads` 或 `/data/lofo-uploads` | 图片存储目录；生产应放到部署目录之外 |
| `COOKIE_SECURE` | HTTPS 时 | `true` / 不设 | 仅 HTTPS 时启用 Secure Cookie；纯 HTTP **不要**设 true |

代码中已启用 `app.set('trust proxy', 1)`，配合反代使用。

### 2.1 本地开发 `.env` 示例

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

### 2.2 生产 `.env` 示例（域名 + HTTPS + 后端 3011）

```env
PORT=3011
SESSION_SECRET=请换成足够长的随机字符串
CAMPUX_BASE_URL=https://campux.example.com
CAMPUX_CLIENT_ID=从Campux复制
CAMPUX_CLIENT_SECRET=从Campux复制
CAMPUX_REDIRECT_URI=https://lofo.example.com/api/auth/callback
FRONTEND_URL=https://lofo.example.com
UPLOAD_DIR=/data/lofo-uploads
COOKIE_SECURE=true
```

说明：

- `PORT=3011` 只对 Nginx 上游；用户仍访问 `https://域名`。
- `UPLOAD_DIR` 建议 `mkdir -p /data/lofo-uploads && chmod 777 /data/lofo-uploads`（或按权限模型调整）。
- 纯 HTTP 部署：不要设 `COOKIE_SECURE=true`，`CAMPUX_*` / `FRONTEND_URL` 用 `http://域名`。

---

## 三、本地开发运行

### 环境要求

- Node.js **18+**（建议 20/22 LTS）
- 能访问的 Campux（未配置密钥时可浏览，但登录会失败）

### 安装

```bash
npm run install:all
# = cd server && npm install && cd ../web && npm install
```

### 启动

```bash
# 同时启动后端 :3000 + 前端 :5173
npm run dev
```

或分开：

```bash
npm run dev:server
npm run dev:web
```

浏览器打开：`http://localhost:5173`  
开发时 Vite 已把 `/api`、`/uploads` 代理到 `http://localhost:3000`（见 `web/vite.config.js`）。

### 生产构建

```bash
npm run build     # 产出 web/dist
npm start         # 启动 server；若存在 web/dist 则同时托管前端 SPA
```

访问：`http://服务器:PORT/` 或经反代的域名。

---

## 四、Linux 服务器部署（PM2 + Nginx 示例）

以目录 `/opt/lofo`、域名 `https://lofo.example.com`、后端端口 `3011` 为例。

### 4.1 上传代码

```bash
# 本机
# 将项目源码放到 /opt/lofo（git clone 或 scp）
cd /opt/lofo
```

### 4.2 安装依赖并构建

```bash
# 后端（better-sqlite3 可能需编译）
cd /opt/lofo/server && npm install

# 前端
cd /opt/lofo/web && npm install && npm run build
# 生成 /opt/lofo/web/dist
```

### 4.3 配置 `.env`

```bash
cp /opt/lofo/server/.env.example /opt/lofo/server/.env
# 用编辑器填入真实值（见「生产 .env 示例」）
```

### 4.4 持久化上传目录（避免覆盖部署丢图）

```bash
mkdir -p /data/lofo-uploads
chmod 777 /data/lofo-uploads
# .env 中：UPLOAD_DIR=/data/lofo-uploads
```

数据库在 `server/data/lofo.db`（首次启动自动建表）。请定期备份：

- `server/data/`（SQLite）
- `/data/lofo-uploads/`（图片）
- `server/.env`（密钥）

### 4.5 PM2 启动

```bash
# 必须在 server 目录下启动，或 --cwd 指向 server，否则读不到 .env
cd /opt/lofo/server
pm2 start src/index.js --name lofo --cwd /opt/lofo/server
pm2 save
pm2 startup   # 按提示执行输出的命令，实现开机自启
```

重启：

```bash
pm2 restart lofo
pm2 logs lofo --lines 50
curl -s http://127.0.0.1:3011/api/health   # 应返回 {"status":"ok"}
```

### 4.6 Nginx / OpenResty 反代（HTTPS）

示例站点配置（路径按你的发行版调整）：

```nginx
server {
    listen 80;
    server_name lofo.example.com;
    # certbot 会改为 80 跳转 443
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name lofo.example.com;

    # ssl_certificate     /path/fullchain.pem;
    # ssl_certificate_key /path/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3011;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        # HTTPS 下 Session / COOKIE_SECURE 依赖这一行
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 20m;  # 与图片上传大小匹配
    }
}
```

申请证书（Let’s Encrypt）示例：

```bash
certbot --nginx -d lofo.example.com
```

完成后：

1. `.env` 使用 `https://` 的 `CAMPUX_REDIRECT_URI`、`FRONTEND_URL`
2. `COOKIE_SECURE=true`
3. Campux 后台回调改为 `https://lofo.example.com/api/auth/callback`
4. `pm2 restart lofo`

### 4.7 部署后自检清单

```bash
# 1. 进程
pm2 status lofo

# 2. 本机 API
curl -s http://127.0.0.1:3011/api/health
curl -s http://127.0.0.1:3011/api/site

# 3. 公网
curl -sI https://lofo.example.com | head -5
curl -s https://lofo.example.com/api/health

# 4. 浏览器
# - 打开首页、点 Campux 登录、能回到站点且右上角有用户名
# - 第一个登录用户进入 /admin
```

---

## 五、管理后台配置（登录后，`/admin`）

首个成功登录的用户自动为 **管理员**。

### 5.1 系统设置

| 配置项 | 存在哪里 | 说明 |
|--------|----------|------|
| 站点名称 | 数据库 `settings` | 顶栏标题 |
| 主页顶部背景图 | `settings.hero_bg_image` + 上传文件 | 管理员上传；对应公开接口 `GET /api/site` |
| 发布需要审核 | `settings.require_review` | 开启后新稿件为 pending，并触发 QQ 通知 |
| NapCat 连接端口 | `settings.napcat_ws_port` | Lofo 监听的 WebSocket 端口；修改后需重启 |
| NapCat Token | `settings.napcat_token` | 与 NapCat 侧一致；可空（不鉴权） |
| 通知 QQ 群号 | `settings.napcat_qq_group` | 新稿件推送群 |

### 5.2 用户管理

- 修改角色：普通用户 / 审核员 / 管理员  
- 封禁 / 解封  
- 不能改自己的角色，也不能封禁自己  

### 5.3 角色权限

| 角色 | 路径与能力 |
|------|------------|
| user | 发布、管理自己的稿件 |
| reviewer | 另可访问 `/review`；可看待审详情 |
| admin | 另可访问 `/admin`（用户、设置、背景图、统计） |

---

## 六、NapCat QQ 群通知配置

**连接模型：** Lofo = WebSocket **服务端**；NapCat = WebSocket **客户端**（主动连入）。仅此一种方式。

### 6.1 NapCat 侧

1. 部署 NapCat（Docker 或安装包），扫码登录机器人 QQ。  
2. 机器人加入接收通知的群。  
3. NapCat WebUI → **网络配置** → 新建 **「WebSocket 客户端」**：  

| 项 | 值 |
|----|-----|
| 地址 | `ws://服务器IP:NapCat端口`（与后台端口一致）；同机可 `ws://127.0.0.1:3002` |
| Token | 若 Lofo 后台设置了 Token，必须一致；否则可空 |

4. 若 NapCat 在另一台机器或公网，云安全组放行该端口。

### 6.2 Lofo 侧

管理后台 → 系统设置：

- NapCat 连接端口  
- NapCat Token  
- 通知 QQ 群号  
- 保存后查看状态是否为绿色「已连接」  

改端口后：`pm2 restart lofo`，再让 NapCat 重连。

### 6.3 群内审核

- 审核员 **引用** 通知消息，并 **@机器人**，发送：`通过` / `过` 或 `拒绝` / `拒`。  
- 审核人的 QQ 必须已在 Lofo 登录过，且角色为审核员或管理员。

### 6.4 通知失败排查

| 现象 | 原因 |
|------|------|
| 后台一直「未连接」 | NapCat 没连上、端口不通、Token 不一致 |
| 群无消息但日志有「已通过 WebSocket 发送」 | 机器人不在群里 / 群号填错 |
| 带图通知失败 | 图片路径或 URL 问题；查看 `pm2 logs lofo` |

---

## 七、常用 API（排障用）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/health` | 无 | 健康检查 `{"status":"ok"}` |
| GET | `/api/site` | 无 | 站点名、主页背景图 |
| GET | `/api/auth/login` | 无 | 发起 Campux 登录 |
| GET | `/api/auth/callback` | 无 | OAuth 回调 |
| POST | `/api/auth/logout` | Cookie | 退出 |
| GET | `/api/auth/me` | Cookie | 当前用户 |
| GET | `/api/items` | 无 | 已通过物品列表 |
| GET | `/api/items/my` | 登录 | 我的全部稿件 |
| POST/PUT/DELETE | `/api/items...` | 登录 | 发布/编辑/删除等 |
| GET/POST | `/api/review/...` | reviewer/admin | 审核 |
| GET/PUT | `/api/admin/...` | admin | 用户/设置/统计/状态 |
| POST/DELETE | `/api/admin/settings/hero-bg` | admin | 上传/清除主页背景图 |

---

## 八、常见问题汇总

**登录回调 redirect_uri**  
Campux 与 `.env` 必须一致；见「Campux 绑定失败排查」。

**HTTPS 后登录 CSRF / state / 未登录**  
- Nginx：`proxy_set_header X-Forwarded-Proto $scheme;`  
- 后端已有 `trust proxy`  
- HTTPS：`COOKIE_SECURE=true`；HTTP：不要设 true  
- 清浏览器 Cookie 后重试  

**上传图片丢失**  
`UPLOAD_DIR` 放到部署目录外；备份该目录与 `server/data/`。

**PM2 起来还是读不到 PORT=3011**  
必须在 `server` 目录启动，或 `pm2 start ... --cwd /opt/lofo/server`，否则 dotenv 读不到 `server/.env`。

**better-sqlite3 安装失败**  
升级/确认 Node 版本；Linux 安装编译工具后在 `server` 重装依赖。

**多实例**  
SQLite + 本地 Session 不适合多开；请单实例 PM2，或自行迁移到共享存储与外部 Session。

---

## 九、安全清单

- Client Secret、`SESSION_SECRET`、NapCat Token 只放服务器 `.env`，**禁止**提交 Git。  
- 仓库仅有 `.env.example` 模板；`.env` / `data/` / `uploads/` 已忽略。  
- 回调只登记可信域名，勿用通配。  
- 生产优先 HTTPS；管理后台仅授信任角色。  

官方 Campux 文档：<https://docs.campux.top/reference/oauth>

---

## 许可证

本项目未附带开源许可证；使用与部署前请与仓库所有者确认。
