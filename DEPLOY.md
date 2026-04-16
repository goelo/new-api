# VPS 部署指南

## 架构说明

```
用户请求 (80/443)
    └── new-api-web (nginx, Docker)
            ├── GET /          → 自定义静态首页
            ├── /v1/*          → new-api:3000 (流式 API，无 sub_filter)
            ├── /assets/*      → new-api:3000 (静态资源)
            └── 其他所有请求   → new-api:3000 (含 sub_filter 品牌替换)
```

- **new-api**：使用 `calciumion/new-api:latest` 官方镜像，无需本地编译
- **new-api-web**：上游前端源码 + overlay 定制，构建为 nginx 镜像
- **nginx 配置**：`overlay/web-nginx.conf`（打包进镜像，修改后需重新 build）
- **postgres**：持久化数据库，数据存在 `pg_data` named volume 中
- **redis**：缓存，无持久化需求

---

## 前置条件

```bash
# Docker
curl -fsSL https://get.docker.com | sh

# 验证 docker-compose
docker-compose version
```

---

## 首次部署

### 1. 拉取代码

```bash
git clone <your-repo-url> /root/git/new-api
cd /root/git/new-api
```

### 2. 拉取上游前端源码

```bash
./sync.sh
```

### 3. 修改生产环境密码

编辑 `docker-compose.yml`，替换以下默认值（**必须修改**）：

| 配置项 | 说明 |
|--------|------|
| `SESSION_SECRET` | JWT 签名密钥，用 `openssl rand -hex 32` 生成 |
| `POSTGRES_PASSWORD` | 数据库密码 |
| `SQL_DSN` 中的密码 | 与 `POSTGRES_PASSWORD` 保持一致 |

### 4. 配置 SSL 证书

```bash
# 安装 certbot
apt install -y certbot

# 申请证书（需要域名 DNS 已指向本机）
certbot certonly --standalone -d your-domain.com
```

证书保存在 `/etc/letsencrypt/live/your-domain.com/`，已通过 volume 挂载进容器。

修改 `overlay/web-nginx.conf` 中的域名（替换 `forestapi.com`）：

```nginx
server_name your-domain.com;
ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
```

### 5. 启动服务

```bash
docker-compose up -d

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f new-api
```

---

## 更新

### 更新后端（官方镜像）

```bash
docker-compose pull new-api
docker-compose up -d new-api
```

不影响 nginx 配置和前端镜像。

### 更新前端 / nginx 配置

修改 `overlay/` 下的文件后：

```bash
docker-compose build web
docker-compose up -d web
```

### 更新上游前端源码

```bash
./sync.sh
docker-compose build web
docker-compose up -d web
```

---

## SSL 证书续期

Certbot 已自动配置续期任务。手动续期：

```bash
docker stop new-api-web
certbot renew
docker-compose up -d web
```

---

## 目录结构

```
/root/git/new-api/
├── docker-compose.yml      # 服务编排（443 端口、证书 volume 挂载）
├── overlay/
│   ├── web-nginx.conf      # nginx 配置（SSL + 反代 + 品牌替换）
│   └── ...                 # 前端定制文件
├── nginx/
│   └── nginx.conf          # 与 overlay/web-nginx.conf 保持同步（参考用）
├── upstream/               # 上游前端源码（由 sync.sh 填充）
├── data/                   # new-api 运行时数据
└── logs/                   # 应用日志
```

---

## 常见问题

**Q: 修改了 nginx 配置但没生效？**

`overlay/web-nginx.conf` 打包在镜像里，需要重新 build：
```bash
docker-compose build web && docker-compose up -d web
```

**Q: HTTPS 打不开？**

检查 443 端口是否监听：
```bash
ss -tlnp | grep 443
```
检查证书是否挂载进容器：
```bash
docker exec new-api-web ls /etc/letsencrypt/live/your-domain.com/
```

**Q: 数据库连接失败？**
```bash
docker-compose logs postgres
```

**Q: 查看实时日志？**
```bash
docker-compose logs -f new-api
docker-compose logs -f new-api-web
```
