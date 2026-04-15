#!/usr/bin/env bash
# Sync upstream new-api source code for frontend overlay build.
#
# Usage:
#   ./sync.sh              # clone or pull latest
#   ./sync.sh v3.8.0       # checkout specific tag/commit

set -euo pipefail

UPSTREAM_REPO="https://github.com/QuantumNous/new-api.git"
UPSTREAM_DIR="upstream"
REF="${1:-main}"

if [ -d "$UPSTREAM_DIR/.git" ]; then
    echo "==> Updating upstream (ref: $REF)..."
    cd "$UPSTREAM_DIR"
    git fetch origin
    git checkout "$REF"
    git pull origin "$REF" 2>/dev/null || true
    cd ..
else
    echo "==> Cloning upstream (ref: $REF)..."
    git clone --depth 1 --branch "$REF" "$UPSTREAM_REPO" "$UPSTREAM_DIR"
fi

echo "==> Upstream synced: $(cd $UPSTREAM_DIR && git log --oneline -1)"
echo ""
echo "Next steps:"
echo "  docker compose build web"
echo "  docker compose up -d"
