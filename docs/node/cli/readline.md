下面这份就是你要的：**用键盘控制 CLI** 时，Node.js `readline`（`import readline from 'node:readline'`）最常见、最实战的一套用法大全（含可直接运行代码）。

> 说明：以下示例默认 **Node 18+ / 20+**，ESM 写法（`type: module` 或 `.mjs`）。

---

## 0）最关键的两件事：两种交互模式

1. **行模式（line-based）**：用户敲完一行按回车才触发（最常用）
   用 `readline.createInterface()` + `rl.question()` / `rl.on('line')`

2. **按键模式（key-based / raw mode）**：逐字符、方向键、Ctrl 快捷键即时响应（做“键盘控制”必备）
   用 `readline.emitKeypressEvents(process.stdin)` + `process.stdin.setRawMode(true)` + `stdin.on('keypress')`

你问的“通过键盘控制 cli”，核心就是第 2 种。

---

## 1）最基础：读一行输入（回车触发）

适合：普通问答、收集参数。

```js
import readline from 'node:readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('请输入你的名字：', (answer) => {
  console.log(`你好，${answer}`);
  rl.close();
});
```

常用事件：

```js
rl.on('line', (line) => console.log('你输入了：', line));
rl.on('close', () => console.log('bye'));
```

---

## 2）核心：逐按键监听（方向键 / Ctrl / ESC / Enter）

适合：做 TUI、用键盘控制菜单、游戏式交互。

```js
import readline from 'node:readline';

readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) process.stdin.setRawMode(true);

console.log('按键监听开启：WASD移动，Enter确认，Ctrl+C退出');

process.stdin.on('keypress', (str, key) => {
  // str：按下的字符（比如 "a"）
  // key：按键信息（name/ctrl/meta/shift/sequence）

  if (key.ctrl && key.name === 'c') {
    console.log('\n收到 Ctrl+C，退出');
    process.exit(0);
  }

  if (key.name === 'return') console.log('✅ Enter');
  else if (key.name === 'escape') console.log('⛔ ESC');
  else if (key.name === 'up') console.log('⬆️ 上');
  else if (key.name === 'down') console.log('⬇️ 下');
  else if (key.name === 'left') console.log('⬅️ 左');
  else if (key.name === 'right') console.log('➡️ 右');
  else console.log(`你按了: "${str}"`, key);
});
```

你会最常用的 `key` 字段：

* `key.name`：`up/down/left/right/return/backspace/tab/escape`、字母数字等
* `key.ctrl / key.meta / key.shift`：组合键判断
* `key.sequence`：原始序列（很少需要，但调试时好用）

---

## 3）实现“键盘控制菜单”（上下选择 + 回车确认）

这就是最常见的 CLI 交互效果。

```js
import readline from 'node:readline';

readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) process.stdin.setRawMode(true);

const items = ['开始', '设置', '帮助', '退出'];
let idx = 0;

function render() {
  // 清屏并把光标移到左上角
  process.stdout.write('\x1b[2J\x1b[0f');
  console.log('用 ↑ ↓ 选择，Enter 确认，Esc 退出\n');

  items.forEach((it, i) => {
    const prefix = i === idx ? '👉 ' : '   ';
    console.log(prefix + it);
  });
}

render();

process.stdin.on('keypress', (str, key) => {
  if (key.ctrl && key.name === 'c') process.exit(0);
  if (key.name === 'escape') process.exit(0);

  if (key.name === 'up') idx = (idx - 1 + items.length) % items.length;
  if (key.name === 'down') idx = (idx + 1) % items.length;

  if (key.name === 'return') {
    const chosen = items[idx];
    process.stdout.write('\n你选择了：' + chosen + '\n');
    if (chosen === '退出') process.exit(0);
  }

  render();
});
```

## 4）编辑当前输入行（不回车也能改）：`rl.write / rl.prompt`

如果你既想要 `readline` 的输入编辑能力，又想要按键控制，比如：按 F1 自动填充命令。

```js
import readline from 'node:readline';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
readline.emitKeypressEvents(process.stdin, rl);
if (process.stdin.isTTY) process.stdin.setRawMode(true);

rl.setPrompt('> ');
rl.prompt();

process.stdin.on('keypress', (str, key) => {
  if (key.ctrl && key.name === 'c') process.exit(0);

  // 按 Tab 自动补一段
  if (key.name === 'tab') {
    rl.write(' --help');
  }

  // 按 Ctrl+L 清屏并保留当前输入
  if (key.ctrl && key.name === 'l') {
    console.clear();
    rl.prompt(true);
  }
});

rl.on('line', (line) => {
  console.log('执行命令：', line);
  rl.prompt();
});
```

---

## 5）历史记录（history）与最大长度

```js
rl.historySize = 100;          // 允许的历史条数（有版本差异）
rl.history = ['help', 'quit']; // 预置历史（可选）
```

更常见的做法：你自己读写一个 `.history` 文件，然后启动时塞给 `rl.history`。

---

## 6）自动补全（completer）

`readline` 原生就支持补全：按 Tab 触发。

```js
import readline from 'node:readline';

const commands = ['help', 'exit', 'start', 'status', 'set'];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  completer: (line) => {
    const hits = commands.filter(c => c.startsWith(line));
    return [hits.length ? hits : commands, line];
  }
});

rl.setPrompt('> ');
rl.prompt();

rl.on('line', (line) => {
  if (line === 'exit') rl.close();
  else console.log('你输入：', line);
  rl.prompt();
});
```

---

## 7）隐藏输入（密码输入）

做登录/密钥输入时很常用（注意：实现方式不是特别“官方”，但很常见）。

```js
import readline from 'node:readline';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('Password: ', (pwd) => {
  console.log('\n长度：', pwd.length);
  rl.close();
});

// 关键：把输出改成不显示真实字符（简化版）
rl._writeToOutput = function _writeToOutput(stringToWrite) {
  if (rl.stdoutMuted) rl.output.write('*');
  else rl.output.write(stringToWrite);
};
rl.stdoutMuted = true;
```

---

## 8）和进度条/日志共存（不把界面弄乱）

你之前学了 `cli-progress`，现实里经常要“进度条 + 键盘控制 + 输出日志”。关键点：

* 不要到处 `console.log` 把进度条冲散
* 用 `readline.clearLine`、`readline.cursorTo` 管理输出位置

示例（简化）：

```js
import readline from 'node:readline';

function logAbove(msg) {
  // 清掉当前行，移到行首，打印，再回到提示符
  readline.clearLine(process.stdout, 0);
  readline.cursorTo(process.stdout, 0);
  process.stdout.write(msg + '\n');
}

logAbove('开始任务...');
```

如果你用 `cli-progress` 的 `MultiBar`，它自带 `multibar.log()` 更省心。

---

## 9）退出时一定要恢复终端状态（rawMode / rl.close）

做键盘控制时最常见的坑：你开了 raw mode 忘了关，终端会怪怪的。

建议写个统一 cleanup：

```js
function cleanupAndExit(code = 0) {
  try {
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
  } catch {}
  process.stdin.pause();
  process.exit(code);
}

process.on('SIGINT', () => cleanupAndExit(0)); // Ctrl+C
```

---

## 10）你实际开发最常用的一套“模板”

你可以直接把它当你的 CLI 入口脚手架：

* `rl` 负责命令行编辑与输入
* `keypress` 负责快捷键（Ctrl+L 清屏、Tab 补全、ESC 退出）
* `cleanup` 保证终端不坏

```js
import readline from 'node:readline';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

readline.emitKeypressEvents(process.stdin, rl);
if (process.stdin.isTTY) process.stdin.setRawMode(true);

function cleanupAndExit(code = 0) {
  try { if (process.stdin.isTTY) process.stdin.setRawMode(false); } catch {}
  rl.close();
  process.exit(code);
}

rl.setPrompt('> ');
rl.prompt();

process.stdin.on('keypress', (str, key) => {
  if (key.ctrl && key.name === 'c') cleanupAndExit(0);
  if (key.name === 'escape') cleanupAndExit(0);

  if (key.ctrl && key.name === 'l') {
    console.clear();
    rl.prompt(true);
  }

  if (key.name === 'tab') {
    rl.write('help'); // 例：自动填充
  }
});

rl.on('line', (line) => {
  const cmd = line.trim();
  if (!cmd) return rl.prompt();

  if (cmd === 'exit') return cleanupAndExit(0);
  if (cmd === 'help') console.log('可用命令：help, exit');

  rl.prompt();
});
```

---

如果你告诉我你想做的 CLI 类型（比如：**菜单选择**、**命令解析**、**下载器带进度条**、还是 **Todo/TUI 面板**），我可以直接给你一份“成品级”的结构：包含输入系统、渲染层、状态机、以及和 `cli-progress` 不打架的输出策略。


下面给你一份 **Node.js `node:readline` 模块的配置与使用大全**，按“概念 → API → 常见配置 → 高级用法 → 实战模式 → 常见坑”的结构来讲，适合 **CLI / 交互式命令行工具** 场景。

---

# 一、`readline` 是什么？解决什么问题

`node:readline` 用于：

* 从 **标准输入（stdin）** 逐行读取用户输入
* 构建 **交互式命令行（CLI）**
* 支持：

  * 提示符（prompt）
  * 回答问题（question）
  * 命令补全（tab 补全）
  * 历史记录（history）
  * 光标控制（移动、清屏）

典型使用场景：

* npm / pnpm / git 这类 CLI
* 后端脚本交互
* 本地工具（初始化项目、输入配置）

---

# 二、基础使用（最小可用示例）

```js
import readline from "node:readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("你的名字是？ ", (answer) => {
  console.log("你好：", answer);
  rl.close();
});
```

---

# 三、`createInterface` 配置项大全（核心）

```ts
readline.createInterface(options)
```

### 完整配置项

```ts
interface InterfaceOptions {
  input: NodeJS.ReadableStream;        // 必填：输入流（通常是 stdin）
  output?: NodeJS.WritableStream;       // 输出流（stdout）
  prompt?: string;                      // 提示符
  terminal?: boolean;                   // 是否为 TTY 终端
  completer?: Completer;                // 自动补全函数
  historySize?: number;                 // 历史记录条数
  removeHistoryDuplicates?: boolean;    // 去重历史
  crlfDelay?: number;                   // CRLF 处理延迟
  escapeCodeTimeout?: number;           // ESC 序列超时
  tabSize?: number;                     // tab 宽度（Node 20+）
}
```

---

## 1️⃣ input（必填）

```js
input: process.stdin
```

* 可替换为文件流、socket 流
* CLI 基本固定是 `stdin`

---

## 2️⃣ output

```js
output: process.stdout
```

* 如果不传：

  * 不能显示 prompt
  * 不能编辑输入
* 只读输入（如管道）时可以省略

---

## 3️⃣ terminal（非常重要）

```js
terminal: true
```

含义：

* 是否启用 **TTY 模式**
* 影响：

  * 光标移动
  * 行编辑
  * 方向键
  * tab 补全

推荐写法：

```js
terminal: process.stdin.isTTY
```

---

## 4️⃣ prompt（提示符）

```js
prompt: "> "
```

配合：

```js
rl.prompt();
```

示例：

```js
rl.setPrompt("my-cli> ");
rl.prompt();
```

---

## 5️⃣ historySize（历史命令）

```js
historySize: 1000
```

* ↑ ↓ 可切换历史
* 默认：30
* 设为 `0` → 禁用历史

---

## 6️⃣ removeHistoryDuplicates

```js
removeHistoryDuplicates: true
```

* 避免同一命令多次进入历史
* CLI 工具推荐开启

---

## 7️⃣ completer（Tab 自动补全）

```js
completer: (line) => {
  const commands = ["start", "build", "test", "exit"];
  const hits = commands.filter(c => c.startsWith(line));
  return [hits.length ? hits : commands, line];
}
```

返回值格式：

```ts
[string[], string]
```

---

## 8️⃣ crlfDelay（跨平台）

```js
crlfDelay: Infinity
```

* 解决 Windows `\r\n` 被当成两行的问题
* **推荐固定写**

---

## 9️⃣ escapeCodeTimeout（高级）

```js
escapeCodeTimeout: 50
```

* ESC 键序列识别超时
* 通常不用改

---

# 四、Interface 实例方法大全

## 1️⃣ `rl.question()`

```js
rl.question("请输入：", (answer) => {});
```

特点：

* 一次性
* 内部自动暂停/恢复 stdin
* **不适合复杂 CLI**

---

## 2️⃣ `rl.on('line')`（CLI 标配）

```js
rl.on("line", (line) => {
  console.log("输入内容：", line);
  rl.prompt();
});
```

---

## 3️⃣ `rl.prompt()`

```js
rl.prompt();
```

* 显示 prompt
* 常在：

  * 初始化
  * 每次 `line` 处理后调用

---

## 4️⃣ `rl.setPrompt()`

```js
rl.setPrompt("app> ");
```

---

## 5️⃣ `rl.close()`

```js
rl.close();
```

触发：

```js
rl.on("close", () => {
  console.log("Bye");
  process.exit(0);
});
```

---

## 6️⃣ `rl.pause()` / `rl.resume()`

```js
rl.pause();   // 暂停读取
rl.resume();  // 继续读取
```

---

## 7️⃣ `rl.clearLine()` / `rl.clearScreenDown()`

```js
rl.clearLine(process.stdout, 0);
rl.clearScreenDown(process.stdout);
```

用于：

* 刷新进度
* 清理界面

---

## 8️⃣ `rl.write()`

```js
rl.write("预填充内容");
```

---

# 五、事件大全

```js
rl.on("line", cb);      // 输入一行
rl.on("pause", cb);
rl.on("resume", cb);
rl.on("close", cb);
rl.on("SIGINT", cb);   // Ctrl + C
```

### Ctrl + C 处理（非常重要）

```js
rl.on("SIGINT", () => {
  console.log("\n使用 exit 退出");
  rl.prompt();
});
```

---

# 六、Promise / async 写法（Node 17+）

```js
import readline from "node:readline/promises";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const name = await rl.question("你的名字： ");
console.log(name);
rl.close();
```

适合：

* 初始化脚本
* 一次性配置向导

---

# 七、完整 CLI 实战模板（推荐直接用）

```js
import readline from "node:readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: process.stdin.isTTY,
  prompt: "my-cli> ",
  historySize: 500,
  removeHistoryDuplicates: true,
  crlfDelay: Infinity,
  completer(line) {
    const cmds = ["help", "start", "status", "exit"];
    const hits = cmds.filter(c => c.startsWith(line));
    return [hits.length ? hits : cmds, line];
  }
});

console.log("欢迎使用 my-cli");
rl.prompt();

rl.on("line", (line) => {
  const cmd = line.trim();

  switch (cmd) {
    case "help":
      console.log("可用命令：help start status exit");
      break;
    case "exit":
      rl.close();
      return;
    default:
      console.log("未知命令：", cmd);
  }

  rl.prompt();
});

rl.on("close", () => {
  console.log("再见");
  process.exit(0);
});
```

---

# 八、常见坑与最佳实践

### ❌ 1. 忘了 `rl.prompt()`

* 表现：输入一次后不再显示提示符

### ❌ 2. CI / 管道模式死等输入

* 解决：

```js
if (!process.stdin.isTTY) {
  // 非交互模式
}
```

### ❌ 3. `question` + `line` 混用

* 会造成逻辑混乱
* CLI 建议只用 `line`

### ✅ 最佳实践总结

* 初始化脚本 → `readline/promises + question`
* 常驻 CLI → `createInterface + line + prompt`
* 永远加：

  * `crlfDelay: Infinity`
  * `terminal: process.stdin.isTTY`

---

如果你愿意，我可以 **下一步直接帮你**：

* 把 `readline + chalk + ora` 组合成一套 **企业级 CLI 基础架构**
* 或给你做一个 **仿 npm / pnpm 的交互式命令行 demo**
* 或结合你之前的 **Express / Node 项目**，做一个初始化脚本（`init` 向导）

你告诉我你是 **写 CLI 工具**，还是 **项目初始化脚本**，我直接给你成套方案。
