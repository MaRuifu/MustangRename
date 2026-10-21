#!/usr/bin/env bash
# 在【联网机器】上抓取 Rust 离线安装包到 tools/rust-offline/
# 用法:
#   bash scripts/fetch-rust-offline.sh [版本号] [--with-vendor] [--with-windows]
#     版本号默认 1.99.1（需 >= 1.90）
#     --with-vendor   额外导出全部 crate 源码到 tools/rust-offline/vendor（离线编译项目必需）
#     --with-windows  额外下载 Windows x64 MSI 安装包
# 镜像: 默认 rsproxy.cn，可用 RUST_MIRROR=https://static.rust-lang.org 覆盖
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION="${1:-1.99.1}"
if [ "${1:-}" = "$VERSION" ]; then shift || true; fi
WITH_VENDOR=0
WITH_WINDOWS=0
for a in "$@"; do
  case "$a" in
    --with-vendor) WITH_VENDOR=1 ;;
    --with-windows) WITH_WINDOWS=1 ;;
    *) echo "未知参数: $a" >&2; exit 1 ;;
  esac
done

MIRROR="${RUST_MIRROR:-https://rsproxy.cn}"
FALLBACK="https://static.rust-lang.org"
DIR="tools/rust-offline"
mkdir -p "$DIR"

fetch() {
  local f="$1"
  if [ -f "$DIR/$f" ]; then
    echo "跳过 $f（已存在）"
    return
  fi
  echo "下载 $f ..."
  curl -fL --retry 3 -o "$DIR/$f" "$MIRROR/dist/$f" \
    || curl -fL --retry 3 -o "$DIR/$f" "$FALLBACK/dist/$f"
}

fetch "rust-${VERSION}-aarch64-apple-darwin.tar.gz"
fetch "rust-${VERSION}-x86_64-apple-darwin.tar.gz"
if [ "$WITH_WINDOWS" = 1 ]; then
  fetch "rust-${VERSION}-x86_64-pc-windows-msvc.msi"
fi

if [ "$WITH_VENDOR" = 1 ]; then
  echo "导出 crate 依赖源码（vendor）..."
  cargo vendor "$DIR/vendor" > "$DIR/vendor-config.toml"
  echo "vendor 完成: $(du -sh "$DIR/vendor" | cut -f1)"
fi

echo "$VERSION" > "$DIR/VERSION"
echo "--- tools/rust-offline 内容:"
ls -lh "$DIR"
