# MustangRename（马上改名）

跨平台（macOS / Windows）桌面批量重命名工具：Tauri 2 + Vue 3 + TypeScript，安装包约 10MB 级、秒级启动。规则引擎覆盖常规重命名需求，内置 AI 智能重命名——用一句话描述规则，即可为整批文件生成新名称。

**[中文](./README.md)** | **[English](./README.en.md)**

![MustangRename 主界面（浅色主题）](docs/screenshots/main.png)

![MustangRename 主界面（深色主题）](docs/screenshots/main-dark.png)

## 功能特性

### 文件载入
- 拖拽文件或文件夹入窗，支持同时多个根目录
- 顶栏「选择文件 / 选择文件夹」对话框选择
- 可选项：包含子目录、显示隐藏文件

### 重命名规则（五个页签，可叠加）
规则链按 **查找替换 → 插入内容 → 自动编号** 顺序串联执行；AI 与手动编辑作为覆盖层，优先级：**手动编辑 > AI > 规则链**。

1. **查找替换**：8 种作用区域（整个名称 / 前 N 位 / 后 N 位 / 从第 X 位开始的 N 位 / 某字符之前·之后的内容或 N 位）；支持正则、区分大小写；多条规则叠加
2. **智能重命名（AI）**：一句话描述规则（如「中文转英文」「设备+拍摄时间」「视频时长+码率」），AI 为当前列表逐文件生成新名称；支持多轮对话修正（「第 3 个太长了」「序号改三位」）；结果先进预览，确认后才执行
3. **插入内容**：三类内容源 × 五种插入位置（开头 / 结尾 / 第 X 位前 / 某字符之后 / 某字符之前）
   - 固定文本
   - 序号：阿拉伯（可补零）/ 中文小写（一、十一）/ 中文大写（壹、拾壹）/ 英文大写（A、AA）/ 英文小写；可设起始值
   - 文件信息：创建时间 / 修改时间（`YYYYMMDD`、`YYYY-MM-DD`、`YYYYMMDD_HHMMSS`、`YYYY-MM-DD_HH-MM-SS`）/ 文件大小（自动单位或纯字节）
4. **自动编号**：起始 / 步长 / 补零位数 / 前后缀 / 位置（编号顺序 = 当前列表排序顺序）
5. **手动编辑**：逐文件指定完整新文件名；拖拽行首调整顺序（自动切换为自定义排序，影响序号与编号）；粘贴多行文本（如 Excel 复制的列）自当前行向下批量填充

### 预览与安全
- 原名 → 新名实时对照预览
- 重名冲突、非法字符、空名称实时标红并阻断执行
- 单文件排除 / 恢复
- 执行后一键撤销回滚（支持多步栈）
- 「替换文件扩展名」开关：关闭时规则只作用于主名，扩展名原样保留

### 排序与筛选
- 9 种排序：名称 / 大小 / 修改时间 / 创建时间 × 升/降序 + 自定义顺序（拖拽）
- 筛选：关键字 / 扩展名列表（如 `vue, ts`）/ 正则

### AI 配置
- 三种协议：`openai-completions`（POST /chat/completions）、`openai-responses`（POST /responses）、`anthropic-messages`（POST /messages）
- 配置名称、Base URL、API Key；可拉取模型列表下拉选择，也可手动填写；一键测试链路
- 配置仅存本机 localStorage；桌面端请求经 Rust 本地代理、开发期经 dev 服务器代理，均不受浏览器 CORS 限制

### 其它
- 浅色 / 深色主题自动跟随系统
- 浏览器预览模式：不装 Rust 也能看界面与规则效果（不能执行重命名）

## 快速开始

### 环境要求

| 环境 | 要求 |
| --- | --- |
| Node.js | ≥ 18 |
| Rust | stable ≥ 1.90（tauri 2.12 的 MSRV；推荐 rustup 安装或 Homebrew 升级） |
| macOS | Xcode Command Line Tools：`xcode-select --install` |
| Windows | VS 2022 C++ Build Tools；WebView2（Win10/11 已预装） |

### 从零开始完整流程

```bash
# 1. 克隆仓库
git clone https://github.com/<你的用户名>/MustangRename.git
cd MustangRename

# 2. 安装 Node.js（≥ 18）：nodejs.org 下载安装，或
brew install node              # macOS
# Windows: winget install OpenJS.NodeJS.LTS

# 3. 安装 Rust（≥ 1.90）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"

# 4. 安装前端依赖
npm install

# 5. 启动开发 / 打包
npm run tauri dev              # 桌面开发模式
npm run tauri build            # 打包，产物见 src-tauri/target/release/bundle/
```

平台附加依赖：

- macOS：`xcode-select --install`（Xcode Command Line Tools）
- Windows：安装 VS 2022 C++ Build Tools（勾选「使用 C++ 的桌面开发」工作负载）；WebView2 在 Win10/11 已预装

### 离线 / 受限网络环境

完全离线 / 内网部署（离线 Rust 安装包 + 依赖 vendor 打包与安装），以及官方源访问超时时的镜像方案，见 [docs/offline-setup.md](docs/offline-setup.md)。

### 启动开发

```bash
npm install
npm run tauri dev      # 桌面窗口（首次编译 Rust 依赖约几分钟）
```

浏览器预览模式（无需 Rust，仅预览界面与规则效果）：

```bash
npm run dev            # 访问 http://localhost:1420
```

### 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run tauri dev` | 桌面开发模式（热更新） |
| `npm run tauri build` | 打包安装程序 |
| `npm run dev` | 仅前端，浏览器预览模式 |
| `npm run typecheck` | vue-tsc 类型检查 |
| `npm run icons` | 重新生成应用图标（纯 Node，无依赖） |

## 打包与分发

```bash
npm run tauri build
```

产物位置：

- macOS：`src-tauri/target/release/bundle/dmg/*.dmg`、`src-tauri/target/release/bundle/macos/*.app`
- Windows：`src-tauri/target/release/bundle/nsis/*.exe`、`src-tauri/target/release/bundle/msi/*.msi`

签名说明：

- **Windows**：未签名安装包会触发 SmartScreen 提示，用户选「更多信息 → 仍要运行」即可；正式分发建议代码签名
- **macOS**：未签名/未公证时 Gatekeeper 会拦截：右键 → 打开，或 系统设置 → 隐私与安全性 → 仍要打开；正式分发需 Apple Developer 账号签名 + 公证

macOS 双架构（Apple Silicon + Intel）：

默认打包只含当前机器架构。要出双芯片通用的 universal 包：

```bash
rustup target add x86_64-apple-darwin        # 一次性
npm run tauri build -- --target universal-apple-darwin
# 验证：lipo -archs src-tauri/target/universal-apple-darwin/release/bundle/macos/MustangRename.app/Contents/MacOS/MustangRename
```

## 项目结构

```
src/
  rules/engine.ts        规则引擎（区域截取、替换、序号/时间/大小文本、插入、编号、校验）
  composables/fs.ts      文件系统适配层（Tauri 命令 / 浏览器 DataTransfer 遍历）
  composables/ai.ts      AI 三协议请求构造与响应解析、模型列表、名称 JSON 宽松解析
  stores/rules.ts        规则链与手动编辑状态
  stores/ai.ts           AI 配置（localStorage 持久化）、对话、AI 名称层
  stores/files.ts        扫描、排序（含自定义）、筛选、预览、冲突检测、执行、撤销
  components/            顶栏 / 规则页签(5) / 文件列表 / 底栏 / 拖拽遮罩 / AI 设置弹窗
src-tauri/
  src/lib.rs             scan_paths、rename_files、http_json（AI 请求代理，绕 CORS）
scripts/gen-icons.mjs    PNG/ICO/ICNS 图标生成器
```

## 开发指南

### 新增一种重命名规则
1. `src/types.ts`：定义规则接口并加入 `Rule` 联合类型
2. `src/rules/engine.ts`：在 `applyRule` 中增加对应分支（保持纯函数）
3. `src/stores/rules.ts`：增加 `defaultXxx()` 工厂并纳入 `orderedRules()`
4. `src/components/panels/`：新建面板组件，并在 `RulePanel.vue` 注册页签
5. `npm run typecheck` 通过后提 PR

### 代码检查
提交前请运行 `npm run typecheck`；Rust 侧改动由 `cargo` 在 dev/build 时检查。

## 常见问题

- **macOS 提示应用无法打开 / 已损坏**：未签名所致，右键 → 打开；或终端 `xattr -cr /Applications/MustangRename.app`
- **Windows 安装时 SmartScreen 拦截**：未签名提示，「更多信息 → 仍要运行」
- **浏览器预览模式不能执行重命名**：设计如此，浏览器拿不到绝对路径；执行与撤销请使用桌面版
- **AI 拉取模型列表失败**：核对 Base URL（填到版本前缀，如 `https://api.openai.com/v1`）、协议与 Key；开发期修改过 `vite.config.ts` 需重启 dev 服务器
- **首次编译很慢**：Tauri + reqwest 依赖树约数百 crate，仅首次慢，后续增量编译很快
- **构建报 `rustc 1.87 is not supported … tauri@2.12 requires rustc 1.90`**：Rust 工具链过旧。`brew update && brew upgrade rust`，或 rustup 用户执行 `rustup update stable`；`rustc --version` 确认 ≥ 1.90 后重新构建。不建议用 `cargo update --precise` 降级依赖——tauri 本体即要求 1.90，整链锁旧版本非常脆弱
- **rustup 报 `could not amend shell profile` / 权限拒绝**：个别 rc 文件（如 `.tcshrc`）属主异常所致；安装命令追加 `--no-modify-path`，随后手动把 `. "$HOME/.cargo/env"` 加到你的 shell rc（如 `~/.zshrc`）

## 参与贡献

欢迎提交 Issue 与 Pull Request：小修直接 PR；新功能 / 大改动建议先开 Issue 讨论。提交前确保 `npm run typecheck` 通过。

## 路线图

- 规则预设保存 / 导入导出（JSON）
- EXIF 拍摄时间、音频 ID3 标签作为命名来源
- 重命名日志导出、干跑（dry-run）报告
- 文件夹本身参与重命名

## 作者

马瑞富 · [maruifu.com](https://maruifu.com) · [email@maruifu.cn](mailto:email@maruifu.cn)

## 许可证

[MIT](./LICENSE) © 马瑞富 (maruifu.com)
