---
layout: home

hero:
  name: colony-harness
  text: 生产级 AI Agent Runtime 文档站
  tagline: 从 5 分钟跑通到生产治理，覆盖运行时、工具、安全、评测、发布全链路。
  actions:
    - theme: brand
      text: 5 分钟跑通
      link: /getting-started-5min
    - theme: alt
      text: API 参考
      link: /api-reference
    - theme: alt
      text: Cookbook
      link: /cookbook-research-agent

features:
  - title: 快速上手闭环
    details: 最短路径完成安装、运行、验证，快速确认核心链路可用。
    link: /getting-started-5min
  - title: 可上线的安全策略
    details: Guardrails 执行顺序、工具风险分级与白名单策略一站式说明。
    link: /guardrails-tool-security
  - title: 参数级 API 参考
    details: 不止索引，包含核心构建器和 provider 的关键参数与默认值。
    link: /api-reference
  - title: 回归评测体系
    details: 使用 runEvalSuite 与 scorer 把质量门禁纳入发布流程。
    link: /evals
  - title: 文档自动部署
    details: VitePress + GitHub Actions + Pages + Docker 文档镜像。
    link: /release-workflow
  - title: 实战 Cookbook
    details: 研究助手组合示例，串联工具、记忆、评测与产出验证。
    link: /cookbook-research-agent
---

## 快速路径

- 新接入项目：先看 [5 分钟跑通](./getting-started-5min.md)
- 想直接跑仓库示例：看 [示例运行指南](./examples-running.md)
- 需要接真实模型：看 [环境变量参考](./environment-variables.md)
- 遇到 CI 或构建异常：看 [常见问题排查](./troubleshooting.md)
- 需要理解内部机制：看 [运行生命周期](./runtime-lifecycle.md)
- 需要接 Queen：看 [双运行模式](./controlplane-modes.md)
- 发布前确认版本组合：看 [ControlPlane 兼容矩阵](./controlplane-compatibility-matrix.md)

## 深入与维护

- 生产实践与调优建议：[Advanced Guide](./advanced-guide.md)
- 变更记录规范：[Changelog Guidelines](./changelog-guidelines.md)
- 发布操作清单：[Release Workflow](./release-workflow.md)
