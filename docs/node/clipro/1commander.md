下面按“在真实 CLI 项目里最常见的用法”把 Commander（node + commander）系统梳理一遍，并给出可直接复用的代码片段与对应知识点。示例默认 ESM（`"type":"module"`），你用 CJS 也可以（我会注明差异点）。

---

## 1) 最小可用骨架（入口、可执行、版本、帮助）

**知识点**

* CLI 入口文件需要 shebang：`#!/usr/bin/env node`
* `program.name()` / `description()` / `version()` 负责帮助信息的“头部元数据”
* `program.parse(process.argv)` 或 `program.parseAsync(process.argv)` 触发解析
* 常见做法：在 `package.json` 配置 `bin` 映射命令名

**代码**

```js
#!/usr/bin/env node
import { Command } from "commander";

const program = new Command();

program
  .name("mycli")
  .description("A demo CLI powered by commander")
  .version("1.0.0", "-v, --version", "output the current version");

program.parse(process.argv);
```

**package.json（关键配置）**

```json
{
  "name": "mycli",
  "type": "module",
  "bin": {
    "mycli": "bin/mycli.js"
  }
}
```

---

## 2) 全局选项 vs 子命令选项（实际项目最常踩坑）

**知识点**

* 全局选项：挂在 `program` 上，通常用于 `--verbose`、`--config`、`--cwd` 等
* 子命令选项：挂在 `program.command('xxx')` 返回的 command 上
* **重要**：子命令是否能“看到”父命令的选项，取决于 `.passThroughOptions()`、`.enablePositionalOptions()` 等配置以及你如何读取（常用 `cmd.opts()` / `cmd.parent?.opts()`）

**代码**

```js
import { Command } from "commander";
const program = new Command();

program
  .name("mycli")
  .option("-d, --debug", "enable debug logs")
  .option("-c, --config <path>", "config file path", "./mycli.config.json");

program
  .command("init")
  .description("initialize a project")
  .option("--force", "overwrite existing files")
  .action((options, command) => {
    const globalOpts = command.parent?.opts() ?? {};
    if (globalOpts.debug) console.log("[debug] global opts:", globalOpts);
    console.log("init opts:", options);
  });

program.parse(process.argv);
```

---

## 3) 参数（arguments）与必选/可选、变长参数

**知识点**

* `<arg>` 必选参数，`[arg]` 可选参数
* `command.argument("<name>")` 推荐方式（较新 API），也可用 `.arguments()`
* 变长参数：`<files...>`（最后一个参数才能使用 `...`）
* 参数与选项的区别：参数是位置敏感（positional），选项是标志（flag）

**代码**

```js
program
  .command("add")
  .description("add items")
  .argument("<title>", "item title")
  .argument("[tags...]", "optional tags")
  .action((title, tags) => {
    console.log({ title, tags });
  });
```

---

## 4) 选项（options）大全：布尔、带值、默认值、必选、环境变量

**知识点**

* 布尔：`--dry-run`（存在即 true）
* 带值：`--port <number>` / `--host <string>`
* 默认值：`.option(..., defaultValue)`
* 必选选项：`.requiredOption(...)`
* 环境变量：Commander 本身不自动绑定环境变量，但常见模式是默认值读取 `process.env`

**代码**

```js
program
  .command("serve")
  .description("start dev server")
  .option("-p, --port <number>", "port", (v) => Number(v), Number(process.env.PORT ?? 3000))
  .option("--host <string>", "host", process.env.HOST ?? "127.0.0.1")
  .option("--dry-run", "print actions without executing")
  .requiredOption("--token <string>", "auth token (or set TOKEN env)")
  .action((opts) => {
    console.log(opts);
  });
```

---

## 5) 选项值解析与校验：自定义 parser、choices、范围检查

**知识点**

* `.option(flag, desc, parseFn, defaultValue)`：`parseFn` 用于把 string 转成 number/JSON/enum
* “choices/枚举”常见做法：在 parseFn 校验并抛错
* 抛错方式：`throw new Error("...")` 或 `program.error("...")`（更适合 CLI）

**代码（枚举 + 范围校验）**

```js
function parseMode(value) {
  const allowed = ["dev", "prod"];
  if (!allowed.includes(value)) {
    throw new Error(`--mode must be one of: ${allowed.join(", ")}`);
  }
  return value;
}

function parsePort(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 65535) {
    throw new Error("--port must be an integer between 1 and 65535");
  }
  return n;
}

program
  .command("build")
  .option("--mode <mode>", "build mode", parseMode, "prod")
  .option("--port <number>", "preview port", parsePort, 5173)
  .action((opts) => console.log(opts));
```

---

## 6) 互斥选项、依赖选项（组合约束）

**知识点**

* 互斥：`--json` 和 `--yaml` 不能同时出现
* 依赖：`--username` 必须配合 `--password`（或 token）
* Commander 没有“一行声明互斥/依赖”的强约束 API（不同版本能力不一），**实务**是解析后手动校验并 `program.error(...)`

**代码**

```js
program
  .command("export")
  .option("--json", "export as JSON")
  .option("--yaml", "export as YAML")
  .option("--out <path>", "output file")
  .action((opts, cmd) => {
    if (opts.json && opts.yaml) cmd.error("Options --json and --yaml are mutually exclusive.");
    if ((opts.json || opts.yaml) && !opts.out) cmd.error("Option --out is required when using --json/--yaml.");
  });
```

---

## 7) 子命令组织：`.command()`、`.addCommand()`、目录拆分（工程化）

**知识点**

* 小项目：直接在一个文件里写多个 `program.command(...)`
* 中大型：每个子命令一个模块文件，然后 `program.addCommand(cmd)`
* 好处：可测试、可维护、减少入口文件复杂度

**结构建议**

```
bin/mycli.js
src/commands/init.js
src/commands/build.js
src/commands/serve.js
```

**示例：src/commands/init.js**

```js
import { Command } from "commander";

export function createInitCommand() {
  const cmd = new Command("init");
  cmd
    .description("initialize project")
    .option("--force", "overwrite")
    .action((opts) => {
      console.log("init", opts);
    });
  return cmd;
}
```

**入口：bin/mycli.js**

```js
#!/usr/bin/env node
import { Command } from "commander";
import { createInitCommand } from "../src/commands/init.js";

const program = new Command();
program.name("mycli").version("1.0.0");

program.addCommand(createInitCommand());

program.parse(process.argv);
```

---

## 8) 异步 action：请求、文件 IO、spinner（parseAsync）

**知识点**

* action 返回 Promise 时，使用 `program.parseAsync(process.argv)` 以正确捕获异步错误
* 异步错误：应统一捕获并输出友好信息，设置 `process.exitCode`

**代码**

```js
program
  .command("fetch")
  .argument("<url>")
  .action(async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    const text = await res.text();
    console.log(text.slice(0, 200));
  });

await program.parseAsync(process.argv);
```

---

## 9) Hook：preAction/postAction 做全局初始化、日志、鉴权

**知识点**

* Hook 常用于：读取 config、设置日志级别、埋点、统一注入上下文
* 你可以在 hook 里拿到当前 command 与父 command

**代码**

```js
program.hook("preAction", (thisCommand, actionCommand) => {
  const g = thisCommand.opts();
  if (g.debug) console.log(`[debug] running: ${actionCommand.name()}`);
});

program.hook("postAction", (thisCommand, actionCommand) => {
  // cleanup, flush logs, etc.
});
```

---

## 10) 帮助信息定制：示例、尾部说明、错误提示更友好

**知识点**

* `.addHelpText(position, text)`：常用于增加 examples
* `.showHelpAfterError()`：错误后自动显示帮助
* `.showSuggestionAfterError()`：拼写错命令时给建议（如 `biuld` -> `build`）
* `.helpOption()` 可自定义帮助 flag

**代码**

```js
program
  .showHelpAfterError(true)
  .showSuggestionAfterError(true)
  .helpOption("-h, --help", "display help for command");

program.addHelpText("after", `
Examples:
  mycli init --force
  mycli build --mode prod
`);
```

---

## 11) 输出控制：quiet/verbose、调试日志、退出码与错误处理

**知识点**

* CLI 正确姿势：成功 `exitCode=0`，失败 `exitCode!=0`
* `console.error` 输出到 stderr；stdout 用于可管道化的数据
* `cmd.error(msg, { exitCode })` 或 `program.error(...)` 可统一退出

**代码（推荐的错误包裹）**

```js
function run(main) {
  main().catch((err) => {
    console.error(err?.message ?? err);
    process.exitCode = 1;
  });
}

run(async () => {
  await program.parseAsync(process.argv);
});
```

---

## 12) “真实项目常见功能包”组合（你做 CLI 时基本都用得到）

下面这些不是 Commander 自带，但在 Node CLI 实战里几乎是标配思路（与 Commander 配合最紧密）：

**常见组合**

* 参数交互：`inquirer` / `@inquirer/prompts`
* 彩色输出：`chalk`
* 进度与 loading：`ora`
* 文件与目录：`fs-extra`
* 配置文件：`cosmiconfig` 或自己读 JSON/YAML
* 命令执行：`execa`
* 表格输出：`cli-table3`
* 日志等级：`debug` 或自定义 logger

**知识点**

* Commander 负责“解析与路由”
* 具体业务能力交给这些库，以保持命令层干净、可测试

---

## 13) 一个更贴近“脚手架/工程 CLI”的综合示例（可直接改成你的项目）

```js
#!/usr/bin/env node
import { Command } from "commander";
import fs from "node:fs/promises";
import path from "node:path";

const program = new Command();

program
  .name("wjx-cli")
  .description("Project scaffolding & utilities")
  .version("0.1.0")
  .option("-d, --debug", "enable debug logs")
  .showHelpAfterError()
  .showSuggestionAfterError();

program
  .command("init")
  .description("create a project from template")
  .argument("<dir>", "target directory")
  .option("-t, --template <name>", "template name", "basic")
  .option("--force", "overwrite if exists")
  .action(async (dir, opts, cmd) => {
    const globalOpts = cmd.parent?.opts() ?? {};
    const target = path.resolve(process.cwd(), dir);

    if (globalOpts.debug) console.log("[debug] target:", target);

    try {
      const stat = await fs.stat(target).catch(() => null);
      if (stat && !opts.force) cmd.error(`Directory exists: ${target}. Use --force to overwrite.`, { exitCode: 2 });

      await fs.mkdir(target, { recursive: true });
      await fs.writeFile(path.join(target, "README.md"), `# ${path.basename(target)}\n`);
      console.log(`Initialized ${opts.template} template at ${target}`);
    } catch (e) {
      cmd.error(e?.message ?? String(e), { exitCode: 1 });
    }
  });

await program.parseAsync(process.argv);
```

---

如果你愿意，我可以基于你准备做的 CLI 类型（脚手架、日志工具、代码生成、部署工具等）给你一套更工程化的模板：包含命令拆分、配置加载、统一日志、错误码规范、以及测试（vitest）和发布（npm + changesets）的标准结构。你只要告诉我 CLI 的目标功能大概有哪些即可。
