# Release Workflow

本文档定义 colony-harness 的标准发布流程。

## 1. 发布前检查

1. 工作区干净（默认要求）
2. `CHANGELOG.md` 已补齐 Unreleased 变更
3. 本地通过：
   - `pnpm build`
   - `pnpm typecheck`
   - `pnpm test`
   - `pnpm docs:build`

## 2. 预演发布

先执行 dry-run 确认版本与包列表：

```bash
pnpm release:dry-run -- --bump patch
```

## 3. 正式发布

按 patch/minor/major 自动递增：

```bash
pnpm release -- --bump patch
```

指定版本：

```bash
pnpm release -- --version 0.2.0 --tag latest
```

常用参数：

- `--no-publish`：只改版本和 changelog，不发布 npm
- `--skip-checks`：跳过 build/typecheck/test
- `--git-tag`：创建 `v<version>` 标签
- `--allow-dirty`：允许 dirty 工作区（不建议）

## 4. 发布后动作

1. 推送 commit 与 tag
2. 在 GitHub 创建 Release Note
3. 在 README/文档中同步版本里程碑（如有）
4. 确认 Docs 工作流构建与部署成功（`docs.yml`）
