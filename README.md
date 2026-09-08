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

扩展需要你提供 R2 存储和访问凭据，没有独立的上传服务或账户系统。当前弹窗和设置界面使用英文，扩展名称与描述包含多语言资源。

## 功能

- 截取当前标签页的可见区域，或开启 Full Page 纵向滚动并拼接截图。
- 以 JPEG 上传，压缩质量可设为 1–100；整页截图默认最多 5 个视口高度，可调整为 1–100。
- 按 UTC 日期目录和随机 UUID 保存图片，例如 `2026-09-08/<uuid>.jpg`。
- 根据公开域名生成 HTTPS 图片链接，提供复制按钮和上传错误反馈。
- 粘贴完整 R2 S3 API 地址时自动提取 endpoint 和 bucket 名称；可以测试 bucket 连接。
- 将配置保存在本机浏览器，支持浅色、深色和跟随系统主题。

整页模式按当前视口宽度拼接已加载内容，并在完成后尝试恢复原来的滚动位置。浏览器内部页面不支持该模式；动态页面和无限滚动页面的结果受已加载内容及截图高度上限影响。

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
| Custom Domain | 已配置公开访问的域名，例如 `cdn.example.com`，不带 `https://` |
| JPG Quality | JPEG 质量，默认 90 |
| Max Screens (Full Page) | 整页模式的最大视口高度数量，默认 5 |

点击 Test Connection 检查 bucket 访问，再点击 Save。连接测试使用 `HeadBucket`；公开域名是否正确指向图片，还需要通过实际上传后的链接确认。

回到普通网页，打开弹窗，选择是否开启 Full Page，然后点击 Capture。成功后点击 Copy URL。R2 凭据以明文保存在扩展的 `chrome.storage.local` 中；适合使用仅允许目标 bucket 的凭据，详细说明见[隐私政策](PRIVACY.md)。

## 开发

需要 Bun、Node.js 22.12+ 和 Chrome。从仓库根目录执行：

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
e2e/               截图到上传的工作流测试
```

## 测试

从仓库根目录执行：

| 测试层 | 命令 |
| --- | --- |
| 单元与组件测试 | `bun run test` |
| 工作流集成测试 | `bun run test:e2e` |
| 单元测试监听模式 | `bun run test:watch` |

测试使用 Vitest 和 happy-dom，模拟 Chrome API 与 S3 网络边界，不需要真实 R2 凭据。实际 Chrome 加载、滚动截图和公开链接访问需要加载 `dist/` 后手动验证。`bun run test:coverage` 可生成覆盖率报告。

## 技术栈

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Cloudflare R2](https://img.shields.io/badge/Cloudflare_R2-F38020?logo=cloudflare&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Chrome-Manifest_V3-4285F4?logo=googlechrome&logoColor=white)

| 部分 | 实现 |
| --- | --- |
| 扩展 | Chrome Manifest V3、后台 Service Worker、Chrome Tabs / Scripting / Storage API |
| 界面 | React、Tailwind CSS、Lucide |
| 图片与上传 | OffscreenCanvas、AWS SDK for JavaScript 的 S3 客户端、Cloudflare R2 |
| 构建与测试 | Vite、TypeScript、Biome、Vitest、Testing Library、happy-dom |

## 文档

- [隐私政策与本地凭据存储](PRIVACY.md)
- [变更记录](CHANGELOG.md)
- [扩展清单](public/manifest.json)

## 许可证

[MIT](LICENSE) © 2026 Zheng Li
