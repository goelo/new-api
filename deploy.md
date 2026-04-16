# Forest API 部署指南

基于 [New API](https://github.com/QuantumNous/new-api) 的 Overlay 定制部署方案。

**核心思路**：后端使用官方镜像，前端从上游源码构建并覆盖自定义组件，单层 Nginx 容器处理 TLS、静态页面路由和 API 代理。上游更新时零冲突。

## 架构说明

```
用户请求 (443/80)
    └── web 容器 Nginx（TLS + 路由）
            ├── GET /              → custom-homepage/index.html
            ├── /pricing /about /docs → custom-homepage/
            ├── /assets/           → 前端 dist/（长期缓存）
            ├── /api /mj /pg /v1/  → new-api 容器（内网 3000）
            └── 其他路径           → 前端 SPA（dist/index.html）
```

- **new-api**：官方镜像，不对外暴露端口
- **web**：overlay 构建的前端 + Nginx，对外唯一入口（80/443）
- **postgres**：持久化数据库
- **redis**：缓存

## 目录结构

```
forest-api/
├── docker-compose.yml
├── Dockerfile.web          # 前端 overlay 构建
├── sync.sh                 # 拉取/更新上游源码
├── run.sh                  # 一键更新部署
├── custom-homepage/        # 自定义静态页面（首页、定价、文档等）
├── overlay/                # 前端定制层
│   ├── pages/Home/
│   ├── components/layout/
│   ├── index.css.append
│   └── web-nginx.conf      # Nginx 配置（单层，含 TLS）
├── data/                   # 运行时数据（gitignore）
├── logs/                   # 运行时日志（gitignore）
└── upstream/               # 上游源码（sync.sh 拉取，gitignore）
```

## 前置条件

- Docker 和 Docker Compose
- 域名已解析到服务器 IP
- Git

```bash
curl -fsSL https://get.docker.com | sh
```

## 首次部署

### 1. 克隆仓库

```bash
git clone git@github.com:goelo/new-api.git forest-api
cd forest-api
```

### 2. 申请 TLS 证书

```bash
apt install -y certbot
certbot certonly --standalone -d forestapi.com
```

### 3. 修改密码

编辑 `docker-compose.yml`，替换默认值（**必须修改**）：

```yaml
POSTGRES_PASSWORD: <your-strong-password>
SQL_DSN: postgresql://root:<your-strong-password>@postgres:5432/new-api
SESSION_SECRET: <openssl rand -hex 32>
```

### 4. 拉取上游源码并构建启动

```bash
./sync.sh
docker compose build
docker compose up -d
```

### 5. 验证

```bash
docker compose ps
curl -s https://forestapi.com/api/status | grep success
```

## 日常更新

```bash
./run.sh          # 同步上游 + 拉取最新官方镜像 + 重新构建前端 + 重启
./run.sh v3.8.0   # 指定版本
```

## 更新自定义静态页面

修改 `custom-homepage/` 后重新构建前端：

```bash
docker compose build web && docker compose up -d web
```

## overlay 文件说明

| 文件 | 作用 | 何时需要同步上游 |
|------|------|----------------|
| `overlay/pages/Home/` | 自定义首页组件 | 永远不需要 |
| `overlay/index.css.append` | 主题 CSS | 永远不需要 |
| `overlay/components/layout/Footer.jsx` | 自定义 Footer | 上游改了 Footer 时 |
| `overlay/components/layout/headerbar/` | 自定义导航栏 | 上游改了 headerbar 时 |
| `overlay/web-nginx.conf` | Nginx 配置 | 极少需要改 |

检查上游是否改了需要同步的文件：

```bash
cd upstream && git log --oneline --since="2 weeks ago" -- \
  web/src/components/layout/Footer.jsx \
  web/src/components/layout/headerbar/index.jsx \
  web/src/components/layout/headerbar/HeaderLogo.jsx
```

## 故障排查

```bash
# 前端构建失败
docker compose build web --no-cache 2>&1 | tail -50

# 后端日志
docker compose logs new-api | grep -i error

# 证书续签
certbot renew && docker compose restart web
```

自动续签：

```bash
echo "0 3 * * * certbot renew --quiet && docker compose -f /path/to/forest-api/docker-compose.yml restart web" | crontab -
```
