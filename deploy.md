# Forest API 部署文档

基于 [New API](https://github.com/QuantumNous/new-api) 的 Overlay 定制部署方案。

**核心思路**：后端直接使用官方镜像，前端从上游源码构建并覆盖自定义组件，通过 Nginx 实现品牌定制和静态页面路由。上游更新时零冲突。

## 架构概览

```
                     ┌─────────────────────────────┐
                     │   Nginx (nginx/nginx.conf)   │
                     │   TLS · 品牌替换 · 静态页路由  │
                     │   Port 443                    │
                     └──────────┬──────────┬────────┘
                                │          │
               location = /     │          │  location /
               /pricing /docs   │          │  /v1/ /assets/ /api
                                │          │
                    ┌───────────▼──┐  ┌────▼──────────┐
                    │ custom-      │  │   new-api      │
                    │ homepage/    │  │   (官方镜像)    │
                    │ 静态 HTML    │  │   Port 3000    │
                    └──────────────┘  └───────┬────────┘
                                              │
                    ┌─────────────────────────┐│
                    │   web (Dockerfile.web)   ││
                    │   上游前端 + overlay 定制 ││
                    │   Port 80               ││
                    └─────────────────────────┘│
                                              │
                              ┌────────┐  ┌───▼──────┐
                              │ Redis  │  │ Postgres │
                              └────────┘  └──────────┘
```

## 目录结构

```
forest-api/
├── docker-compose.yml      # 服务编排
├── Dockerfile.web          # 前端 overlay 构建
├── sync.sh                 # 拉取/更新上游源码
├── nginx/
│   └── nginx.conf          # 外层 Nginx（TLS + sub_filter 品牌替换）
├── custom-homepage/        # 静态页面（首页、定价、文档、关于）
│   ├── index.html
│   ├── pricing.html
│   ├── about.html
│   ├── docs.html
│   ├── docs/               # 文档子页面
│   ├── style.css
│   └── override.css        # 暖色主题 CSS（通过 sub_filter 注入）
├── overlay/                # 前端定制层
│   ├── pages/Home/         # 自定义首页组件（整文件替换）
│   │   ├── index.jsx
│   │   └── style.css
│   ├── components/layout/  # 定制的布局组件
│   │   ├── Footer.jsx
│   │   └── headerbar/
│   │       ├── index.jsx
│   │       └── HeaderLogo.jsx
│   ├── index.css.append    # 追加到上游 index.css 末尾的 CSS
│   └── web-nginx.conf      # 前端容器内 Nginx 配置
├── data/                   # 运行时数据（gitignore）
├── logs/                   # 运行时日志（gitignore）
└── upstream/               # 上游源码（sync.sh 拉取，gitignore）
```

## 前置条件

- VPS（推荐 2C4G 以上）
- Docker 和 Docker Compose
- 域名已解析到服务器 IP（文档以 `forestapi.com` 为例）
- Git

## 首次部署

### 1. 克隆仓库

```bash
git clone git@github.com:goelo/new-api.git forest-api
cd forest-api
```

### 2. 拉取上游源码

```bash
./sync.sh
```

这会把 [QuantumNous/new-api](https://github.com/QuantumNous/new-api) 的最新代码 clone 到 `upstream/` 目录。

### 3. 配置域名和证书

#### 3a. 申请 TLS 证书

```bash
# 安装 certbot（如果没有）
apt install -y certbot

# 申请证书（先确保 80 端口没被占用）
certbot certonly --standalone -d forestapi.com
```

证书会存放在 `/etc/letsencrypt/live/forestapi.com/`。

#### 3b. 修改 Nginx 配置

编辑 `nginx/nginx.conf`，确认以下内容跟你的域名一致：

```nginx
server_name forestapi.com;
ssl_certificate /etc/letsencrypt/live/forestapi.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/forestapi.com/privkey.pem;
```

如果需要修改品牌名称，搜索 `Forest API` 和 `New API` 进行替换。

### 4. 修改密码

编辑 `docker-compose.yml`，**务必修改以下默认密码**：

```yaml
# PostgreSQL 密码
POSTGRES_PASSWORD: <your-strong-password>

# 对应的 DSN
SQL_DSN: postgresql://root:<your-strong-password>@postgres:5432/new-api

# Session 密钥
SESSION_SECRET: <your-random-secret>
```

### 5. 安装宿主机 Nginx

外层 Nginx 运行在宿主机上（非容器），负责 TLS 和品牌替换。

```bash
apt install -y nginx

# 复制配置
cp nginx/nginx.conf /etc/nginx/sites-available/forestapi.conf
ln -sf /etc/nginx/sites-available/forestapi.conf /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 复制静态页面
mkdir -p /usr/share/nginx/html/custom
cp -r custom-homepage/* /usr/share/nginx/html/custom/

# 检查配置 & 启动
nginx -t
systemctl restart nginx
```

### 6. 构建 & 启动

```bash
docker compose build
docker compose up -d
```

### 7. 验证

```bash
# 检查容器状态
docker compose ps

# 检查后端健康
curl -s http://localhost:3000/api/status

# 检查前端
curl -s http://localhost:80 | head -5

# 检查外层 Nginx（HTTPS）
curl -s https://forestapi.com/ | head -5
```

首次启动后访问 `https://forestapi.com/` 即可看到自定义首页。

## 日常更新上游

当上游 new-api 发布新版本时：

```bash
cd forest-api

# 1. 拉取最新上游代码
./sync.sh

# 2. 更新后端（拉取最新官方镜像）
docker compose pull new-api

# 3. 重新构建前端（上游源码 + overlay）
docker compose build web

# 4. 重启服务
docker compose up -d
```

**整个过程不会有任何冲突**，因为你的定制文件在 `overlay/` 目录，跟上游代码完全隔离。

### 指定版本更新

```bash
# 拉取指定 tag
./sync.sh v3.8.0

# 后端也指定版本（编辑 docker-compose.yml）
# image: calciumion/new-api:v3.8.0

docker compose build web
docker compose up -d
```

## 更新静态页面

修改 `custom-homepage/` 下的文件后：

```bash
cp -r custom-homepage/* /usr/share/nginx/html/custom/
nginx -s reload
```

## 定制文件维护

### overlay 里有哪些文件？

| 文件 | 作用 | 何时需要同步 |
|------|------|-------------|
| `overlay/pages/Home/index.jsx` | 自定义首页（Bento Grid 布局） | **永远不需要** — 跟上游无关 |
| `overlay/pages/Home/style.css` | 首页样式 | **永远不需要** — 纯新增 |
| `overlay/index.css.append` | 暖色主题 CSS 变量 + Flash 样式 | **永远不需要** — 追加到末尾 |
| `overlay/components/layout/Footer.jsx` | 含 flashFooter 的 Footer | 上游改了 Footer 时 |
| `overlay/components/layout/headerbar/index.jsx` | flash-header class | 上游改了 headerbar 时 |
| `overlay/components/layout/headerbar/HeaderLogo.jsx` | 闪电 SVG logo | 上游改了 HeaderLogo 时 |
| `overlay/web-nginx.conf` | 前端容器 Nginx 配置 | **极少需要改** |

### 如何检查上游是否改了需要同步的文件？

```bash
cd upstream
git log --oneline --since="2 weeks ago" -- \
  web/src/components/layout/Footer.jsx \
  web/src/components/layout/headerbar/index.jsx \
  web/src/components/layout/headerbar/HeaderLogo.jsx
```

如果有输出，说明上游改了这些文件，需要手动对比并更新 overlay 里对应的文件：

```bash
# 查看上游改了什么
diff overlay/components/layout/Footer.jsx upstream/web/src/components/layout/Footer.jsx

# 合并改动后更新 overlay
cp upstream/web/src/components/layout/Footer.jsx overlay/components/layout/Footer.jsx
# 然后手动加回 flashFooter 相关代码
```

## 构建原理

`Dockerfile.web` 的构建流程：

```
upstream/web/ 源码
       │
       ▼
  bun install（使用上游的 package.json）
       │
       ▼
  overlay 覆盖：
    - pages/Home/ → 整目录替换
    - Footer.jsx, HeaderLogo.jsx, headerbar/index.jsx → 整文件替换
    - index.css.append → cat >> 追加到 index.css 末尾
       │
       ▼
  bun run build → dist/
       │
       ▼
  nginx:alpine 容器（web-nginx.conf）
```

## 故障排查

### 前端构建失败

```bash
# 查看构建日志
docker compose build web --no-cache 2>&1 | tail -50

# 常见原因：上游改了依赖但 overlay 文件用了旧 API
# 解决：更新 overlay 文件
```

### 后端无法连接数据库

```bash
docker compose logs new-api | grep -i error
docker compose logs postgres

# 确认密码一致
grep SQL_DSN docker-compose.yml
grep POSTGRES_PASSWORD docker-compose.yml
```

### Nginx 502 Bad Gateway

```bash
# 检查后端是否在运行
docker compose ps new-api

# 检查容器网络
docker compose exec web ping new-api
```

### 证书续签

```bash
certbot renew
nginx -s reload
```

建议配置 cron 自动续签：

```bash
echo "0 3 * * * certbot renew --quiet && nginx -s reload" | crontab -
```
