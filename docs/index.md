---
layout: home

hero:
  name: colony-harness
  text: 生产级 AI Agent 运行时
  tagline: 从 ReAct 循环到质量门禁，覆盖工具、记忆、追踪、护栏与评测的全链路基础设施。
  actions:
    - theme: brand
      text: 开始教程
      link: /tutorial
    - theme: alt
      text: API 参考
      link: /api-reference
    - theme: alt
      text: GitHub
      link: https://github.com/loongJiu/colony-harness

features:
  - title: ReAct Agentic Loop
    details: 多轮推理-行动-观察循环，可配置停止条件、工具并发与失败策略。
    link: /runtime-lifecycle
  - title: 三层记忆架构
    details: Working / Episodic / Semantic 三级记忆，自动上下文压缩，SQLite 与 Redis 双后端。
    link: /api-reference
  - title: 全链路可观测
    details: Console / File / OpenTelemetry / Langfuse 四种 Trace 导出，OpenInference 语义对齐。
    link: /api-reference
  - title: 安全护栏管线
    details: Prompt 注入检测、PII 脱敏、Token 限制、敏感词过滤、速率限制五重防护。
    link: /guardrails-tool-security
  - title: 回归评测体系
    details: 7 种内置 Scorer + Eval Gate 质量门禁，发布前自动拦截不达标版本。
    link: /evals
  - title: 多模型统一接入
    details: OpenAI / Anthropic / Gemini / OpenAI-Compatible 四大 Provider，统一调用接口。
    link: /api-reference
---

<div class="portal-section">
<div class="install-bar">
  <span class="cmd">pnpm add colony-harness</span>
  <span class="copy-btn" onclick="navigator.clipboard.writeText('pnpm add colony-harness')">Copy</span>
</div>
<div class="code-preview">
  <div class="code-preview-header">
    <span class="code-preview-dot"></span>
    <span class="code-preview-dot"></span>
    <span class="code-preview-dot"></span>
    <span class="code-preview-title">agent.ts</span>
  </div>
  <div class="code-preview-body"><span class="kw">import</span> { <span class="fn">HarnessBuilder</span>, <span class="fn">PromptInjectionGuard</span> } <span class="kw">from</span> <span class="str">'colony-harness'</span><br><span class="kw">import</span> { <span class="fn">OpenAIProvider</span> } <span class="kw">from</span> <span class="str">'@colony-harness/llm-openai'</span><br><span class="kw">import</span> { <span class="fn">ConsoleTraceExporter</span> } <span class="kw">from</span> <span class="str">'@colony-harness/trace-console'</span><br><span class="kw">import</span> { <span class="fn">calculatorTool</span> } <span class="kw">from</span> <span class="str">'@colony-harness/tools-builtin'</span><br><br><span class="cmt">// 30 秒构建一个生产级 Agent</span><br><span class="kw">const</span> <span class="fn">harness</span> = <span class="kw">new</span> <span class="cls">HarnessBuilder</span>()<br>  .<span class="fn">llm</span>(<span class="kw">new</span> <span class="cls">OpenAIProvider</span>({ <span class="op">apiKey</span>: process.env.<span class="fn">OPENAI_API_KEY</span>, <span class="op">model</span>: <span class="str">'gpt-4o'</span> }))<br>  .<span class="fn">tool</span>(<span class="fn">calculatorTool</span>)<br>  .<span class="fn">trace</span>(<span class="kw">new</span> <span class="cls">ConsoleTraceExporter</span>())<br>  .<span class="fn">guard</span>(<span class="kw">new</span> <span class="cls">PromptInjectionGuard</span>())<br>  .<span class="fn">build</span>()</div>
</div>
<div class="section-title">
  <h2>Why colony-harness?</h2>
  <p>模型很强大，但缺少一个可靠的生产运行时。我们补上了这一层。</p>
</div>
<div class="why-grid">
  <div class="why-card">
    <div class="why-icon">&#9670;</div>
    <h3>生产级安全</h3>
    <p>五重护栏管线覆盖注入检测、PII 脱敏、Token 限制、敏感词和速率控制，从第一天就可以上线。</p>
  </div>
  <div class="why-card">
    <div class="why-icon">&#9881;</div>
    <h3>Zod 工具校验</h3>
    <p>工具注册使用 Zod Schema，输入输出自动校验，JSON Schema 自动生成给 LLM 消费，零遗漏。</p>
  </div>
  <div class="why-card">
    <div class="why-icon">&#9733;</div>
    <h3>全链路追踪</h3>
    <p>内置 Span / Event / Metrics 三层追踪，四种导出器覆盖终端、文件、OTel 和 Langfuse。</p>
  </div>
  <div class="why-card">
    <div class="why-icon">&#9830;</div>
    <h3>三层记忆</h3>
    <p>Working / Episodic / Semantic 三级记忆架构，自动上下文压缩，Token 超限不再是噩梦。</p>
  </div>
  <div class="why-card">
    <div class="why-icon">&#9679;</div>
    <h3>评测门禁</h3>
    <p>7 种 Scorer + Eval Gate，质量门禁自动拦截不达标版本，让发布有据可依。</p>
  </div>
  <div class="why-card">
    <div class="why-icon">&#11044;</div>
    <h3>多模型统一</h3>
    <p>OpenAI / Anthropic / Gemini / 兼容接口四路统一，切换 Provider 只换一行代码。</p>
  </div>
</div>
<div class="arch-section">
  <div class="section-title">
    <h2>架构全景</h2>
    <p>中心化运行时，插件化生态 —— 按需组装，各司其职。</p>
  </div>
  <div class="arch-diagram">
    <div class="arch-row">
      <div class="arch-node" style="border-color: rgba(124, 58, 237, 0.25);">
        <span class="arch-icon">&#11042;</span>
        <span class="arch-label">LLM Providers</span>
        <span class="arch-count">4 packages</span>
      </div>
    </div>
    <div class="arch-connector">&#8942; &#8942; &#8942;</div>
    <div class="arch-row">
      <div class="arch-node" style="border-color: rgba(219, 39, 119, 0.25);">
        <span class="arch-icon">&#9830;</span>
        <span class="arch-label">Memory</span>
        <span class="arch-count">2 adapters</span>
      </div>
      <div class="arch-core">
        <span class="arch-icon">&#11041;</span>
        <span class="arch-label">ColonyHarness</span>
        <span class="arch-count">Core Runtime</span>
      </div>
      <div class="arch-node" style="border-color: rgba(8, 145, 178, 0.25);">
        <span class="arch-icon">&#10038;</span>
        <span class="arch-label">Trace</span>
        <span class="arch-count">4 exporters</span>
      </div>
    </div>
    <div class="arch-connector">&#8942; &#8942; &#8942;</div>
    <div class="arch-row">
      <div class="arch-node" style="border-color: rgba(234, 88, 12, 0.25);">
        <span class="arch-icon">&#9656;</span>
        <span class="arch-label">Tools</span>
        <span class="arch-count">8 built-in</span>
      </div>
      <div class="arch-node" style="border-color: rgba(22, 163, 74, 0.25);">
        <span class="arch-icon">&#9733;</span>
        <span class="arch-label">Evaluation</span>
        <span class="arch-count">7 scorers</span>
      </div>
      <div class="arch-node" style="border-color: rgba(37, 99, 235, 0.25);">
        <span class="arch-icon">&#8982;</span>
        <span class="arch-label">Control Plane</span>
        <span class="arch-count">4 packages</span>
      </div>
    </div>
  </div>
</div>
<div class="eco-section">
  <div class="section-title">
    <h2>包生态</h2>
    <p>18 个包，按职能分组 —— 只装你需要的。</p>
  </div>
  <div class="eco-categories">
    <div class="eco-category">
      <div class="eco-category-header">
        <span class="badge badge-core">Core</span>
      </div>
      <div class="eco-cards">
        <div class="eco-card">
          <span class="eco-card-name">colony-harness</span>
          <span class="eco-card-desc">核心运行时。HarnessBuilder、AgenticLoop、ToolRegistry、MemoryManager、TraceHub、Guardrails 全部在此。</span>
          <span class="eco-card-install">pnpm add colony-harness</span>
        </div>
      </div>
    </div>
    <div class="eco-category">
      <div class="eco-category-header">
        <span class="badge badge-llm">LLM Providers</span>
      </div>
      <div class="eco-cards">
        <div class="eco-card">
          <span class="eco-card-name">@colony-harness/llm-openai</span>
          <span class="eco-card-desc">OpenAI Chat Completions API 适配器。支持 tool calling 与 token 追踪。</span>
          <span class="eco-card-install">pnpm add @colony-harness/llm-openai</span>
        </div>
        <div class="eco-card">
          <span class="eco-card-name">@colony-harness/llm-anthropic</span>
          <span class="eco-card-desc">Anthropic Messages API 适配器。自动分离 system 消息，映射 tool_use 格式。</span>
          <span class="eco-card-install">pnpm add @colony-harness/llm-anthropic</span>
        </div>
        <div class="eco-card">
          <span class="eco-card-name">@colony-harness/llm-gemini</span>
          <span class="eco-card-desc">Google Gemini generateContent API 适配器。映射角色与 functionDeclarations。</span>
          <span class="eco-card-install">pnpm add @colony-harness/llm-gemini</span>
        </div>
        <div class="eco-card">
          <span class="eco-card-name">@colony-harness/llm-openai-compatible</span>
          <span class="eco-card-desc">兼容 OpenAI 协议的通用适配器。适配国内大模型或自部署端点。</span>
          <span class="eco-card-install">pnpm add @colony-harness/llm-openai-compatible</span>
        </div>
      </div>
    </div>
    <div class="eco-category">
      <div class="eco-category-header">
        <span class="badge badge-memory">Memory</span>
      </div>
      <div class="eco-cards">
        <div class="eco-card">
          <span class="eco-card-name">@colony-harness/memory-sqlite</span>
          <span class="eco-card-desc">SQLite 持久化记忆适配器。支持相似度搜索、按会话清理，自动建表。</span>
          <span class="eco-card-install">pnpm add @colony-harness/memory-sqlite</span>
        </div>
        <div class="eco-card">
          <span class="eco-card-name">@colony-harness/memory-redis</span>
          <span class="eco-card-desc">Redis 记忆适配器。Hash 存储条目、Sorted Set 时间排序、Pipeline 优化。</span>
          <span class="eco-card-install">pnpm add @colony-harness/memory-redis</span>
        </div>
      </div>
    </div>
    <div class="eco-category">
      <div class="eco-category-header">
        <span class="badge badge-trace">Trace</span>
      </div>
      <div class="eco-cards">
        <div class="eco-card">
          <span class="eco-card-name">@colony-harness/trace-console</span>
          <span class="eco-card-desc">终端彩色输出追踪器。ANSI 色彩展示 TraceID、任务信息、耗时和 Span 细节。</span>
          <span class="eco-card-install">pnpm add @colony-harness/trace-console</span>
        </div>
        <div class="eco-card">
          <span class="eco-card-name">@colony-harness/trace-file</span>
          <span class="eco-card-desc">JSONL 文件追踪器。追加写入，支持 pretty-print JSON 模式。</span>
          <span class="eco-card-install">pnpm add @colony-harness/trace-file</span>
        </div>
        <div class="eco-card">
          <span class="eco-card-name">@colony-harness/trace-otel</span>
          <span class="eco-card-desc">OpenTelemetry 桥接器。对齐 OpenInference 语义（session.id、input/output.value）。</span>
          <span class="eco-card-install">pnpm add @colony-harness/trace-otel</span>
        </div>
        <div class="eco-card">
          <span class="eco-card-name">@colony-harness/trace-langfuse</span>
          <span class="eco-card-desc">Langfuse 原生导出器。批量发送 Trace 与 Observation，支持自定义 fetch 和 tags。</span>
          <span class="eco-card-install">pnpm add @colony-harness/trace-langfuse</span>
        </div>
      </div>
    </div>
    <div class="eco-category">
      <div class="eco-category-header">
        <span class="badge badge-tools">Tools</span>
      </div>
      <div class="eco-cards">
        <div class="eco-card">
          <span class="eco-card-name">@colony-harness/tools-builtin</span>
          <span class="eco-card-desc">8 个内置工具：http_request、read_file、write_file、run_command、search_web、calculator、json_query、template_render。</span>
          <span class="eco-card-install">pnpm add @colony-harness/tools-builtin</span>
        </div>
      </div>
    </div>
    <div class="eco-category">
      <div class="eco-category-header">
        <span class="badge badge-eval">Eval</span>
      </div>
      <div class="eco-cards">
        <div class="eco-card">
          <span class="eco-card-name">@colony-harness/evals</span>
          <span class="eco-card-desc">评测工具包。runEvalSuite 执行器、7 种 Scorer、evaluateGate 质量门禁。</span>
          <span class="eco-card-install">pnpm add @colony-harness/evals</span>
        </div>
      </div>
    </div>
    <div class="eco-category">
      <div class="eco-category-header">
        <span class="badge badge-cp">Control Plane</span>
      </div>
      <div class="eco-cards">
        <div class="eco-card">
          <span class="eco-card-name">@colony-harness/controlplane-contract</span>
          <span class="eco-card-desc">控制面统一端口契约。定义 TaskEnvelope、ControlPlanePort 等接口类型。</span>
        </div>
        <div class="eco-card">
          <span class="eco-card-name">@colony-harness/controlplane-runtime</span>
          <span class="eco-card-desc">运行时桥接器。连接 ColonyHarness 与 ControlPlanePort，管理任务生命周期。</span>
        </div>
        <div class="eco-card">
          <span class="eco-card-name">@colony-harness/controlplane-mock-adapter</span>
          <span class="eco-card-desc">内存 Mock 适配器。支持 dispatchTask 直接注入，用于测试场景。</span>
        </div>
        <div class="eco-card">
          <span class="eco-card-name">@colony-harness/controlplane-sdk-adapter</span>
          <span class="eco-card-desc">Queen SDK 适配器。通过 colony-bee-sdk 连接 Queen 控制面。</span>
        </div>
      </div>
    </div>
  </div>
</div>
<div class="stats-section">
  <div class="stats-grid">
    <div class="stat-item">
      <div class="stat-number">18</div>
      <div class="stat-label">Packages</div>
    </div>
    <div class="stat-item">
      <div class="stat-number">4</div>
      <div class="stat-label">LLM Providers</div>
    </div>
    <div class="stat-item">
      <div class="stat-number">8</div>
      <div class="stat-label">Built-in Tools</div>
    </div>
    <div class="stat-item">
      <div class="stat-number">7</div>
      <div class="stat-label">Eval Scorers</div>
    </div>
  </div>
</div>
<div class="paths-section">
  <div class="section-title">
    <h2>选择你的路径</h2>
    <p>无论你是初次接触还是深度集成，都有适合的起点。</p>
  </div>
  <div class="paths-grid">
    <a class="path-card" href="/tutorial">
      <div class="path-icon">&#9889;</div>
      <h3>Quick Start</h3>
      <p>5 分钟跑通最小示例，验证核心链路。适合第一次接触 colony-harness 的开发者。</p>
      <span class="path-time">~5 min</span>
    </a>
    <a class="path-card" href="/tutorial">
      <div class="path-icon">&#128300;</div>
      <h3>Deep Dive</h3>
      <p>渐进式教程，8 步从安装到生产部署。深入理解记忆、追踪、护栏和评测体系。</p>
      <span class="path-time">~75 min</span>
    </a>
    <a class="path-card" href="https://github.com/loongJiu/colony-harness">
      <div class="path-icon">&#128736;</div>
      <h3>Contributor</h3>
      <p>参与框架开发。阅读架构设计和 ADR，理解核心边界和包间依赖关系。</p>
      <span class="path-time">Open Source</span>
    </a>
  </div>
</div>
</div>
