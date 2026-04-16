#!/usr/bin/env bash
# 更新并重新部署 Forest API
#
# Usage:
#   ./run.sh              # 更新上游前端源码 + 官方后端镜像，重新构建前端，重启所有服务
#   ./run.sh v3.8.0       # 指定上游版本

set -euo pipefail

REF="${1:-main}"

echo "==> [1/4] 同步上游前端源码 (ref: $REF)..."
./sync.sh "$REF"

echo "==> [2/4] 拉取最新官方后端镜像..."
docker compose pull new-api

echo "==> [3/4] 重新构建前端..."
docker compose build web

echo "==> [4/4] 重启服务..."
docker compose up -d

echo ""
echo "部署完成。验证："
echo "  curl -s https://forestapi.com/api/status | grep success"
