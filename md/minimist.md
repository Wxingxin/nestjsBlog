下面给你一份**`minimist` 的常见使用大全**，我会从**基础 → 进阶 → 实战模式**来讲，偏向**命令行工具 / 脚手架开发**，很适合你现在学 CLI 这一条线。

---

# 一、minimist 是干什么的？

👉 **把命令行参数（`process.argv`）解析成对象**

```bash
node index.js --port 3000 --env dev
```

```js
{
  port: 3000,
  env: 'dev',
  _: []
}
```

它解决的问题是：

* 不用自己解析 `--xxx`
* 自动支持：

  * `--key value`
  * `--key=value`
  * `-abc`（短参数）
* 返回一个**结构化对象**

---

# 二、安装 & 基本使用

## 1️⃣ 安装

```bash
npm install minimist
```

---

## 2️⃣ 最基础用法

```js
import minimist from 'minimist';

const args = minimist(process.argv.slice(2));
console.log(args);
```

命令行：

```bash
node index.js --name lixin --age 18
```

输出：

```js
{
  name: 'lixin',
  age: 18,
  _: []
}
```

📌 **重点**

* `process.argv.slice(2)`：
  去掉 `node` 和脚本路径
* `_`：存放**非 key-value 的参数**

---

# 三、常见参数解析方式（必会）

## 1️⃣ 普通参数

```bash
node app.js --port 3000
```

```js
args.port // 3000
```

---

## 2️⃣ 等号形式

```bash
node app.js --port=3000
```

```js
args.port // 3000
```

---

## 3️⃣ 布尔参数（flag）

```bash
node app.js --watch
```

```js
args.watch // true
```

```bash
node app.js --no-watch
```

```js
args.watch // false
```

---

## 4️⃣ 短参数（-p）

```bash
node app.js -p 3000
```

```js
args.p // 3000
```

---

## 5️⃣ 短参数合并（-abc）

```bash
node app.js -abc
```

```js
{
  a: true,
  b: true,
  c: true
}
```

📌 常用于：

```bash
-v  # version
-h  # help
```

---

## 6️⃣ 普通参数（无 key）

```bash
node app.js build src/index.js
```

```js
args._ // ['build', 'src/index.js']
```

📌 `_` **非常重要**

👉 CLI 子命令几乎都靠它

---

# 四、默认值（defaults）

## 1️⃣ 设置默认值

```js
const args = minimist(process.argv.slice(2), {
  default: {
    port: 3000,
    env: 'production'
  }
});
```

```bash
node app.js
```

```js
{
  port: 3000,
  env: 'production',
  _: []
}
```

---

## 2️⃣ 覆盖默认值

```bash
node app.js --port 8080
```

```js
args.port // 8080
```

---

# 五、类型控制（非常重要）

## 1️⃣ 强制布尔参数

```js
const args = minimist(process.argv.slice(2), {
  boolean: ['watch', 'help']
});
```

```bash
node app.js --watch
```

```js
args.watch // true
```

```bash
node app.js --watch=false
```

```js
args.watch // false
```

---

## 2️⃣ 强制字符串参数

```js
const args = minimist(process.argv.slice(2), {
  string: ['env']
});
```

```bash
node app.js --env 123
```

```js
args.env // '123'
```

📌 防止数字被自动转换

---

## 3️⃣ 数字参数（默认行为）

```bash
node app.js --port 3000
```

```js
typeof args.port // 'number'
```

---

# 六、别名（alias）

## 1️⃣ 基本别名

```js
const args = minimist(process.argv.slice(2), {
  alias: {
    p: 'port',
    h: 'help'
  }
});
```

```bash
node app.js -p 3000
```

```js
args.port // 3000
args.p    // 3000
```

📌 **两个都能访问**

---

## 2️⃣ 多别名

```js
alias: {
  port: ['p', 'P']
}
```

---

# 七、综合配置示例（推荐模板）

```js
import minimist from 'minimist';

const args = minimist(process.argv.slice(2), {
  alias: {
    p: 'port',
    h: 'help'
  },
  boolean: ['help', 'version'],
  default: {
    port: 3000
  }
});

if (args.help) {
  console.log(`
Usage:
  my-cli [options]

Options:
  -p, --port     Server port
  -h, --help     Show help
  --version      Show version
  `);
  process.exit(0);
}

console.log(args);
```

---

# 八、CLI 子命令解析（实战重点）

```bash
my-cli create my-app --template react
```

```js
const args = minimist(process.argv.slice(2));

const [command, projectName] = args._;

console.log(command);     // create
console.log(projectName); // my-app
console.log(args.template); // react
```

📌 **这就是 create-vite / create-react-app 的核心入口**

---

# 九、常见坑（一定要知道）

## ❌ 1. 忘了 slice(2)

```js
minimist(process.argv)
```

会解析出：

```js
{
  _: ['node', 'index.js', ...]
}
```

✔ 正确做法：

```js
process.argv.slice(2)
```

---

## ❌ 2. 过度依赖 minimist

minimist 只负责 **解析参数**：

❌ 不做：

* 交互式选择
* 校验
* 帮助文案

👉 通常搭配：

* `prompts`
* `inquirer`
* `commander`（高级）

---

# 十、minimist 在真实项目中的定位

| 工具             | 作用         |
| -------------- | ---------- |
| minimist       | 参数解析（轻量、快） |
| commander      | 完整 CLI 框架  |
| prompts        | 交互选择       |
| chalk / colors | 颜色输出       |
| ora            | loading    |
| cli-progress   | 进度条        |

📌 **脚手架底层解析：minimist 非常常见**

---

# 十一、你现在该怎么练？

我给你一个**训练路径（强烈建议）**：

1️⃣ 用 minimist 做一个 CLI
2️⃣ 支持：

* 子命令 `create`
* `--template`
* `--help`
  3️⃣ 再加 `prompts` 做交互
  4️⃣ 最后做成 `create-xxx`

👉 这正好接你前面问的 **create-vite 原理**

---

如果你愿意，下一步我可以直接帮你：

* ✅ **用 minimist + prompts 写一个完整 create-cli**
* ✅ **对比 minimist vs commander**
* ✅ **带你一步步拆解 create-vite**

你选一个，我直接给你实战代码。
