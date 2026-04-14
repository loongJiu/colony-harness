# ADR-0001: Harness / ControlPlane 边界冻结

- 状态：Accepted
- 日期：2026-04-14
- Owner：colony-harness maintainers

## 背景

在早期迭代中，运行时层与控制面接入职责容易混合，造成：

- `core` API 边界模糊
- 控制面升级影响 standalone 运行时
- 测试与发布门禁难以分层

## 决策

1. `colony-harness` core 保持纯 runtime，不直接依赖 `colony-bee-sdk`。
2. 控制面接入统一通过 adapter 包完成：
   - `@colony-harness/controlplane-contract`
   - `@colony-harness/controlplane-runtime`
   - `@colony-harness/controlplane-sdk-adapter`
3. `Standalone` 与 `ControlPlane` 两条路径长期并存，互不阻塞发布。
4. 发布需通过：
   - contract tests（mock + sdk adapter）
   - provider contract tests（OpenAI/Anthropic/Gemini）
   - eval gate（passRate/weightedScore/latency）

## 后果

正向收益：

- 运行时可独立演进
- 控制面接入可替换
- 回归面更清晰（runtime vs adapter vs provider）

成本：

- adapter 层会增加一个显式维护面
- 需要持续维护兼容矩阵与契约测试

## 变更流程

- 涉及边界变化（如 `core` 新增控制面字段）必须先更新 ADR 再改代码。
- 破坏性改动必须同步更新：
  - compatibility matrix
  - migration notes
  - contract test fixtures

