# R2Shot 与 Hooky 依赖检查 — 2026-09-16

检查范围为两个项目当前工作区的直接依赖、overrides、锁文件和已知漏洞。版本元数据来自官方 npm registry，快照时间为 2026-09-16 07:54（Asia/Shanghai）；使用 `bun outdated`、`bun audit --json` 和 OSV 交叉检查。兼容分支的最新版本单独核对，不只依赖 npm 的 `latest` 标签。

R2Shot 起点为 `main` / `89cd721` / 2.0.0，本次实施升级并准备 2.0.1。Hooky 参考的是当前 `feat/capture-feedback` / `3d1719d` / 2.1.0，领先 `origin/main` 13 个提交；检查前后工作区均干净，未安装、更新、切分支或修改文件。

## R2Shot：已实施

| 依赖 | 原锁定版本 | 采用版本 | 用途 |
| --- | --- | --- | --- |
| `@aws-sdk/client-s3` | 3.1131.0 | 3.1133.0 | 开发期 Signature V4 对照，不进入扩展包 |
| `@types/chrome` | 0.2.9 | 0.3.0 | Chrome API 类型；已通过 TypeScript 检查 |
| `@types/node` | 26.5.0 | 26.6.1 | 保持 Node 26 类型分支 |
| `@vitest/coverage-v8` | 5.0.0 | 5.0.1 | 与 Vitest 同步升级 |
| `vitest` | 5.0.0 | 5.0.1 | 单元、DOM、集成测试 |
| `puppeteer` | 25.10.0 | 25.11.0 | 与 Hooky 使用同一浏览器测试工具版本 |
| `nanoid` override | 3.3.18 | 3.3.19 | 保持 PostCSS 所需的 3.x 分支 |

`@types/node` 的 npm `latest` 标签当时指向 22.20.3，`bun outdated` 因而没有报告 26.x 的更新。26.6.1 已于 2026-09-15 发布，本次按当前主版本升级。`nanoid` 的最新主版本为 6.0.1，未跨越 PostCSS 的依赖范围强行替换。

测试框架迁移采用 Hooky 同款 `jsdom@30.0.1`，移除 `happy-dom@20.14.5`。`@testing-library/dom@10.4.1` 虽有 10.4.2 更新，但与 `@testing-library/jest-dom@7.0.1` 均未被当前测试导入，直接移除。`esbuild`、`brace-expansion` 已不在 R2Shot 的锁定依赖图中，因此删除对应的失效 overrides。

`bun update --ignore-scripts` 同时刷新现有范围内的传递依赖，包括 Smithy、Vitest 的内部包、Babel parser/types、source-map 工具和 Puppeteer 的协议包；合并旧 Smithy 副本及 `picomatch@4.0.5` 副本，统一使用现有的 `picomatch@4.0.7`。直接开发依赖均固定为精确版本。

`@biomejs/biome@2.5.13`、`typescript@7.0.2`、`vite@8.3.0`、`jsdom@30.0.1` 和 `ws@8.21.3` 已是对应稳定分支的当前版本。保留 `vite` 与 `ws` 的安全版本下限。

jsdom 30 的 Node 要求为 `^22.22.2 || ^24.15.0 || >=26.0.0`；已在 R2Shot 的 `engines` 和测试文档中明确。扩展的 Chrome 123 最低版本及用户运行行为未改变。

升级后验证：冻结安装、lint、类型检查、生产构建、154 个单元/DOM 测试、8 个集成测试和 7 组真实 Chrome 场景全部通过。覆盖率为 statements 99.75%、branches 99.10%、functions 100%、lines 99.74%，门槛仍为 95%。Puppeteer 匹配的 Chrome 为 153.0.8010.36。`bun outdated` 无待升级直接依赖；`bun audit` 无已知漏洞；OSV 检查 200 个锁定包，无问题。

## Hooky：只读结果

优先更新 `vitest → vite@7.3.5 → rollup@4.57.1` 中的 Rollup。`bun audit` 检出高危路径穿越/任意文件写入问题 [GHSA-mw96-cpmx-2vgc](https://github.com/advisories/GHSA-mw96-cpmx-2vgc)，受影响范围为 `>=4.0.0 <4.59.0`。4.63.3 是当前 4.x 稳定版，符合 Vite 现有的 `^4.43.0` 依赖范围。

该问题位于开发测试工具链。Hooky 的 `osv-scanner.toml` 已以“dev-only bundler, no user input in build”为由忽略它，所以现有 OSV 命令返回通过并不能证明锁文件没有这项漏洞。升级后应复核并移除相应例外；扫描还报告了 17 条未使用的忽略项。本次没有更改任何例外。

| 依赖 | 当前锁定版本 | 建议版本 | 说明 |
| --- | --- | --- | --- |
| `rollup` | 4.57.1 | 4.63.3，至少 4.59.0 | 修复上述高危问题，刷新锁文件及匹配的平台包 |
| `vitest` | 5.0.0 | 5.0.1 | 直接开发依赖 |
| `@vitest/coverage-v8` | 5.0.0 | 5.0.1 | 与 Vitest 同步 |
| `vite` | 7.3.5 | 7.3.6 | 保持现有 7.x；无需为本次修复迁移至 8.3.0 |
| `esbuild` | 0.28.1 | 0.28.2 | 当前 override 范围内的补丁 |
| `nanoid` | 3.3.18 | 3.3.19 | 保持 3.x |
| `brace-expansion` | 5.0.9 | 5.0.12 | override 范围内更新 |
| `picomatch` | 4.0.4 | 4.0.7 | 同时满足 Vitest 5 的 `^4.0.7` 要求 |
| `postcss` | 8.5.23 | 8.5.28 | override 范围内更新 |
| `undici` | 8.10.0 | 8.10.2 | jsdom 的传递依赖 |
| `tinyglobby` | 0.2.15、0.2.17 | 0.2.17 | 合并 Vite 下的旧副本 |

`@humanfs/node@0.16.8` 有 0.17.0 新版，但后者超出 ESLint 当前 `^0.16.6` 的依赖范围，且要求 Node 24+；建议等待父依赖支持，不直接强制覆盖。`basic-ftp@6.2.1` 只在 Hooky 的 package/override 中声明，源代码没有导入，当前 Puppeteer 下载器也不再依赖它，可作为后续独立清理项移除。

Hooky 的 `@eslint/js@10.0.1`、`eslint@10.10.0`、`globals@17.12.0`、`husky@9.1.7`、`jsdom@30.0.1`、`puppeteer@25.11.0`、`basic-ftp@6.2.1` 和 `ws@8.21.3` 没有对应稳定分支的更新。Hooky 同样需要满足 jsdom 30 的 Node 版本要求。

上述 Hooky 升级建议尚未实施或运行升级后的测试；后续应在该项目单独更新并完成它自己的覆盖率、lint、构建和 Chrome E2E 验证。

## 复核来源

- [官方 npm registry](https://registry.npmjs.org/) 的包元数据、稳定版本与 engines。
- 两个项目各自的 `package.json`、`bun.lock`、`.npmrc`、`osv-scanner.toml`，以及只读的 `bun outdated`、`bun audit --json`、`bun pm why rollup` 和 OSV 扫描结果。
- [Rollup 漏洞公告](https://github.com/advisories/GHSA-mw96-cpmx-2vgc)。
- R2Shot 的完整验证入口和人工验收边界见 [TESTING.md](../TESTING.md)。
