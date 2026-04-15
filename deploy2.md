# VPS 部署指南（前后端分离版）

## 架构说明

```
用户请求 (port 80/443)
    └── new-api-web (前端容器, nginx)
            ├── /                     → React SPA 自定义首页
            ├── /console, /login ...  → React SPA 内部路由（无刷新跳转）
            ├── /api/*                → 反代到 new-api:3000
            └── /oauth, /login ...    → 反代到 new-api:3000
```

- **new-api**：`calciumion/new-api:latest` 官方后端镜像，纯 API 服务，端口 3000
- **new-api-web**：基于 `web/Dockerfile` 自建前端镜像，包含自定义首页 React 组件
- **postgres**：PostgreSQL 15，数据持久化在 `pg_data` volume
- **redis**：缓存，无持久化

### 与旧方案（DEPLOY.md）的区别

| 对比项 | 旧方案 | 新方案 |
|--------|--------|--------|
| 首页 | nginx 拦截 `/`，serve 纯 HTML | React SPA 内置首页组件 |
| 管理页跳转 | 全量页面刷新，白屏加载 | React Router 内部跳转，无刷新 |
| 前端来源 | 官方镜像内嵌 | 自建镜像（可定制任意页面） |
| 容器数量 | nginx + new-api | new-api-web + new-api |

---

## 前置条件

```bash
# Docker + Docker Compose
curl -fsSL https://get.docker.com | sh
docker compose version  # 确认 v2.x.x
```

---

## 部署步骤

### 1. 拉取代码

```bash
git clone <your-repo-url> /opt/new-api
cd /opt/new-api
```

### 2. 修改生产环境密码

编辑 `docker-compose.yml`，替换以下默认值（**必须修改**）：

| 配置项 | 位置 | 说明 |
|--------|------|------|
| `SESSION_SECRET` | new-api environment | JWT 签名密钥，随机字符串 |
| `POSTGRES_PASSWORD` | postgres environment | 数据库密码 |
| `SQL_DSN` 中的密码 | new-api environment | 与 POSTGRES_PASSWORD 保持一致 |

```bash
# 生成随机 SESSION_SECRET
openssl rand -hex 32
```

### 3. 启动服务

```bash
# 首次启动需要构建前端镜像
docker compose up -d --build

# 查看状态
docker compose ps

# 查看日志
docker compose logs -f new-api
docker compose logs -f web
```

### 4. 验证

```bash
# 后端健康检查
curl http://localhost:3000/api/status

# 前端（首页）
curl -I http://localhost:80/

# API 代理（通过前端 nginx 转发）
curl http://localhost:80/api/status
```

浏览器访问 `http://<your-vps-ip>`：
- 应看到自定义首页
- 点击「获取密钥」跳转到 `/console`，无白屏闪烁

---

## 配置域名 + HTTPS

推荐用 Caddy 自动申请 SSL：

```bash
apt install -y caddy

# /etc/caddy/Caddyfile
your-domain.com {
    reverse_proxy localhost:80
}

systemctl reload caddy
```

---

## 更新部署

### 仅更新后端（官方镜像升级）

```bash
cd /opt/new-api
docker compose pull new-api
docker compose up -d new-api
```

### 仅更新前端（改了首页或其他前端代码）

```bash
cd /opt/new-api
git pull
docker compose up -d --build web
```

### 全量更新

```bash
cd /opt/new-api
git pull
docker compose pull new-api
docker compose up -d --build
```

> 数据不会丢失，PostgreSQL 数据在 `pg_data` named volume 中。

---

## 目录结构

```
/opt/new-api/
├── docker-compose.yml          # 服务编排
├── web/                        # 前端源码
│   ├── Dockerfile              # 前端镜像构建（Bun build → nginx:alpine）
│   ├── nginx.conf              # 前端 nginx 配置（静态文件 + API 反代）
│   ├── src/pages/Home/
│   │   ├── index.jsx           # 自定义首页 React 组件
│   │   ├── index.original.jsx  # 官方原版首页备份
│   │   └── style.css           # 首页样式
│   └── ...
├── custom-homepage/            # 旧版纯 HTML 首页（已弃用，保留备份）
├── nginx/                      # 旧版 nginx 配置（已弃用）
├── data/                       # new-api 运行时数据（自动创建）
└── logs/                       # 应用日志（自动创建）
```

---

## 前端 nginx 关键配置说明

`web/nginx.conf` 核心逻辑：

```nginx
# 前端静态文件 + SPA fallback
location / {
    try_files $uri $uri/ /index.html;
}

# API 反代到后端容器
location /api {
    proxy_pass http://new-api:3000;
    proxy_buffering off;          # 流式响应实时转发
    proxy_read_timeout 300s;      # AI 长对话超时
}
```

- `proxy_buffering off`：关闭 nginx 缓冲，AI 流式响应（SSE）逐 token 转发，不攒包
- `proxy_read_timeout 300s`：匹配后端 `STREAMING_TIMEOUT=300`
- `try_files ... /index.html`：SPA 路由 fallback，所有前端路径都返回 index.html

---

## 常见问题

**Q: 前端构建失败？**
```bash
# 查看构建日志
docker compose build web --no-cache

# 确认 web/ 目录下有 package.json 和 bun.lock
ls web/package.json web/bun.lock
```

**Q: API 请求 502？**
```bash
# 检查后端是否启动
docker compose ps new-api
docker compose logs new-api

# 检查容器网络互通
docker compose exec web ping new-api
```

**Q: 首页样式没更新？**
```bash
# 重新构建前端镜像
docker compose up -d --build web

# 浏览器强制刷新 Ctrl+Shift+R 清缓存
```

**Q: 数据库连接失败？**
```bash
docker compose logs postgres
# new-api 有健康检查，postgres 未就绪时会自动重试
```

**Q: 端口 80 被占用？**
```bash
lsof -i:80
# 或修改 docker-compose.yml 中 web 的 ports: "8080:80"
```

**Q: 想恢复官方原版首页？**
```bash
cd web/src/pages/Home
cp index.original.jsx index.jsx
cd /opt/new-api
docker compose up -d --build web
```
