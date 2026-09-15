<p align="center">
  <img src="assets/brand/icon-rounded.png" alt="R2Shot" width="128" height="128" />
</p>

<h1 align="center">R2Shot</h1>

<p align="center">截取网页、上传到自己的 R2 存储，并复制分享链接。</p>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/r2shot/chhcpjnlcbomogddjockcpjjpiijogha">Chrome 应用商店</a> ·
  <a href="docs/README.en.md">English</a>
</p>

## 这是什么

R2Shot 是一个 Chrome 扩展，把网页截图和图片上传放在同一个弹窗里。配置自己的 Cloudflare R2 bucket 与公开域名后，截图会直接上传到该 bucket；上传成功后可点击 Copy URL 复制链接，用于笔记、文档或消息分享。

扩展需要你提供 R2 存储和访问凭据。2.0.0 使用 hexly.ai 家族的新界面，以青绿色为主色，弹窗与设置完整支持 10 种语言，以及浅色、深色和系统主题。需要 Chrome 123 或更高版本。

## 功能

- 截取当前标签页的可见区域，或开启 Full Page 纵向滚动并拼接截图。
- 以 JPEG 上传，压缩质量可设为 1–100；整页截图默认最多 5 个视口高度，可调整为 1–100。
- 按 UTC 日期目录和随机 UUID 保存图片，例如 `2026-09-08/<uuid>.jpg`。
- 根据公开域名生成 HTTPS 图片链接，提供复制按钮和上传错误反馈。
- 粘贴完整 R2 S3 API 地址时自动提取 endpoint 和 bucket 名称；可以测试 bucket 连接。
- 将配置保存在本机浏览器，支持浅色、深色和跟随系统主题。

为控制内存占用，整页输出最多 3200 万像素，单边不超过 32,767 像素。截图过程中需要保持原标签页处于活动状态。整页模式按当前视口宽度拼接已加载内容，并在完成后尝试恢复原来的滚动位置。浏览器内部页面不支持该模式；动态页面和无限滚动页面的结果受已加载内容及截图高度上限影响。

## 使用

### 安装

从 [Chrome 应用商店](https://chromewebstore.google.com/detail/r2shot/chhcpjnlcbomogddjockcpjjpiijogha)安装并固定扩展图标。也可以按下方开发步骤构建，再在 `chrome://extensions/` 开启 Developer mode，使用 Load unpacked 加载 `dist/`。

### 配置与截图

打开扩展的 Settings，填写：

| 配置项 | 内容 |
| --- | --- |
| Endpoint URL | R2 S3 API 地址，例如 `https://<account-id>.r2.cloudflarestorage.com` |
| Access Key ID / Secret Access Key | 有权读写目标 bucket 的 R2 凭据 |
| Bucket Name | 上传目标 bucket |
| Custom Domain | 已配置公开访问的域名，例如 `cdn.example.com`，可带或不带 `https://` |
| JPG Quality | JPEG 质量，默认 90 |
| Max Screens (Full Page) | 整页模式的最大视口高度数量，默认 5 |

点击 Test Connection 检查 bucket 访问，再点击 Save。连接测试使用 `HeadBucket`；公开域名是否正确指向图片，还需要通过实际上传后的链接确认。

回到普通网页，打开弹窗，选择是否开启 Full Page，然后点击 Capture。成功后点击 Copy URL。R2 凭据以明文保存在扩展的 `chrome.storage.local` 中；适合使用仅允许目标 bucket 的凭据，详细说明见[隐私政策](PRIVACY.md)。

## 开发

需要 Bun、Node.js 22.22.2+（22.x）、24.15+（24.x）或 26+，以及 Chrome。从仓库根目录执行：

```bash
git clone https://github.com/nocoo/r2shot.git
cd r2shot
bun install --frozen-lockfile
bun run build
```

构建产物位于 `dist/`，在 Chrome 中作为 unpacked extension 加载。开发时运行：

```bash
bun run dev
```

该命令监听文件并重新构建扩展，使用红色开发图标。修改后在 `chrome://extensions/` 重新加载扩展；它不启动普通网页开发服务器。

```bash
bun run typecheck
bun run lint
bun run build:zip
```

`build:zip` 需要 Bash 和 `zip`，会生成 `dist/r2shot-<version>.zip`。截图、存储和剪贴板功能需要在真实的扩展环境中使用。

```text
src/popup/         截图弹窗与复制操作
src/settings/      R2 配置与主题
src/background/    扩展消息处理
src/core/          截图、滚动拼接、S3 上传和本地配置
public/            Manifest V3、图标与本地化资源
tests/             工作流集成测试与真实 Chrome 扩展测试
```

## 测试

从仓库根目录执行：

| 测试层 | 命令 |
| --- | --- |
| 单元与 DOM 测试 | `bun run test` |
| 工作流集成测试 | `bun run test:integration` |
| 真实 Chrome 扩展测试（先构建） | `bun run test:e2e` |
| 单元测试监听模式 | `bun run test:watch` |
| 完整本地质量验证 | `bun run verify` |

测试框架与 Hooky 对齐：Vitest 默认使用 Node 环境，DOM 用例按需使用 jsdom；`bun run test:coverage` 生成报告，四项覆盖率门槛均为 95%。AWS SDK 只作为开发依赖，用于独立对照 Signature V4 签名结果。

Puppeteer 在独立 Chrome 中安装 `dist/` 的临时副本，测试真实弹窗、消息、存储、截图与滚动拼接。R2 HTTP 响应和剪贴板是隔离的模拟边界，不需要真实凭据。首次运行前用 `bunx puppeteer browsers install chrome` 安装匹配的浏览器，也可设置 `PUPPETEER_EXECUTABLE_PATH` 使用已有 Chrome。

`bun run verify` 验证冻结安装，再执行静态检查、生产构建、覆盖率测试、工作流集成测试和真实 Chrome 扩展测试。CI 分别运行工作流集成与 Chrome 浏览器检查；提交钩子执行覆盖率门槛。浏览器证据保存在 `dist/verification/`。测试命令、可选路径与人工验收步骤见 [TESTING.md](TESTING.md)。

## 技术栈

安装包只运行原生 JavaScript、HTML、CSS、Fetch 和 Web Crypto。核心 TypeScript 在开发时编译，不包含框架或 AWS SDK 运行时代码。

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Cloudflare R2](https://img.shields.io/badge/Cloudflare_R2-F38020?logo=cloudflare&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Chrome-Manifest_V3-4285F4?logo=googlechrome&logoColor=white)

| 部分 | 实现 |
| --- | --- |
| 扩展 | Chrome Manifest V3、后台 Service Worker、Chrome Tabs / Scripting / Storage API |
| 界面 | 原生 DOM、CSS 变量、系统字体、内联 SVG |
| 图片与上传 | OffscreenCanvas、Fetch、Web Crypto SHA-256 / HMAC、Cloudflare R2 |
| 构建与测试 | Vite、TypeScript、Biome、Vitest、jsdom、Puppeteer |

## 文档

- [隐私政策与本地凭据存储](PRIVACY.md)
- [变更记录](CHANGELOG.md)
- [扩展清单](public/manifest.json)

[hexly.ai](https://hexly.ai) 出品。

## 许可证

[MIT](LICENSE) © 2026 Zheng Li

## 设计稿与发布资料

[概念稿与已通过的家族设计](docs/design/README.md) · [R2Shot 2.0.0 资料总览](materials/2.0.0/index.html) · [人工测试说明](materials/2.0.0/TESTING.md)

后续资料从本仓库独立生成：`bun run materials`。原始图像、提示词、英文文案、单页与测试包均按版本归档，目录与使用方法见 [materials/README.md](materials/README.md)。
