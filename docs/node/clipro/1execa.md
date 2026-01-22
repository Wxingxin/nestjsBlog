下面把 **execa 在 Node CLI 里最常见的用法**按“你做真实命令行工具一定会遇到的场景”系统整理一遍，并给出可直接复用的代码片段与对应知识点。示例默认 ESM（`"type":"module"`），CJS 仅需把 `import` 改成 `require()`。

> Execa 的定位：更适合“程序化执行外部命令”的封装，比直接用 `child_process` 更一致、更好处理输出与错误。([NPM][1])

---

## 1) 最基础：执行命令并拿到结果（stdout/stderr/exitCode）

**知识点**

* `await execa(file, args?, options?)`：推荐方式（不经 shell，跨平台更稳）
* 默认 `stdout/stderr` 会被捕获（pipe），执行结束后在 `result.stdout / result.stderr` 里拿到。([GitHub][2])

**代码**

```js
import { execa } from "execa";

const result = await execa("node", ["-v"]);
console.log("stdout:", result.stdout);
console.log("exitCode:", result.exitCode);
```

---

## 2) CLI 常用：实时输出到终端（像直接运行一样）+ 同时还能拿到文本

**知识点**

* `stdio: "inherit"`：让子进程直接把输出写到当前终端（适合跑构建、安装依赖、脚手架）
* 如果你既要“实时打印”又要“结束后拿到输出”，通常用 Execa 提供的输出重定向/组合能力（例如 `all`、或将输出流转发）。具体能力在官方输出文档中。([GitHub][2])

**代码（最常用：完全交给终端）**

```js
import { execa } from "execa";

await execa("npm", ["run", "build"], { stdio: "inherit" });
```

**代码（把 stdout/stderr 合并为 all，便于统一处理日志）**

```js
import { execa } from "execa";

const subprocess = execa("npm", ["run", "build"], { all: true });
subprocess.all?.on("data", (chunk) => {
  process.stdout.write(chunk); // 实时输出
});
await subprocess; // 仍可等待完成
```

> “合并输出/获取交错输出”属于 Execa 的核心卖点之一。([GitHub][3])

---

## 3) 最容易踩坑：不要用 `cd && ...`，用 `cwd`（工作目录）

**知识点**

* `cd` 属于 shell 内建命令；如果你不启用 shell，`cd` 根本不是一个可执行文件
* 真实项目：用 `cwd` 改工作目录；这比拼字符串安全、跨平台。([Node.js][4])

**代码**

```js
import { execa } from "execa";

await execa("git", ["status"], { cwd: "/path/to/repo", stdio: "inherit" });
```

---

## 4) 两种“写法流派”：args 数组 vs command 字符串 vs `$` 模板

**知识点**

* **首选**：`execa(file, argsArray)`，避免手写引号/转义，跨平台更可靠
* `execaCommand("git status")`（或 `execa.command()`）：适合你已经有完整字符串，但要小心参数注入/转义问题
* Execa 还提供 `$`（tagged template）风格，主打“自动转义插值”，更适合写脚本式 CLI（类似 zx，但更偏程序化）。([GitHub][3])

**代码（最稳）**

```js
await execa("git", ["commit", "-m", "feat: init"]);
```

**代码（字符串命令）**

```js
import { execaCommand } from "execa";
await execaCommand("git status", { stdio: "inherit" });
```

**代码（`$` 模板：插值更安全）**

```js
import { $ } from "execa";

const branch = "main";
await $`git checkout ${branch}`;
```

---

## 5) 环境变量与 PATH：`env`、`extendEnv`、`preferLocal`

**知识点**

* `env`: 为子进程注入环境变量（常用于 `NODE_ENV`、代理、鉴权 token）
* `extendEnv`: 是否在当前环境基础上扩展（通常保持默认即可）
* `preferLocal`: 优先使用项目 `node_modules/.bin` 下的可执行文件（非常适合 CLI 里调用 eslint/vite/tsc 等“本地依赖命令”）。([GitHub][3])

**代码（调用本地安装的 eslint）**

```js
import { execa } from "execa";

await execa("eslint", ["."], { preferLocal: true, stdio: "inherit" });
```

**代码（注入 env）**

```js
await execa("node", ["script.js"], {
  env: { NODE_ENV: "production" },
  stdio: "inherit",
});
```

---

## 6) 错误处理：ExecaError、exitCode、以及“不因非 0 退出码而 throw”

**知识点**

* 默认：子进程 **非 0 退出码会 reject**，抛出 `ExecaError`，错误对象通常仍包含 stdout/stderr 等信息，方便你打印更友好的报错。([GitHub][5])
* CLI 里常见需求：比如跑 `eslint`，它退出码可能是 1，但你仍想读取输出并自行决定是否中断；这时用 `reject: false`。([GitHub][6])

**代码（标准捕获）**

```js
import { execa } from "execa";

try {
  await execa("git", ["push"], { stdio: "inherit" });
} catch (err) {
  // err 是 ExecaError（通常含 exitCode、stdout、stderr 等）
  console.error(err.shortMessage ?? err.message);
  process.exitCode = 1;
}
```

**代码（reject: false，自行处理退出码）**

```js
const res = await execa("eslint", ["."], { reject: false });
if (res.exitCode !== 0) {
  console.error(res.stdout);
  process.exitCode = res.exitCode;
}
```

---

## 7) 输入（stdin）与管道：把数据喂给子进程 / 串联多个命令

**知识点**

* `input`: 直接传字符串/Buffer 给子进程 stdin（适合小数据）
* 大数据/流式：用 Node stream，把 `stdin/stdout` 连接起来（本质是 child process 的流接口，Execa 做了更好用的封装）。([GitHub][3])

**代码（input）**

```js
import { execa } from "execa";

const res = await execa("node", ["-e", "process.stdin.pipe(process.stdout)"], {
  input: "hello\n",
});
console.log(res.stdout); // hello
```

**代码（管道：A 的 stdout 接到 B 的 stdin）**

```js
import { execa } from "execa";

const a = execa("node", ["-e", "console.log('hi')"]);
const b = execa("node", ["-e", "process.stdin.pipe(process.stdout)"]);

a.stdout.pipe(b.stdin);
const out = await b;
console.log(out.stdout); // hi
```

---

## 8) 超时、取消、信号：CLI 里避免“卡死”

**知识点**

* 长时间任务（下载、构建、网络请求）建议配置 `timeout`
* CLI 支持 Ctrl+C：监听 `SIGINT`，向子进程发信号并退出
* 这些能力都建立在 Node 的子进程与信号机制之上。([Node.js][4])

**代码（超时 + Ctrl+C）**

```js
import { execa } from "execa";

const sub = execa("npm", ["run", "build"], { stdio: "inherit", timeout: 60_000 });

process.on("SIGINT", () => {
  sub.kill("SIGINT", { forceKillAfterTimeout: 5_000 });
});

await sub;
```

---

## 9) 并发与队列：Promise.all、但要控制并发数

**知识点**

* `Promise.all` 跑多个子进程很常见（例如多包构建、并行检测）
* 但 CLI 常需要“限制并发”（避免 CPU/IO 过载），通常配合 `p-limit` 一类库（思想：并发池）

**代码（简单并行）**

```js
await Promise.all([
  execa("node", ["-v"]),
  execa("npm", ["-v"]),
]);
```

---

## 10) 安全与跨平台：为什么 CLI 里更推荐 “file + args”

**知识点**

* 字符串命令经常会引入“引号与转义”的平台差异（尤其 Windows）
* 还可能带来命令注入风险（用户输入拼到字符串里）
* 用 `execa(file, args)` 或 `$` 模板插值，能显著降低这类问题。([GitHub][3])

---

## 11) 在 Commander 的 action 里使用 Execa（典型组合）

**知识点**

* Commander 负责“解析命令与参数”
* Execa 负责“执行外部命令”
* action 里建议 `parseAsync`，保证异步错误可控（这是 CLI 工程化基本功）

**代码（示例：`mycli lint` 调用本地 eslint）**

```js
#!/usr/bin/env node
import { Command } from "commander";
import { execa } from "execa";

const program = new Command();

program
  .name("mycli")
  .command("lint")
  .option("--fix", "auto fix")
  .action(async (opts) => {
    const args = ["."];
    if (opts.fix) args.push("--fix");

    const res = await execa("eslint", args, {
      preferLocal: true,
      stdio: "inherit",
      reject: false,
    });

    process.exitCode = res.exitCode;
  });

await program.parseAsync(process.argv);
```

---

### 你学习/记忆时建议抓住的“核心知识点清单”

1. **不要用 shell 拼字符串**：优先 `file + args`（或 `$` 模板）。([GitHub][3])
2. **目录切换用 `cwd`**，不要 `cd && ...`。([Stack Overflow][7])
3. **输出策略**：`stdio: "inherit"`（纯终端） vs 默认捕获（拿 stdout/stderr） vs 合并 `all`。([GitHub][2])
4. **错误策略**：默认非 0 退出码会 throw；需要“拿到输出自行判断”就 `reject:false`。([GitHub][5])
5. **本地 bin**：`preferLocal:true` 让 CLI 更“项目化”。([GitHub][3])

---

如果你告诉我你正在写的 CLI 是哪一类（脚手架/构建封装/部署/日志工具），以及会调用哪些外部命令（git、pnpm、vite、docker 等），我可以把上面的模式整理成一套“可直接复制进项目”的执行层封装（含：统一日志、错误格式化、spinner、超时、Ctrl+C 处理、以及对 Windows 的参数兼容策略）。

[1]: https://www.npmjs.com/package/execa?utm_source=chatgpt.com "execa"
[2]: https://github.com/sindresorhus/execa/blob/main/docs/output.md?utm_source=chatgpt.com "execa/docs/output.md at main"
[3]: https://github.com/sindresorhus/execa?utm_source=chatgpt.com "sindresorhus/execa: Process execution for humans"
[4]: https://nodejs.org/api/child_process.html?utm_source=chatgpt.com "Child process | Node.js v25.4.0 Documentation"
[5]: https://github.com/sindresorhus/execa/blob/main/docs/errors.md?utm_source=chatgpt.com "execa/docs/errors.md at main"
[6]: https://github.com/sindresorhus/execa/issues/13?utm_source=chatgpt.com "`reject` option · Issue #13 · sindresorhus/execa"
[7]: https://stackoverflow.com/questions/60174877/how-do-i-execute-a-seria-of-commands-with-execa?utm_source=chatgpt.com "How do I execute a seria of commands with execa?"
