# 示例运行指南

这份指南专门讲“如何运行仓库自带示例”，并解释每一步为什么要做。

如果你只想最快看到结果，先执行“最短路径”；如果你希望理解输出含义和常见报错，再看后面的讲解与排查。

## 最短路径（推荐）

```bash
pnpm install
pnpm build
pnpm --filter @colony-harness/example-basic-agent dev
pnpm --filter @colony-harness/example-memory-agent dev
pnpm --filter @colony-harness/example-queen-agent-via-sdk dev
```

说明：

- `pnpm install`：安装 monorepo 全部依赖
- `pnpm build`：先构建 workspace 包（示例依赖这些包的 `dist` 类型与产物）
- `--filter ... dev`：只运行目标示例

## 前置条件

- Node.js `>=18.18.0`
- pnpm `>=10.33.0`

可用下面命令确认：

```bash
node -v
pnpm -v
```

## 示例一：basic-agent

运行：

```bash
pnpm --filter @colony-harness/example-basic-agent dev
```

你会看到：

- `Colony Trace` 日志（loop、tool 调用、token 统计）
- `Final output: { output: 'The result is 6.', tools: [ 'calculator' ] }`

这说明主链路已经打通：

1. `HarnessBuilder` 完成运行时装配
2. Agent Loop 触发模型调用（示例中是 mock provider）
3. `calculator` 工具被调用
4. 工具结果回注，输出最终答案

## 示例二：memory-agent（默认内存后端）

运行：

```bash
pnpm --filter @colony-harness/example-memory-agent dev
```

你会看到类似输出：

- `backend=memory`
- `memories: [ 'colony-harness has layered memory architecture' ]`

这表示语义记忆已写入并成功召回。

## 示例三：queen-agent-via-sdk（adapter 接入路径）

运行：

```bash
pnpm --filter @colony-harness/example-queen-agent-via-sdk dev
```

你会看到：

- `Result from queen-agent-via-sdk example:`
- 包含 `echo` 与 `taskId` 的结果对象

该示例演示：

1. Harness runtime 通过 `controlplane-runtime` 桥接到控制面端口
2. 使用 `controlplane-sdk-adapter` 组合 BeeAgent 接入层
3. 不改变业务 task handler 的写法

## memory-agent 的 SQLite 持久化模式

先创建数据目录，再运行：

```bash
mkdir -p examples/memory-agent/data
MEMORY_BACKEND=sqlite pnpm --filter @colony-harness/example-memory-agent dev
```

看到 `backend=sqlite` 即表示切换成功。数据库文件会写到：

- `examples/memory-agent/data/memory.sqlite`

## 常见报错排查（示例运行相关）

### 1) `Cannot find module 'colony-harness'` 或 `@colony-harness/trace-console`

原因：workspace 包还没先构建。

解决：

```bash
pnpm build
pnpm --filter @colony-harness/example-basic-agent dev
```

### 2) `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`

常见于非交互式终端里首次安装。

解决：

```bash
CI=true pnpm install
```

### 3) `Could not locate the bindings file ... node_sqlite3.node`

原因：`sqlite3` 原生模块没有正确下载/编译。

建议顺序：

```bash
pnpm rebuild sqlite3
```

若仍失败，可进入 `sqlite3` 目录手动执行安装脚本（会触发下载或本地编译）：

```bash
pnpm --dir node_modules/.pnpm/sqlite3@5.1.7/node_modules/sqlite3 run install
```

> 如果你的版本不是 `5.1.7`，把路径中的版本号替换成当前实际版本。

### 4) `SQLITE_CANTOPEN: unable to open database file`

原因通常是 SQLite 文件目录不存在。

解决：

```bash
mkdir -p examples/memory-agent/data
MEMORY_BACKEND=sqlite pnpm --filter @colony-harness/example-memory-agent dev
```

## 如何修改示例并快速验证

- 改 `examples/basic-agent/src/index.ts`：可以替换工具逻辑或输入表达式
- 改 `examples/memory-agent/src/index.ts`：可以调整 `remember:` / `recall:` 逻辑
- 修改后执行：

```bash
pnpm --filter @colony-harness/example-basic-agent dev
# 或
pnpm --filter @colony-harness/example-memory-agent dev
```

## 下一步阅读

- 想接真实模型：看 [环境变量参考](./environment-variables.md)
- 想理解运行阶段：看 [运行生命周期](./runtime-lifecycle.md)
- 想排查更多问题：看 [常见问题排查](./troubleshooting.md)
