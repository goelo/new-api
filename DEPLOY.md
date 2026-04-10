# VPS 部署指南

## 架构说明

```
用户请求 (port 80)
    └── nginx-proxy
            ├── GET /          → custom-homepage/index.html (自定义静态首页)
            ├── /custom-assets → custom-homepage/assets/
            └── 其他所有请求   → new-api:3000 (官方后端镜像，含控制台/API)
```

- **new-api**：使用 `calciumion/new-api:latest` 官方镜像，无需本地编译
- **nginx**：仅拦截根路径 `/`，替换为自定义首页；其余全部反代到后端
- **postgres**：持久化数据库，数据存在 `pg_data` named volume 中
- **redis**：缓存，无持久化需求

---

## 前置条件

VPS 上需要安装：

```bash
# Docker
curl -fsSL https://get.docker.com | sh

# Docker Compose plugin（新版 Docker 已内置）
docker compose version  # 验证，v2 输出 "Docker Compose version v2.x.x"
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
# 生成随机 SESSION_SECRET 示例
openssl rand -hex 32
```

### 3. 启动服务

```bash
docker compose up -d

# 查看启动状态
docker compose ps

# 查看日志
docker compose logs -f new-api
```

### 4. 验证

```bash
# 后端健康检查
curl http://localhost:3000/api/status

# 首页（经 nginx）
curl -I http://localhost:80/
```

浏览器访问 `http://<your-vps-ip>` 应看到自定义首页。

---

## 配置域名 + HTTPS（可选）

推荐用 Caddy 作为外层反代，自动申请 SSL 证书：

```bash
# 安装 Caddy
apt install -y caddy

# /etc/caddy/Caddyfile
your-domain.com {
    reverse_proxy localhost:80
}

systemctl reload caddy
```

或者修改 nginx 配置支持 HTTPS，参考 `nginx/nginx.conf`。

---

## 更新部署

```bash
cd /opt/new-api
git pull

# 更新官方镜像
docker compose pull new-api

# 重启（数据不丢失，pg_data volume 持久化）
docker compose up -d
```

自定义首页改动（`custom-homepage/` 或 `nginx/nginx.conf`）只需：

```bash
git pull
docker compose restart nginx
```

---

## 目录结构

```
/opt/new-api/
├── docker-compose.yml      # 服务编排
├── nginx/
│   └── nginx.conf          # nginx 反代配置
├── custom-homepage/        # 自定义静态首页
│   ├── index.html
│   ├── style.css
│   └── assets/
├── data/                   # new-api 运行时数据（自动创建）
└── logs/                   # 应用日志（自动创建）
```

---

## 常见问题

**Q: 首页没有更新？**
```bash
docker compose restart nginx
# nginx 重启后立即生效，无需重建镜像
```

**Q: 数据库连接失败？**
```bash
# 检查 postgres 是否就绪
docker compose logs postgres
# new-api 有健康检查，postgres 未就绪时会自动重试
```

**Q: 端口 80 被占用？**
```bash
# 查看占用进程
lsof -i:80
# 或修改 docker-compose.yml 中 nginx 的 ports: "8080:80"
```
