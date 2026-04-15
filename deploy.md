# Forest API 部署指南

## 架构概览

```
用户浏览器
    │
    ▼
nginx-proxy (容器, 80/443)
    │
    ├── location = /            → 自定义静态首页 (index.html)
    ├── location = /pricing     → 自定义静态定价页 (pricing.html)
    ├── location = /style.css   → 自定义页面的 CSS
    ├── location /v1/           → API relay (直通, 不做 sub_filter)
    ├── location /assets/       → React 静态资源 (直通, 不做 sub_filter)
    └── location /              → new-api 管理面板 (代理 + sub_filter 品牌替换)
            │
            ▼
      new-api (容器, 3000) ── Go 后端 + React 前端 SPA
            │
            ├── redis (容器)
            └── postgres (容器)
```

## 服务组成 (docker-compose.yml)

| 服务 | 镜像 | 容器名 | 端口 | 说明 |
|------|------|--------|------|------|
| new-api | calciumion/new-api:latest | new-api | 3000 | Go 后端 + React 前端 |
| nginx | nginx:alpine | nginx-proxy | 80, 443 | 反向代理 + 自定义页面 + 品牌替换 |
| redis | redis:latest | redis | - | 缓存 |
| postgres | postgres:15 | postgres | - | 数据库 |

## 关键 Volume 挂载

```yaml
nginx:
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro   # nginx 配置
    - ./custom-homepage:/usr/share/nginx/html/custom:ro       # 自定义静态页面
    - /etc/letsencrypt:/etc/letsencrypt:ro                    # TLS 证书
```

**全部是 `:ro` 只读挂载**，宿主机文件改了容器能直接读到（HTML/CSS 立即生效），但不能 `docker cp` 往容器里写。

## 自定义静态页面

目录 `custom-homepage/` 中的文件：

| 文件 | 用途 | nginx 路由 |
|------|------|-----------|
| index.html | 自定义首页（含导航栏、公告弹窗） | `location = /` |
| pricing.html | 自定义定价页（按量充值 + 周期订阅） | `location = /pricing` |
| about.html | 关于我们页面 | `location = /about` |
| docs.html | 使用教程首页 | `location = /docs` |
| docs/nodejs.html | Node.js 安装教程 | `location ~ ^/docs/(.+)$` |
| docs/claude-code.html | Claude Code 配置教程 | 同上 |
| docs/gemini-cli.html | Gemini CLI 配置教程 | 同上 |
| docs/codex.html | Codex (OpenAI) 配置教程 | 同上 |
| docs/openclaw.html | OpenClaw 部署教程 | 同上 |
| docs/opencode.html | OpenCode 配置教程 | 同上 |
| docs/cherry-studio.html | Cherry Studio 配置教程 | 同上 |
| style.css | 所有自定义页面共用样式表 | `location = /style.css` |
| override.css | 暖色主题覆盖（注入到 React 管理面板） | `location = /custom-theme.css` |

### 新增自定义页面的步骤

1. 在 `custom-homepage/` 下创建 `xxx.html`，引用 `style.css?v=版本号`
2. 在 `nginx/nginx.conf` 中添加：
   ```nginx
   location = /xxx {
       root /usr/share/nginx/html/custom;
       try_files /xxx.html =404;
   }
   ```
3. **重启 nginx 容器**（不是 reload，见下方说明）

## nginx sub_filter 品牌替换机制

在 `location /`（代理到 new-api 的通用 location）中，通过 `sub_filter` 实现品牌替换，**无需改源码**：

```nginx
sub_filter '</head>' '<link rel="stylesheet" href="/custom-theme.css"></head>';  # 注入暖色主题 CSS
sub_filter '</body>' '<script>/* MutationObserver 动态替换链接 */</script></body>';  # 替换 /token→/console、docs.newapi.pro→/docs、修复首页跳转
sub_filter '<title>New API</title>' '<title>Forest API</title>';                 # 替换页面标题
sub_filter '"New API"' '"Forest API"';                                           # 替换品牌名
sub_filter_once off;
sub_filter_types text/html;  # 只替换 HTML，不要加 application/json！
```

**注意事项：**
- `sub_filter_types` **绝对不能**加 `application/json`，否则会破坏 API 接口的 JSON 响应（如 `/api/notice` 公告接口），导致前端功能异常
- `sub_filter` 要求 upstream 返回未压缩内容，所以设了 `proxy_set_header Accept-Encoding ""`
- `/v1/` 和 `/assets/` 有独立的 location 块，不经过 sub_filter，保证 API 流式响应和静态资源加载正常

## 部署操作

### 日常更新（改 HTML/CSS 内容）

HTML 和 CSS 文件改了直接生效（volume 挂载），但浏览器可能有缓存。建议：
- 给 CSS 引用加版本号：`style.css?v=3`（每次改完递增）
- 或让用户 Ctrl+Shift+R 强刷

```bash
# 通常不需要任何 docker 命令，改文件就行
# 如果想确保 nginx 重新读取，可以 reload：
docker exec nginx-proxy nginx -s reload
```

### 改 nginx.conf（加路由、改配置）

nginx.conf 是 `:ro` 挂载，宿主机改完后**必须重启容器**，`nginx -s reload` 不一定能读到新文件：

```bash
docker restart nginx-proxy
```

验证配置是否生效：
```bash
docker exec nginx-proxy cat /etc/nginx/conf.d/default.conf | grep -n "你加的关键词"
```

### 更新 new-api 后端

```bash
docker compose pull new-api
docker compose up -d new-api
```

### 完整重启所有服务

```bash
cd /root/git/new-api
docker compose down
docker compose up -d
```

### 拉取代码后部署

```bash
git pull
docker restart nginx-proxy   # 如果改了 nginx.conf 或自定义页面
```

## 公告系统

自定义首页（index.html）底部有一段 JS，会调用 `/api/notice` 接口获取公告内容并弹窗显示：

- 公告内容在 new-api 管理后台设置
- 用户点"今日不再显示"后写入 `localStorage`（key: `notice_close_date`），当天不再弹出
- 与 React 管理面板中的公告共享同一个 localStorage key，行为一致

## 踩坑记录

| 问题 | 原因 | 解决 |
|------|------|------|
| 公告不显示 | `sub_filter_types` 包含了 `application/json`，破坏了 `/api/notice` 的 JSON 响应 | 只保留 `text/html` |
| 改了 nginx.conf 不生效 | `nginx -s reload` 不重新挂载 volume | 用 `docker restart nginx-proxy` |
| CSS 不更新 | style.css 设了 24h 浏览器缓存 | HTML 中引用加 `?v=版本号` |
| /pricing 跳到 React 应用 | 没有为自定义页面配置 nginx 精确匹配 location | 添加 `location = /pricing` 指向 pricing.html |
| React 管理面板内点"首页"不回自定义首页 | SPA 路由拦截了 `/`，不触发真正的页面跳转 | sub_filter 注入 JS 脚本拦截 `<a href="/">` 的点击，改用 `window.location.href` |
