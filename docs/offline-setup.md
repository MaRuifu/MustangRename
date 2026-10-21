# 离线与受限网络安装指南 / Offline & Restricted-Network Setup

中文 | English（见下半部分）

## 场景一：完全离线 / 内网环境

Rust 工具链与项目依赖都可以离线安装，分三步：

### 1. 联网机器：制作离线包

```bash
# 仓库根目录执行；版本号默认 1.99.1，需 >= 1.90
bash scripts/fetch-rust-offline.sh

# 可选参数：
bash scripts/fetch-rust-offline.sh 1.99.1 --with-vendor    # 导出全部 crate 源码（离线编译本项目必需）
bash scripts/fetch-rust-offline.sh 1.99.1 --with-windows   # 附带 Windows x64 MSI
```

产物在 `tools/rust-offline/`：macOS ARM/Intel 两个工具链 tarball、VERSION 文件，可选 `vendor/`（crate 源码）与 Windows MSI。

> 注意：`tools/rust-offline/` 在 `.gitignore` 中（单文件超 GitHub 100MB 限制），
> 请随 U 盘 / NAS / 内网共享 / Release 附件等方式与代码一起转移。

### 2. 转移

把**整个仓库目录**（含 `tools/rust-offline/`）拷贝到离线机器。

### 3. 离线机器：安装

```bash
bash scripts/install-rust-offline.sh
source ~/.zshrc        # 或新开终端
rustc --version        # 应 >= 1.90
```

- 安装到 `~/.rust-offline`，不需要 sudo
- 若离线包带 `vendor/`，脚本会自动写 `<repo>/.cargo/config.toml` 指向离线依赖源，之后 `npm install && npm run tauri build` 全程无需联网
- 恢复联网后想正常更新依赖：删除 `<repo>/.cargo/config.toml` 即可
- Windows 离线机器：双击 `tools/rust-offline/rust-<版本>-x86_64-pc-windows-msvc.msi`

## 场景二：能上网但访问 crates.io / rustup 官方源超时（如中国大陆网络）

### rustup 走国内镜像

```bash
export RUSTUP_DIST_SERVER=https://rsproxy.cn
export RUSTUP_UPDATE_ROOT=https://rsproxy.cn/rustup
curl --proto '=https' --tlsv1.2 -sSf https://rsproxy.cn/rustup-init.sh | sh -s -- -y
source "$HOME/.cargo/env"
```

### cargo 走国内镜像

新建 `~/.cargo/config.toml`（全局）或 `<repo>/.cargo/config.toml`（仅本项目，优先级更高）：

```toml
[source.crates-io]
replace-with = "rsproxy-sparse"

[source.rsproxy-sparse]
registry = "sparse+https://rsproxy.cn/index/"

[registries.rsproxy]
index = "https://rsproxy.cn/crates.io-index"

[net]
git-fetch-with-cli = true
```

其它可选镜像：中科大 `https://mirrors.ustc.edu.cn/crates.io-index/`、清华 Tuna `https://mirrors.tuna.tsinghua.edu.cn/git/crates.io-index.git`；或有代理时为 cargo 配置 `[http] proxy = "http://127.0.0.1:7890"`。

---

# English

## Scenario 1: Fully offline / air-gapped environments

### 1. On an online machine: prepare the offline bundle

```bash
bash scripts/fetch-rust-offline.sh                 # default version 1.99.1 (needs >= 1.90)
bash scripts/fetch-rust-offline.sh 1.99.1 --with-vendor    # include all crate sources (required to build offline)
bash scripts/fetch-rust-offline.sh 1.99.1 --with-windows   # include Windows x64 MSI
```

Artifacts land in `tools/rust-offline/`. Note this directory is gitignored (single files exceed GitHub's 100MB limit) — transfer it together with the repo via USB / NAS / release assets.

### 2. Transfer the whole repository (including `tools/rust-offline/`) to the offline machine

### 3. On the offline machine: install

```bash
bash scripts/install-rust-offline.sh
source ~/.zshrc        # or open a new terminal
rustc --version
```

- Installs to `~/.rust-offline`, no sudo required
- If the bundle contains `vendor/`, the script writes `<repo>/.cargo/config.toml` pointing at the offline crate source, so `npm install && npm run tauri build` works with no network
- To return to online dependency updates later: delete `<repo>/.cargo/config.toml`
- Windows: double-click `tools/rust-offline/rust-<version>-x86_64-pc-windows-msvc.msi`

## Scenario 2: Network reaches the internet but crates.io / rustup are slow or blocked

Use a regional mirror (e.g. rsproxy.cn shown above), a corporate proxy (`[http] proxy = "..."` in `~/.cargo/config.toml`), or the offline bundle from Scenario 1.
