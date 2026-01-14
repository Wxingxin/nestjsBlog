下面给你一份 **npm 包 `ansi-colors` 的【常见 API 全量清单 + 用法示例 + 速查表】**。
这是 **Node.js / CLI 工具开发中非常核心的终端美化库**，你问这个说明你已经开始写**工程级脚本**了 👍

---

# 一、ansi-colors 是什么（一句话）

> **`ansi-colors` 是一个用于给终端字符串添加颜色、样式的轻量级库**

特点：

* 🚀 极轻量、无依赖
* 🎨 支持 16 色 + 样式 + 链式调用
* 🧠 不会污染字符串（可安全拼接）
* 📦 被大量 CLI 工具使用（如 lint / build 工具）

---

# 二、安装与基本使用

```bash
npm install ansi-colors
```

```js
const c = require('ansi-colors');

console.log(c.red('error'));
console.log(c.green('success'));
console.log(c.bold.blue('info'));
```

---

# 三、颜色 API（前景色）【最常用】

## 🎨 基础 8 色

```js
c.black(text)
c.red(text)
c.green(text)
c.yellow(text)
c.blue(text)
c.magenta(text)
c.cyan(text)
c.white(text)
```

示例：

```js
console.log(c.red('错误'));
console.log(c.green('成功'));
```

---

## 🎨 亮色（Bright）

```js
c.gray(text)
c.grey(text)
c.redBright(text)
c.greenBright(text)
c.yellowBright(text)
c.blueBright(text)
c.magentaBright(text)
c.cyanBright(text)
c.whiteBright(text)
```

示例：

```js
console.log(c.yellowBright('警告'));
```

---

# 四、背景色 API（Background）

```js
c.bgBlack(text)
c.bgRed(text)
c.bgGreen(text)
c.bgYellow(text)
c.bgBlue(text)
c.bgMagenta(text)
c.bgCyan(text)
c.bgWhite(text)
```

### 亮色背景

```js
c.bgRedBright(text)
c.bgGreenBright(text)
c.bgYellowBright(text)
c.bgBlueBright(text)
c.bgMagentaBright(text)
c.bgCyanBright(text)
c.bgWhiteBright(text)
```

示例：

```js
console.log(c.bgRed.white(' ERROR '));
```

---

# 五、文本样式 API（非常重要）

```js
c.bold(text)        // 加粗
c.dim(text)         // 暗淡
c.italic(text)      // 斜体
c.underline(text)   // 下划线
c.inverse(text)     // 前景/背景反转
c.hidden(text)      // 隐藏
c.strikethrough(text) // 删除线
```

示例：

```js
console.log(c.bold.underline('标题'));
```

---

# 六、组合 & 链式调用（核心能力）

## ✅ 链式写法（推荐）

```js
c.bold.red('Error')
c.bgBlue.white.bold(' INFO ')
```

## ✅ 嵌套写法

```js
c.red(`错误：${c.bold('文件不存在')}`)
```

---

# 七、状态检测 & 工具 API（工程级）

## 1️⃣ 是否支持颜色

```js
c.enabled
```

示例：

```js
if (c.enabled) {
  console.log(c.green('支持颜色'));
}
```

---

## 2️⃣ 手动开关颜色

```js
c.enable()
c.disable()
```

```js
c.disable();
console.log(c.red('不会有颜色'));
```

---

## 3️⃣ 重置样式

```js
c.reset(text)
```

```js
console.log(c.red('error') + c.reset(' normal'));
```

---

# 八、symbols（符号支持）

```js
c.symbols.check
c.symbols.cross
c.symbols.info
c.symbols.warning
```

示例：

```js
console.log(c.green(c.symbols.check), '成功');
console.log(c.red(c.symbols.cross), '失败');
```

---

# 九、常见 CLI 场景示例（非常实用）

## ✅ 成功 / 警告 / 错误日志

```js
function logSuccess(msg) {
  console.log(c.green('✔'), msg);
}

function logWarn(msg) {
  console.log(c.yellow('⚠'), msg);
}

function logError(msg) {
  console.log(c.red('✖'), msg);
}
```

---

## ✅ 构建进度输出

```js
console.log(c.cyan('Building...'));
console.log(c.greenBright('✔ Build success'));
```

---

## ✅ 高亮关键信息

```js
console.log(
  `Build time: ${c.bold.yellow('1.2s')}`
);
```

---

# 十、ansi-colors vs chalk（你一定会问）

| 对比项    | ansi-colors | chalk |
| ------ | ----------- | ----- |
| 体积     | ✅ 更小        | ❌ 较大  |
| 速度     | ✅ 更快        | ⭕     |
| 链式调用   | ✅           | ✅     |
| 社区流行度  | ⭕           | ✅     |
| CLI 工具 | ✅ 更偏向       | ⭕     |

📌 **结论**：

> * 写 **CLI / 工具 / 脚本** → `ansi-colors`
> * 写 **应用级日志 / 展示** → `chalk`

---

# 十一、完整速查表（收藏级）

```js
// 前景
black red green yellow blue magenta cyan white
gray grey
redBright greenBright yellowBright blueBright magentaBright cyanBright whiteBright

// 背景
bgBlack bgRed bgGreen bgYellow bgBlue bgMagenta bgCyan bgWhite
bgRedBright bgGreenBright bgYellowBright bgBlueBright bgMagentaBright bgCyanBright bgWhiteBright

// 样式
bold dim italic underline inverse hidden strikethrough

// 工具
reset enable disable enabled
symbols
```

---

# 十二、给你的实战建议（直说）

你如果正在做这些事👇，**ansi-colors 是正确选择**：

* 写 npm CLI 工具
* 写构建脚本 / 发布脚本
* 写工程日志（eslint / build / test）

下一步你可以继续深入的方向：

1️⃣ **Commander / yargs + ansi-colors（CLI 框架）**
2️⃣ **ora（加载动画）+ ansi-colors**
3️⃣ **日志等级系统（info / warn / error）封装**

如果你愿意，我可以直接帮你：

* 🔥 写一个完整 npm CLI 示例
* 🔥 封装一个工程级 logger
* 🔥 对比 `ansi-colors / chalk / kleur`

你选一个，我继续往工程级带你。
