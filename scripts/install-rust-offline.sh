#!/usr/bin/env bash
# 在【离线机器】上安装 Rust：使用仓库内 tools/rust-offline/ 的离线包，无需联网
# 用法: bash scripts/install-rust-offline.sh
# 安装位置: ~/.rust-offline（不需要 sudo），并把 PATH 写入 ~/.zshrc / ~/.bashrc
# 若离线包内含 vendor 依赖，会自动写 <repo>/.cargo/config.toml 指向离线依赖源
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
DIR="$REPO_ROOT/tools/rust-offline"
[ -d "$DIR" ] || { echo "未找到离线包目录: $DIR（请先在联网机器执行 scripts/fetch-rust-offline.sh）" >&2; exit 1; }

os="$(uname -s)"
mach="$(uname -m)"
case "$os-$mach" in
  Darwin-arm64)        triple="aarch64-apple-darwin" ;;
  Darwin-x86_64)       triple="x86_64-apple-darwin" ;;
  Linux-x86_64)        triple="x86_64-unknown-linux-gnu" ;;
  Linux-aarch64|Linux-arm64) triple="aarch64-unknown-linux-gnu" ;;
  MINGW*|MSYS*|CYGWIN*)
    echo "Windows 请直接双击 tools/rust-offline/ 下的 .msi 安装包" >&2; exit 1 ;;
  *) echo "不支持的平台: $os-$mach" >&2; exit 1 ;;
esac

TAR="$(ls "$DIR"/rust-*-"$triple".tar.gz 2>/dev/null | head -1 || true)"
[ -n "$TAR" ] || { echo "离线包中没有 $triple 的安装包: $DIR" >&2; exit 1; }
echo "使用离线包: $TAR"

PREFIX="$HOME/.rust-offline"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
tar xzf "$TAR" -C "$TMP"

FLAGS=""
[ "$os" = "Linux" ] && FLAGS="--disable-ldconfig"
( cd "$TMP"/rust-* && ./install.sh --prefix="$PREFIX" $FLAGS )

RC_LINE="export PATH=\"$PREFIX/bin:\$PATH\""
for rc in "$HOME/.zshrc" "$HOME/.bashrc"; do
  touch "$rc" 2>/dev/null || continue
  grep -qF "$PREFIX/bin" "$rc" || echo "$RC_LINE" >> "$rc"
done
export PATH="$PREFIX/bin:$PATH"

# 离线依赖源（仅当离线包带 vendor 时）
if [ -d "$DIR/vendor" ]; then
  mkdir -p "$REPO_ROOT/.cargo"
  cat > "$REPO_ROOT/.cargo/config.toml" <<EOF
# 离线依赖源：由 scripts/install-rust-offline.sh 生成
# 恢复联网更新依赖时删除本文件即可
[source.crates-io]
replace-with = "offline-vendor"

[source.offline-vendor]
directory = "$DIR/vendor"
EOF
  echo "已写 $REPO_ROOT/.cargo/config.toml（指向离线依赖源）"
fi

echo "--- 验证:"
rustc --version
cargo --version
echo "离线安装完成。请新开终端，或执行 source ~/.zshrc 生效。"
