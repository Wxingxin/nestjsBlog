下面给你一份**`commander` 的常见使用大全**，我会按**从 0 到实战**来讲，重点放在**真实 CLI / 脚手架（create-xxx）里你一定会用到的能力**，并且会和你前面学的 `minimist` 做**定位对比**。

---

# 一、commander 是什么？解决什么问题？

`commander` 是一个**完整的命令行框架**，不是只做参数解析。

它帮你一口气解决：

| 能力      | minimist | commander |
| ------- | -------- | --------- |
| 参数解析    | ✅        | ✅         |
| 子命令     | ❌        | ✅         |
| help 文档 | ❌        | ✅（自动）     |
| version | ❌        | ✅         |
| 参数校验    | ❌        | ✅         |
| 命令结构化   | ❌        | ✅         |

👉 **一句话**：
**minimist = 底层解析器**
**commander = CLI 框架**

---

# 二、安装 & 最小可运行示例

## 1️⃣ 安装

```bash
npm install commander
```

---

## 2️⃣ 最简单示例（必会）

```js
#!/usr/bin/env node
import { Command } from 'commander';

const program = new Command();

program
  .name('my-cli')
  .description('My first CLI')
  .version('1.0.0');

program.parse();
```

运行：

```bash
node index.js --help
```

自动生成：

```text
Usage: my-cli [options]

Options:
  -V, --version  output the version number
  -h, --help     display help for command
```

📌 **重点认知**

* `program.parse()`：CLI 入口（必须）
* `--help / --version`：自动生成

---

# 三、option（参数）使用大全（核心）

## 1️⃣ 基本 option

```js
program
  .option('-p, --port <number>', 'server port');
```

```bash
node index.js --port 3000
```

```js
const options = program.opts();
console.log(options.port); // '3000'
```

📌 **默认是字符串**

---

## 2️⃣ 布尔 option（flag）

```js
program
  .option('-w, --watch', 'watch mode');
```

```bash
node index.js --watch
```

```js
options.watch // true
```

---

## 3️⃣ 默认值

```js
program
  .option('-p, --port <number>', 'server port', '3000');
```

---

## 4️⃣ 自动类型转换（强烈推荐）

```js
program
  .option(
    '-p, --port <number>',
    'server port',
    value => Number(value),
    3000
  );
```

```js
options.port // number
```

---

## 5️⃣ 必填参数（required）

```js
program
  .requiredOption('-e, --env <env>', 'environment');
```

❌ 没传会直接报错：

```text
error: required option '-e, --env <env>' not specified
```

---

## 6️⃣ 可选参数（optional value）

```js
program
  .option('--config [path]', 'config file');
```

```bash
--config        // true
--config foo.js // 'foo.js'
```

---

# 四、子命令（command）——脚手架灵魂

## 1️⃣ 基本子命令

```js
program
  .command('create <project-name>')
  .description('create a new project')
  .action((projectName) => {
    console.log('create', projectName);
  });
```

```bash
node index.js create my-app
```

输出：

```text
create my-app
```

---

## 2️⃣ 子命令 + 参数

```js
program
  .command('create <project-name>')
  .option('-t, --template <template>', 'project template')
  .action((projectName, options) => {
    console.log(projectName);
    console.log(options.template);
  });
```

```bash
node index.js create my-app --template react
```

---

## 3️⃣ 多子命令结构（真实项目）

```js
program
  .command('dev')
  .description('start dev server')
  .action(() => {});

program
  .command('build')
  .description('build project')
  .action(() => {});
```

```bash
my-cli dev
my-cli build
```

📌 **这就是 vite / next / flutter cli 的结构**

---

# 五、帮助文档（help）高级定制

## 1️⃣ 自动 help（默认）

```bash
--help
```

---

## 2️⃣ 自定义 help 文案

```js
program
  .addHelpText('after', `
Examples:
  my-cli create my-app
  my-cli dev
`);
```

---

## 3️⃣ 隐藏 option

```js
.option('--secret', 'hidden option', { hidden: true })
```

---

# 六、version & name（标准化）

```js
program
  .name('create-xxx')
  .version('1.2.3', '-v, --version', 'output version');
```

```bash
create-xxx -v
```

---

# 七、错误处理（专业 CLI 必做）

## 1️⃣ 未知命令

```js
program.on('command:*', () => {
  console.error('Unknown command');
  process.exit(1);
});
```

---

## 2️⃣ 参数校验失败

```js
.option(
  '-p, --port <number>',
  'port',
  value => {
    const n = Number(value);
    if (isNaN(n)) {
      throw new Error('port must be a number');
    }
    return n;
  }
)
```

---

# 八、完整 CLI 模板（你可以直接用）

```js
#!/usr/bin/env node
import { Command } from 'commander';

const program = new Command();

program
  .name('create-demo')
  .description('Demo CLI')
  .version('1.0.0');

program
  .command('create <name>')
  .option('-t, --template <template>', 'template', 'react')
  .action((name, options) => {
    console.log('Project:', name);
    console.log('Template:', options.template);
  });

program.parse();
```

---

# 九、commander vs minimist（核心对比）

| 场景                | 推荐        |
| ----------------- | --------- |
| 简单脚本              | minimist  |
| 正式 CLI            | commander |
| create-xxx 脚手架    | commander |
| 需要 help / version | commander |
| 极简解析              | minimist  |

👉 **真实项目中**：

* 90% 用 **commander**
* 只有极底层工具才直接用 minimist

---

# 十、commander 的真实生态组合

常见搭配：

* `commander` → 命令结构
* `prompts` → 交互选择
* `chalk / picocolors` → 颜色
* `ora` → loading
* `fs-extra` → 文件操作

👉 **create-vite = commander + prompts + fs**

---

# 十一、你现在最值得练的 3 个点（直说重点）

1️⃣ 子命令 `create <name>`
2️⃣ option + 默认值 + 校验
3️⃣ `--help` 输出是否专业

如果你愿意，下一步我可以直接帮你：

* ✅ **用 commander + prompts 写一个完整 create-vite 风格脚手架**
* ✅ **把 minimist 写的 CLI 重构成 commander**
* ✅ **讲 commander 的源码设计思路（为什么这样设计）**

你点一个，我直接给你实战级代码。
