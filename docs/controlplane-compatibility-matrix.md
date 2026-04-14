# ControlPlane 兼容矩阵

用于发布前快速确认版本组合是否受支持。

## 当前矩阵（2026-04-14）

| core (`colony-harness`) | controlplane-runtime | controlplane-sdk-adapter | colony-bee-sdk | 状态 |
| --- | --- | --- | --- | --- |
| `1.0.x` | `1.0.x` | `1.0.x` | `1.1.x` | ✅ 推荐 |
| `1.0.x` | `1.0.x` | `1.0.x` | `1.0.x` | ⚠️ 需回归验证 |

## 兼容策略

- patch/minor：默认向后兼容，需通过 contract tests + eval gate。
- major：允许破坏性变更，必须更新迁移指南与矩阵。
- 任何 `core -> sdk` 直接依赖引入属于红线，不允许合并。

## 发布前检查

1. `pnpm test`
2. `pnpm eval:gate`
3. 覆盖 mock adapter 与 sdk adapter 的 contract tests
4. 更新本页矩阵版本与验证日期

