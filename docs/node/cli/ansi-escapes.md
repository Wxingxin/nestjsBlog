下面给你一份 **`ansi-escapes` 常见知识点 + 使用大全**，按「是什么 → 能干什么 → 常用 API → 经典示例 → 常见使用场景 → 易踩坑」的结构来讲，适合你这种**经常写 CLI / Node.js 工具 / 终端程序**的使用场景。

---

## 一、ansi-escapes 是什么？

**`ansi-escapes`** 是一个 **Node.js 库**，用于生成 **ANSI Escape Codes（转义序列）**，从而**控制终端的光标、屏幕、文本显示效果**。

一句话总结：

> `ansi-escapes` = 帮你优雅地控制「终端屏幕和光标」

它 **不负责输出**，只负责 **返回字符串**，你自己 `console.log` / `process.stdout.write`。

---

## 二、ANSI Escape Codes 基础认知（重要）

ANSI 转义序列的基本形式：

```text
\x1B[指令
```

* `\x1B` = ESC（ASCII 27）
* `[ ` = 控制符开始
* 后面跟 **参数 + 字母命令**

例如：

```text
\x1B[2J   // 清屏
\x1B[H    // 光标回到左上角
```

`ansi-escapes` 的作用就是：
👉 **不用你手写这些鬼东西**

---

## 三、安装与基本使用

### 1️⃣ 安装

```bash
npm install ansi-escapes
```

---

### 2️⃣ 基本引入

```js
import ansiEscapes from 'ansi-escapes';
// 或
const ansiEscapes = require('ansi-escapes');
```

---

### 3️⃣ 最基本示例

```js
process.stdout.write(ansiEscapes.clearScreen);
```

---

## 四、核心 API 分类大全（重点）

---

## 1️⃣ 屏幕控制（Screen）

### 🔹 清空屏幕

```js
ansiEscapes.clearScreen
```

```js
process.stdout.write(ansiEscapes.clearScreen);
```

📌 等价于：

```bash
clear
```

---

### 🔹 清空当前行

```js
ansiEscapes.eraseLine
```

```js
process.stdout.write(ansiEscapes.eraseLine);
```

---

### 🔹 清空光标到行尾

```js
ansiEscapes.eraseEndLine
```

---

### 🔹 清空光标到行首

```js
ansiEscapes.eraseStartLine
```

---

## 2️⃣ 光标控制（Cursor）⭐ CLI 核心

### 🔹 光标上 / 下 / 左 / 右移动

```js
ansiEscapes.cursorUp(n)
ansiEscapes.cursorDown(n)
ansiEscapes.cursorLeft(n)
ansiEscapes.cursorRight(n)
```

示例：

```js
process.stdout.write(ansiEscapes.cursorUp(2));
```

---

### 🔹 光标定位到指定坐标（非常常用）

```js
ansiEscapes.cursorTo(x, y);
```

* `x`：列（从 0 开始）
* `y`：行（从 0 开始）

```js
process.stdout.write(ansiEscapes.cursorTo(0, 0));
process.stdout.write('左上角');
```

---

### 🔹 光标回到行首

```js
ansiEscapes.cursorLeft
```

---

### 🔹 保存 / 恢复光标位置

```js
ansiEscapes.cursorSavePosition
ansiEscapes.cursorRestorePosition
```

示例：

```js
process.stdout.write(ansiEscapes.cursorSavePosition);
process.stdout.write('处理中...');
setTimeout(() => {
  process.stdout.write(ansiEscapes.cursorRestorePosition);
  process.stdout.write('完成');
}, 1000);
```

---

## 3️⃣ 文本样式（Style）

⚠️ **ansi-escapes 主要负责“控制”，不是样式库**
文本颜色、加粗通常配合：

* `chalk`
* `kleur`
* `colorette`

但它也提供 **隐藏 / 显示光标** 这种特殊控制。

---

### 🔹 隐藏 / 显示光标（非常重要）

```js
ansiEscapes.cursorHide
ansiEscapes.cursorShow
```

经典进度条用法：

```js
process.stdout.write(ansiEscapes.cursorHide);

// 程序结束前一定要恢复
process.on('exit', () => {
  process.stdout.write(ansiEscapes.cursorShow);
});
```

---

## 4️⃣ 滚动与缓冲区

### 🔹 向上滚动屏幕

```js
ansiEscapes.scrollUp(n)
```

---

### 🔹 向下滚动屏幕

```js
ansiEscapes.scrollDown(n)
```

---

## 五、经典使用场景（非常重要）

---

## 场景 1：CLI 实时刷新（进度条）

```js
import ansiEscapes from 'ansi-escapes';

let percent = 0;

const timer = setInterval(() => {
  percent += 5;

  process.stdout.write(
    ansiEscapes.cursorTo(0) +
    ansiEscapes.eraseLine +
    `进度：${percent}%`
  );

  if (percent >= 100) {
    clearInterval(timer);
    process.stdout.write('\n完成\n');
  }
}, 200);
```

---

## 场景 2：模拟 Loading 动画

```js
const frames = ['-', '\\', '|', '/'];
let i = 0;

setInterval(() => {
  process.stdout.write(
    ansiEscapes.cursorTo(0) +
    frames[i++ % frames.length] +
    ' Loading...'
  );
}, 100);
```

---

## 场景 3：多行 CLI 面板（Dashboard）

```js
process.stdout.write(ansiEscapes.clearScreen);

setInterval(() => {
  process.stdout.write(
    ansiEscapes.cursorTo(0, 0) +
    'CPU: 20%\n' +
    'Memory: 512MB\n' +
    'Status: OK'
  );
}, 1000);
```

---

## 场景 4：与 `chalk` 配合使用（推荐）

```js
import chalk from 'chalk';
import ansiEscapes from 'ansi-escapes';

process.stdout.write(
  ansiEscapes.cursorTo(0) +
  chalk.green('✔ 成功')
);
```

---

## 六、常见坑 & 注意事项（必看）

### ❌ 1. 忘记恢复光标

```js
cursorHide 之后一定要 cursorShow
```

否则终端光标会“消失”。

---

### ❌ 2. 使用 console.log 导致换行错乱

推荐：

```js
process.stdout.write()
```

而不是：

```js
console.log()
```

---

### ❌ 3. Windows 兼容性

* 新版 Windows Terminal、PowerShell、WSL ✅
* 老版 cmd ❌（可能不支持）

---

### ❌ 4. 不要手写 ANSI 转义码

```js
// ❌ 不推荐
process.stdout.write('\x1B[2J');

// ✅ 推荐
process.stdout.write(ansiEscapes.clearScreen);
```

---

## 七、ansi-escapes vs 相关库对比

| 库             | 作用              |
| ------------- | --------------- |
| ansi-escapes  | 光标 / 屏幕控制       |
| chalk         | 颜色 / 样式         |
| cli-progress  | 进度条             |
| ora           | Loading spinner |
| blessed / ink | 高级终端 UI         |

📌 **你现在这个水平**：
👉 `ansi-escapes + chalk + cli-progress` 是最优组合

---

## 八、适合你的进阶方向（结合你当前学习）

你现在已经用过 `cli-progress`，非常建议你：

1. **手写一个 mini 进度条**
2. **手写 loading spinner**
3. **做一个 CLI Dashboard**
4. 用在：

   * Node CLI 工具
   * 构建工具
   * 脚手架（类似 create-vite）

---

如果你愿意，下一步我可以帮你：

* ✅ **手写一个完整的 CLI 进度条（不用 cli-progress）**
* ✅ **封装一个 Spinner 类**
* ✅ **做一个多行状态监控 CLI**
* ✅ **对比 ansi-escapes vs readline**

你可以直接说：
👉「给我一个基于 ansi-escapes 的完整 CLI Demo」
