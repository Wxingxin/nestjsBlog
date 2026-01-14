

# 一、`prompts` 是什么？什么时候用它？

**`prompts`** 是一个 **交互式命令行问答库**，特点是：

* API 简洁、Promise 风格
* 支持多种问题类型（输入 / 选择 / 确认 / 多选等）
* 对 async / await 非常友好
* 比 `readline` 简单、比 `inquirer` 轻量

👉 **一句话**：

> 想做「问用户几个问题 → 拿到答案 → 执行业务逻辑」，就用 `prompts`

---

# 二、安装 & 基础用法

```bash
npm install prompts
```

```js
import prompts from 'prompts';

const response = await prompts({
  type: 'text',
  name: 'username',
  message: '请输入用户名'
});

console.log(response.username);
```

📌 **核心规则你一定要记住**

| 字段        | 作用        |
| --------- | --------- |
| `type`    | 问题类型      |
| `name`    | 返回结果的 key |
| `message` | 提示文案      |

---

# 三、最常用的 Question 类型大全（重点）

## 1️⃣ text（文本输入）

```js
await prompts({
  type: 'text',
  name: 'project',
  message: '项目名称？',
  initial: 'my-app'
});
```

常用配置：

| 字段         | 说明    |
| ---------- | ----- |
| `initial`  | 默认值   |
| `validate` | 校验函数  |
| `format`   | 格式化输入 |

```js
validate: value => value ? true : '不能为空'
```

---

## 2️⃣ number（数字输入）

```js
await prompts({
  type: 'number',
  name: 'port',
  message: '端口号',
  initial: 3000,
  min: 1,
  max: 65535
});
```

---

## 3️⃣ confirm（是 / 否）

```js
await prompts({
  type: 'confirm',
  name: 'overwrite',
  message: '是否覆盖已有文件？',
  initial: false
});
```

返回：`true / false`

---

## 4️⃣ select（单选，最常用）

```js
await prompts({
  type: 'select',
  name: 'framework',
  message: '选择框架',
  choices: [
    { title: 'React', value: 'react' },
    { title: 'Vue', value: 'vue' },
    { title: 'Svelte', value: 'svelte' }
  ]
});
```

👉 **方向键 ↑ ↓，回车确认**

---

## 5️⃣ multiselect（多选）

```js
await prompts({
  type: 'multiselect',
  name: 'features',
  message: '选择功能',
  choices: [
    { title: 'TypeScript', value: 'ts' },
    { title: 'ESLint', value: 'eslint' },
    { title: 'Prettier', value: 'prettier' }
  ]
});
```

常用配置：

| 字段     | 说明    |
| ------ | ----- |
| `min`  | 至少选几个 |
| `max`  | 最多选几个 |
| `hint` | 操作提示  |

---

## 6️⃣ toggle（开关）

```js
await prompts({
  type: 'toggle',
  name: 'git',
  message: '是否初始化 Git？',
  initial: true,
  active: 'yes',
  inactive: 'no'
});
```

---

## 7️⃣ password（隐藏输入）

```js
await prompts({
  type: 'password',
  name: 'token',
  message: '请输入 Token'
});
```

📌 输入时不会回显

---

# 四、一次问多个问题（数组形式）

这是**真实项目最常用写法**：

```js
const answers = await prompts([
  {
    type: 'text',
    name: 'name',
    message: '项目名'
  },
  {
    type: 'select',
    name: 'lang',
    message: '语言',
    choices: [
      { title: 'JavaScript', value: 'js' },
      { title: 'TypeScript', value: 'ts' }
    ]
  },
  {
    type: 'confirm',
    name: 'install',
    message: '是否立即安装依赖？'
  }
]);

console.log(answers);
```

返回：

```js
{
  name: 'my-app',
  lang: 'ts',
  install: true
}
```

---

# 五、条件显示问题（非常实用）

```js
{
  type: prev => prev === 'ts' ? 'confirm' : null,
  name: 'strict',
  message: '是否开启 strict 模式？'
}
```

📌 `type: null` 表示 **跳过该问题**

---

# 六、取消（Ctrl+C / ESC）处理（必做）

```js
const answers = await prompts(questions, {
  onCancel() {
    console.log('❌ 用户取消');
    process.exit(1);
  }
});
```

⚠️ **不处理 onCancel 是新手常见坑**

---

# 七、动态生成 choices（根据前一个答案）

```js
{
  type: 'select',
  name: 'template',
  message: '选择模板',
  choices: prev => {
    if (prev === 'react') {
      return [
        { title: 'Vite', value: 'vite' },
        { title: 'CRA', value: 'cra' }
      ];
    }
    return [{ title: 'Default', value: 'default' }];
  }
}
```

---

# 八、校验 + 格式化（进阶）

```js
{
  type: 'text',
  name: 'packageName',
  message: '包名',
  validate: value =>
    /^[a-z][a-z0-9-]+$/.test(value) || '不合法的包名',
  format: value => value.toLowerCase()
}
```

---

# 九、prompts 常见“真实使用场景”

## ✅ 1. 脚手架（create-xxx）

```js
项目名 → 框架 → 是否 TS → 是否安装依赖
```

prompts = 标配

---

## ✅ 2. 配置生成器

```js
选择数据库 → 是否启用缓存 → 输出 config.json
```

---

## ✅ 3. 危险操作确认

```js
确认删除？
确认覆盖？
确认发布？
```

---

# 十、和 readline / cli-progress 的关系（你很关心这个）

| 工具             | 适合              |
| -------------- | --------------- |
| `prompts`      | 问答式交互           |
| `readline`     | 键盘级控制 / 自定义 TUI |
| `cli-progress` | 长任务进度显示         |

📌 **典型组合**

```txt
prompts（收集参数）
→ cli-progress（执行任务）
→ console.log（结果）
```

⚠️ 不建议 prompts 和 raw-mode readline 同时用在一个阶段

---

# 十一、常见坑点总结（很重要）

### ❌ 1. 忘记处理取消

→ CLI 直接挂住或逻辑继续跑

### ❌ 2. name 重复

→ 后面的答案覆盖前面的

### ❌ 3. 在 prompts 过程中 console.log

→ UI 会乱

---

# 十二、一句话总结

> **prompts = 最省事、最干净的 Node CLI 问答库**

* 写脚手架：✅
* 写配置向导：✅
* 写复杂键盘控制：❌（用 readline）

---

如果你愿意，下一步我可以直接帮你：

* ✅ 写一个 **完整 create-xxx CLI（prompts + 进度条）**
* ✅ 把 prompts 封装成 **统一问答模块**
* ✅ 对比 `prompts / inquirer / enquirer` 怎么选

你直接说：**你准备用 prompts 做什么 CLI？**
# 

下面给你一份 **Node.js `prompts` 库的配置与使用大全**，覆盖 **所有题型、通用配置、校验/条件跳过、动态问题、样式定制、实战模板与常见坑**。这份内容可以直接作为你以后写 **CLI 初始化向导 / 交互脚本** 的参考手册。

---

# 一、`prompts` 是什么？适合什么场景

`prompts` 是一个 **轻量、Promise 化、无依赖** 的交互式命令行库，核心特点：

* ✅ 基于 `async / await`
* ✅ 多种题型（文本 / 选择 / 确认 / 密码等）
* ✅ 条件问题（depends / skip）
* ✅ 校验（validate）
* ✅ 格式化（format）
* ✅ 自动补全（autocomplete）
* ✅ Ctrl+C 友好处理

典型场景：

* `create-*` 项目初始化
* CLI 工具首次配置
* 轻量交互（比 inquirer 简洁）

---

# 二、安装与基础使用

```bash
npm i prompts
```

最小示例：

```js
import prompts from "prompts";

const response = await prompts({
  type: "text",
  name: "username",
  message: "请输入用户名"
});

console.log(response.username);
```

---

# 三、问题对象（Question）的通用配置大全

所有题型 **通用字段**：

```ts
interface PromptObject {
  type: string | null | ((prev, values) => string | null);
  name: string;
  message: string | ((prev, values) => string);
  initial?: any;
  validate?: (value, values) => true | string;
  format?: (value, values) => any;
  onState?: (state) => void;
}
```

### 字段解释

| 字段         | 作用               |
| ---------- | ---------------- |
| `type`     | 题型，返回 `null` 可跳过 |
| `name`     | 返回结果的 key        |
| `message`  | 提示文本             |
| `initial`  | 默认值              |
| `validate` | 校验输入             |
| `format`   | 转换最终值            |
| `onState`  | 监听输入过程           |

---

# 四、所有题型（Type）配置大全

---

## 1️⃣ text（文本输入）

```js
{
  type: "text",
  name: "projectName",
  message: "项目名称",
  initial: "my-app"
}
```

---

## 2️⃣ password（密码输入）

```js
{
  type: "password",
  name: "password",
  message: "请输入密码"
}
```

* 自动隐藏输入
* 支持 `validate`

---

## 3️⃣ confirm（确认 / 是非）

```js
{
  type: "confirm",
  name: "overwrite",
  message: "是否覆盖？",
  initial: false
}
```

返回：

```ts
boolean
```

---

## 4️⃣ number（数字）

```js
{
  type: "number",
  name: "port",
  message: "端口号",
  initial: 3000,
  validate: v => v > 0 || "端口必须大于 0"
}
```

---

## 5️⃣ toggle（开关）

```js
{
  type: "toggle",
  name: "useTS",
  message: "是否使用 TypeScript",
  initial: true,
  active: "是",
  inactive: "否"
}
```

---

## 6️⃣ select（单选）

```js
{
  type: "select",
  name: "framework",
  message: "选择框架",
  choices: [
    { title: "React", value: "react" },
    { title: "Vue", value: "vue" },
    { title: "Svelte", value: "svelte" }
  ]
}
```

返回：

```ts
value
```

---

## 7️⃣ multiselect（多选）

```js
{
  type: "multiselect",
  name: "features",
  message: "选择功能",
  choices: [
    { title: "Lint", value: "lint" },
    { title: "Format", value: "format" },
    { title: "Test", value: "test" }
  ],
  min: 1,
  max: 3
}
```

---

## 8️⃣ autocomplete（自动补全）

```js
{
  type: "autocomplete",
  name: "pkg",
  message: "选择包",
  choices: [
    { title: "chalk", value: "chalk" },
    { title: "ora", value: "ora" },
    { title: "prompts", value: "prompts" }
  ]
}
```

---

## 9️⃣ autocompleteMultiselect

```js
{
  type: "autocompleteMultiselect",
  name: "deps",
  message: "选择依赖",
  choices: [...]
}
```

---

# 五、动态 & 条件问题（非常重要）

---

## 1️⃣ 根据前一个答案决定题型（跳过）

```js
{
  type: (prev) => prev ? "text" : null,
  name: "repo",
  message: "请输入仓库地址"
}
```

---

## 2️⃣ 根据多个答案判断

```js
type: (_, values) => {
  return values.framework === "react" ? "toggle" : null;
}
```

---

# 六、校验（validate）与格式化（format）

### validate

```js
validate: value => value.length > 3 || "至少 4 个字符"
```

### format（最终写入结果）

```js
format: value => value.trim().toLowerCase()
```

---

# 七、数组形式：多问题配置（常用）

```js
const questions = [
  {
    type: "text",
    name: "name",
    message: "项目名"
  },
  {
    type: "select",
    name: "lang",
    message: "语言",
    choices: [
      { title: "JavaScript", value: "js" },
      { title: "TypeScript", value: "ts" }
    ]
  }
];

const answers = await prompts(questions);
```

---

# 八、全局配置 & 事件处理

---

## 1️⃣ Ctrl + C 处理（必写）

```js
const answers = await prompts(questions, {
  onCancel() {
    console.log("用户取消");
    process.exit(1);
  }
});
```

---

## 2️⃣ onSubmit（调试用）

```js
onSubmit(prompt, answer) {
  console.log(prompt.name, answer);
}
```

---

## 3️⃣ onState（输入过程）

```js
onState(state) {
  // state.value / state.error
}
```

---

# 九、样式与终端行为

`prompts` 内部使用 ANSI，不直接暴露样式 API
👉 **推荐组合 chalk**

```js
import chalk from "chalk";

{
  message: chalk.cyan("请选择框架")
}
```

---

# 十、完整「项目初始化 CLI」实战模板（推荐）

```js
import prompts from "prompts";

const questions = [
  {
    type: "text",
    name: "name",
    message: "项目名称",
    initial: "my-app"
  },
  {
    type: "select",
    name: "framework",
    message: "选择框架",
    choices: [
      { title: "React", value: "react" },
      { title: "Vue", value: "vue" }
    ]
  },
  {
    type: prev => prev === "react" ? "toggle" : null,
    name: "useTS",
    message: "是否使用 TypeScript",
    initial: true
  }
];

const answers = await prompts(questions, {
  onCancel() {
    console.log("已取消");
    process.exit(1);
  }
});

console.log("结果：", answers);
```

---

# 十一、常见坑 & 最佳实践

### ❌ 不处理 Ctrl+C

* 会返回空对象 `{}`

### ❌ `type` 写死

* 复杂 CLI 建议用函数

### ❌ 校验返回 `false`

* 必须返回 `true | string`

---

## ✅ 最佳实践总结

* 初始化脚本 → `prompts`
* 长期交互 CLI → `readline`
* 重度交互 → `inquirer`
* 始终：

  * `onCancel`
  * `validate`
  * 条件 `type`

---

如果你愿意，我可以下一步直接帮你：

* 🚀 **prompts + chalk + ora** 组合成一套工业级 CLI 模板
* 🧱 仿 `create-vite / create-next-app` 初始化流程
* 🔌 集成到你已有的 **Node / Express / Nest 项目**

你只需要告诉我：
👉 **你是写“初始化 CLI”，还是“项目内部脚本”？**
