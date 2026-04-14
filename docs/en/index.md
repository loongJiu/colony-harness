---
layout: home

hero:
  name: colony-harness
  text: Production-grade AI Agent Runtime
  tagline: From ReAct loops to quality gates — the infrastructure layer for safe, observable, evaluable AI agents.
  actions:
    - theme: brand
      text: Start Tutorial
      link: /en/tutorial
    - theme: alt
      text: API Reference
      link: /en/api-reference
    - theme: alt
      text: GitHub
      link: https://github.com/loongJiu/colony-harness

features:
  - title: ReAct Agentic Loop
    details: Multi-turn reasoning-action-observation cycle with configurable stop conditions, tool concurrency, and fail strategies.
    link: /en/runtime-lifecycle
  - title: Three-Tier Memory
    details: Working / Episodic / Semantic memory with auto context compression. SQLite and Redis backends included.
    link: /en/api-reference
  - title: Full-Chain Observability
    details: Four trace exporters — Console, File, OpenTelemetry (OpenInference-aligned), and Langfuse.
    link: /en/api-reference
  - title: Safety Guardrails
    details: "Five built-in guards: prompt injection detection, PII redaction, token limits, sensitive words, and rate limiting."
    link: /en/guardrails-tool-security
  - title: Evaluation Suite
    details: Seven built-in scorers plus Eval Gate — automatic quality enforcement before every release.
    link: /en/evals
  - title: Multi-Provider Unification
    details: OpenAI / Anthropic / Gemini / OpenAI-Compatible — swap providers with a single line.
    link: /en/api-reference
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
  <pre class="code-preview-body"><span class="kw">import</span> { <span class="fn">HarnessBuilder</span>, <span class="fn">PromptInjectionGuard</span> } <span class="kw">from</span> <span class="str">'colony-harness'</span>
<span class="kw">import</span> { <span class="fn">OpenAIProvider</span> } <span class="kw">from</span> <span class="str">'@colony-harness/llm-openai'</span>
<span class="kw">import</span> { <span class="fn">ConsoleTraceExporter</span> } <span class="kw">from</span> <span class="str">'@colony-harness/trace-console'</span>
<span class="kw">import</span> { <span class="fn">calculatorTool</span> } <span class="kw">from</span> <span class="str">'@colony-harness/tools-builtin'</span>
<span class="cmt">// Build a production-ready agent in 30 seconds</span>
<span class="kw">const</span> <span class="fn">harness</span> = <span class="kw">new</span> <span class="cls">HarnessBuilder</span>()
  .<span class="fn">llm</span>(<span class="kw">new</span> <span class="cls">OpenAIProvider</span>({ <span class="op">apiKey</span>: process.env.<span class="fn">OPENAI_API_KEY</span>, <span class="op">model</span>: <span class="str">'gpt-4o'</span> }))
  .<span class="fn">tool</span>(<span class="fn">calculatorTool</span>)
  .<span class="fn">trace</span>(<span class="kw">new</span> <span class="cls">ConsoleTraceExporter</span>())
  .<span class="fn">guard</span>(<span class="kw">new</span> <span class="cls">PromptInjectionGuard</span>())
  .<span class="fn">build</span>()</pre>
</div>
<div class="section-title">
  <h2>Why colony-harness?</h2>
  <p>Models are powerful, but lack a reliable production runtime. We fill that gap.</p>
</div>
<div class="why-grid">
  <div class="why-card">
    <div class="why-icon">&#9670;</div>
    <h3>Production Safety</h3>
    <p>Five-layer guard pipeline covering injection detection, PII redaction, token limits, sensitive words, and rate control.</p>
  </div>
  <div class="why-card">
    <div class="why-icon">&#9881;</div>
    <h3>Zod Tool Validation</h3>
    <p>Register tools with Zod schemas — automatic input/output validation and JSON Schema generation for LLM consumption.</p>
  </div>
  <div class="why-card">
    <div class="why-icon">&#9733;</div>
    <h3>Full-Chain Tracing</h3>
    <p>Built-in Span / Event / Metrics tracing with four exporters covering terminal, file, OTel, and Langfuse.</p>
  </div>
  <div class="why-card">
    <div class="why-icon">&#9830;</div>
    <h3>Three-Tier Memory</h3>
    <p>Working / Episodic / Semantic memory architecture with automatic context compression when tokens exceed limits.</p>
  </div>
  <div class="why-card">
    <div class="why-icon">&#9679;</div>
    <h3>Evaluation Gates</h3>
    <p>Seven scorers plus Eval Gate — automatic quality enforcement that blocks sub-threshold releases.</p>
  </div>
  <div class="why-card">
    <div class="why-icon">&#11044;</div>
    <h3>Multi-Provider</h3>
    <p>Unified interface across OpenAI, Anthropic, Gemini, and OpenAI-compatible endpoints. Swap with one line.</p>
  </div>
</div>
<div class="arch-section">
  <div class="section-title">
    <h2>Architecture</h2>
    <p>Centralized runtime, pluggable ecosystem — assemble only what you need.</p>
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
    <h2>Package Ecosystem</h2>
    <p>18 packages, organized by function — install only what you need.</p>
  </div>
  <div class="eco-categories">
    <div class="eco-category">
      <div class="eco-category-header">
        <span class="badge badge-core">Core</span>
      </div>
      <div class="eco-cards">
        <div class="eco-card">
          <span class="eco-card-name">colony-harness</span>
          <span class="eco-card-desc">Core runtime. HarnessBuilder, AgenticLoop, ToolRegistry, MemoryManager, TraceHub, Guardrails all in one.</span>
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
          <span class="eco-card-desc">OpenAI Chat Completions adapter. Supports tool calling and token usage tracking.</span>
          <span class="eco-card-install">pnpm add @colony-harness/llm-openai</span>
        </div>
        <div class="eco-card">
          <span class="eco-card-name">@colony-harness/llm-anthropic</span>
          <span class="eco-card-desc">Anthropic Messages API adapter. Auto-separates system messages, maps tool_use format.</span>
          <span class="eco-card-install">pnpm add @colony-harness/llm-anthropic</span>
        </div>
        <div class="eco-card">
          <span class="eco-card-name">@colony-harness/llm-gemini</span>
          <span class="eco-card-desc">Google Gemini generateContent adapter. Maps roles and functionDeclarations.</span>
          <span class="eco-card-install">pnpm add @colony-harness/llm-gemini</span>
        </div>
        <div class="eco-card">
          <span class="eco-card-name">@colony-harness/llm-openai-compatible</span>
          <span class="eco-card-desc">Universal adapter for any OpenAI-compatible endpoint. Works with domestic LLMs.</span>
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
          <span class="eco-card-desc">SQLite persistence adapter. Supports similarity search, session cleanup, auto table creation.</span>
          <span class="eco-card-install">pnpm add @colony-harness/memory-sqlite</span>
        </div>
        <div class="eco-card">
          <span class="eco-card-name">@colony-harness/memory-redis</span>
          <span class="eco-card-desc">Redis adapter. Hash entries, sorted sets for time ordering, pipeline-optimized writes.</span>
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
          <span class="eco-card-desc">ANSI-colored terminal exporter. Shows TraceID, task info, duration, and span details.</span>
          <span class="eco-card-install">pnpm add @colony-harness/trace-console</span>
        </div>
        <div class="eco-card">
          <span class="eco-card-name">@colony-harness/trace-file</span>
          <span class="eco-card-desc">JSONL file exporter. Append-only writes with optional pretty-print JSON mode.</span>
          <span class="eco-card-install">pnpm add @colony-harness/trace-file</span>
        </div>
        <div class="eco-card">
          <span class="eco-card-name">@colony-harness/trace-otel</span>
          <span class="eco-card-desc">OpenTelemetry bridge. Aligns with OpenInference semantics (session.id, input/output.value).</span>
          <span class="eco-card-install">pnpm add @colony-harness/trace-otel</span>
        </div>
        <div class="eco-card">
          <span class="eco-card-name">@colony-harness/trace-langfuse</span>
          <span class="eco-card-desc">Native Langfuse exporter. Batch sends traces and observations with custom fetch and tags.</span>
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
          <span class="eco-card-desc">Eight built-in tools: http_request, read_file, write_file, run_command, search_web, calculator, json_query, template_render.</span>
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
          <span class="eco-card-desc">Evaluation toolkit. runEvalSuite runner, seven scorers, evaluateGate quality gate.</span>
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
          <span class="eco-card-desc">Unified port contract. Defines TaskEnvelope, ControlPlanePort and related interfaces.</span>
        </div>
        <div class="eco-card">
          <span class="eco-card-name">@colony-harness/controlplane-runtime</span>
          <span class="eco-card-desc">Runtime bridge. Connects ColonyHarness with ControlPlanePort, manages task lifecycle.</span>
        </div>
        <div class="eco-card">
          <span class="eco-card-name">@colony-harness/controlplane-mock-adapter</span>
          <span class="eco-card-desc">In-memory mock adapter. Supports dispatchTask for direct injection in tests.</span>
        </div>
        <div class="eco-card">
          <span class="eco-card-name">@colony-harness/controlplane-sdk-adapter</span>
          <span class="eco-card-desc">Queen SDK adapter. Connects to Queen control plane via colony-bee-sdk.</span>
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
    <h2>Choose Your Path</h2>
    <p>Whether you're just starting or going deep — there's a path for you.</p>
  </div>
  <div class="paths-grid">
    <a class="path-card" href="/en/tutorial">
      <div class="path-icon">&#9889;</div>
      <h3>Quick Start</h3>
      <p>Run a minimal example in 5 minutes. Verify the core loop works end-to-end.</p>
      <span class="path-time">~5 min</span>
    </a>
    <a class="path-card" href="/en/tutorial">
      <div class="path-icon">&#128300;</div>
      <h3>Deep Dive</h3>
      <p>Progressive 8-step tutorial from install to production. Covers memory, tracing, guards, and evals.</p>
      <span class="path-time">~75 min</span>
    </a>
    <a class="path-card" href="https://github.com/loongJiu/colony-harness">
      <div class="path-icon">&#128736;</div>
      <h3>Contributor</h3>
      <p>Join the development. Read architecture docs, ADRs, and understand package boundaries.</p>
      <span class="path-time">Open Source</span>
    </a>
  </div>
</div>
</div>
