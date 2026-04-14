# Contributing Guide

感谢你愿意参与 colony-harness 的建设。

## 开始之前

1. Fork 仓库并创建分支（建议前缀：`feat/`、`fix/`、`docs/`、`chore/`）
2. 安装依赖：`pnpm install`
3. 本地检查：
   - `pnpm build` — 构建所有包
   - `pnpm typecheck` — 类型检查
   - `pnpm test` — 运行测试
   - `pnpm docs:build` — 构建文档站

## 提交流程

1. 保持提交粒度清晰，提交信息简洁说明"做了什么 + 为什么"
2. 提交 PR 时请填写模板，说明变更范围、影响与测试结果
3. 若改动 API，请同步更新 README / docs / CHANGELOG

## 代码规范

- TypeScript strict 模式
- 公共接口优先保持向后兼容
- 对复杂逻辑添加必要注释与测试
- 新增能力时优先做最小可运行切片（MVP 优先）

## 包依赖规则

colony-harness 采用 monorepo 架构，包间有严格的依赖方向约束：

```
core（不可依赖 sdk / controlplane）
  ↑
adapter 包（memory-*, trace-*, llm-*, tools-builtin, evals）
  ↑
controlplane 包（contract → runtime → sdk-adapter）
```

- `colony-harness`（core）不可反向导入任何 adapter 或 controlplane 包
- 运行 `pnpm check:core-boundary` 可自动检测违规反向依赖
- CI 会在每次 PR 中执行此检查，违规将被阻断

## 文档要求

对外行为变化必须同步文档，至少覆盖：

- README 中的核心用法
- CHANGELOG 变更记录
- 必要时补充 docs 下设计文档
- 遵循 [docs/changelog-guidelines.md](./docs/changelog-guidelines.md)

## 测试要求

- 新增公共 API 必须配套单元测试
- 修复 bug 应包含回归测试
- Provider 相关改动应通过 `@colony-harness/provider-contract-tests` 契约测试
- 运行 `pnpm eval:gate` 确认评测门禁通过

## 发布说明

当前采用脚本化发布流程，发布前请确认：

1. `CHANGELOG.md` 已更新
2. 所有 CI 通过
3. 示例可运行
4. 版本号符合 semver 语义
5. 按 [docs/release-workflow.md](./docs/release-workflow.md) 执行 dry-run 与正式发布
