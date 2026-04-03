# 前端独立部署 Dockerfile
FROM oven/bun:1 AS builder

WORKDIR /build
COPY package.json bun.lock ./
RUN bun install
COPY . .
RUN DISABLE_ESLINT_PLUGIN='true' bun run build

FROM nginx:alpine

# 复制构建产物
COPY --from=builder /build/dist /usr/share/nginx/html

# 复制 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
