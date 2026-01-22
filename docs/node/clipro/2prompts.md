下面我把 **prompts** 在 **Node.js CLI** 中的**常见使用方式 + 必须掌握的知识点**系统梳理一遍。定位是：**你写脚手架 / 交互式 CLI 时，90% 场景都会用到的那一套**。示例均为 **ESM**，Commander / Execa 场景我会顺带结合。

---

# 一、prompts 是什么？在 CLI 里的角色

**一句话定位**

> `prompts` 是一个 **轻量、Promise 风格、零依赖** 的 CLI 交互输入库，用于在终端向用户提问并获取答案。

**在真实 CLI 中的分工**

| 事情                 | 使用的库        |
| ------------------ | ----------- |
| 解析命令参数             | commander   |
| 执行外部命令             | execa       |
| **和用户交互（选择 / 输入）** | **prompts** |
| loading / spinner  | ora         |
| 彩色输出               | chalk       |

👉 **prompts 只负责“问问题”**

---

# 二、最基础用法：单个问题

## 1️⃣ text 输入（最常见）

**知识点**

* `type: 'text'`
* 返回值是一个对象
* 支持 `initial` 默认值

```js
import prompts from "prompts";

const result = await prompts({
  type: "text",
  name: "projectName",
  message: "Project name?",
  initial: "my-app",
});

console.log(result.projectName);
```

---

## 2️⃣ number 输入

**知识点**

* 输入值自动转换为 number
* 可设置 `min / max`

```js
const { port } = await prompts({
  type: "number",
  name: "port",
  message: "Server port?",
  initial: 3000,
  min: 1,
  max: 65535,
});
```

---

## 3️⃣ password（输入不回显）

```js
const { password } = await prompts({
  type: "password",
  name: "password",
  message: "Enter password",
});
```

---

# 三、选择类（CLI 脚手架核心）

## 4️⃣ select（单选）

**知识点**

* `choices` 是数组
* `value` 才是最终返回值（不是 title）

```js
const { framework } = await prompts({
  type: "select",
  name: "framework",
  message: "Choose a framework",
  choices: [
    { title: "React", value: "react" },
    { title: "Vue", value: "vue" },
    { title: "Svelte", value: "svelte" },
  ],
});
```

---

## 5️⃣ multiselect（多选）

**知识点**

* 返回的是 **value 数组**
* `min / max` 可限制选择数量

```js
const { features } = await prompts({
  type: "multiselect",
  name: "features",
  message: "Select features",
  choices: [
    { title: "TypeScript", value: "ts" },
    { title: "ESLint", value: "eslint" },
    { title: "Prettier", value: "prettier" },
  ],
  min: 1,
});
```

---

## 6️⃣ toggle（是 / 否）

```js
const { useDocker } = await prompts({
  type: "toggle",
  name: "useDocker",
  message: "Use Docker?",
  initial: true,
  active: "yes",
  inactive: "no",
});
```

---

# 四、校验（validation）：CLI 必会

## 7️⃣ validate：输入校验

**知识点**

* 返回 `true` 表示通过
* 返回字符串表示错误信息

```js
const { projectName } = await prompts({
  type: "text",
  name: "projectName",
  message: "Project name",
  validate: (value) =>
    value.length < 3 ? "Name must be at least 3 characters" : true,
});
```

---

# 五、动态问题（根据前一个答案决定）

## 8️⃣ 动态 `type / message / choices`

**知识点**

* 所有字段都可以是函数
* 参数是 **之前的 answers**

```js
const result = await prompts([
  {
    type: "select",
    name: "language",
    message: "Language?",
    choices: [
      { title: "JavaScript", value: "js" },
      { title: "TypeScript", value: "ts" },
    ],
  },
  {
    type: (prev) => (prev === "ts" ? "toggle" : null),
    name: "strict",
    message: "Enable strict mode?",
    initial: true,
  },
]);
```

> 返回 `null` = 跳过该问题（非常重要）

---

# 六、多个问题（脚手架常态）

## 9️⃣ 数组形式（推荐）

```js
const answers = await prompts([
  {
    type: "text",
    name: "name",
    message: "Project name",
  },
  {
    type: "select",
    name: "pkgManager",
    message: "Package manager",
    choices: [
      { title: "npm", value: "npm" },
      { title: "pnpm", value: "pnpm" },
      { title: "yarn", value: "yarn" },
    ],
  },
]);

console.log(answers);
```

---

# 七、用户中断（Ctrl+C / Esc）——必须处理

## 🔴 非常重要的知识点

**默认行为**

* 用户 `Ctrl+C` / `Esc`
* prompts 会直接 `process.exit(1)`

👉 **真实 CLI 一定要接管中断行为**

---

## 🔟 `onCancel`：统一退出处理

```js
const answers = await prompts(questions, {
  onCancel() {
    console.log("❌ Operation cancelled");
    process.exit(0);
  },
});
```

---

# 八、和 Commander 联合使用（真实项目）

## 11️⃣ 参数 + 交互共存（最佳实践）

**知识点**

* CLI 参数优先
* 缺失参数再用 prompts 补齐

```js
program
  .command("init")
  .option("-n, --name <name>")
  .action(async (opts) => {
    const answers = await prompts([
      {
        type: opts.name ? null : "text",
        name: "name",
        message: "Project name",
      },
    ]);

    const projectName = opts.name ?? answers.name;
    console.log(projectName);
  });
```

---

# 九、和 Execa 联合（脚手架核心）

## 12️⃣ prompts → execa

```js
import { execa } from "execa";
import prompts from "prompts";

const { pkgManager } = await prompts({
  type: "select",
  name: "pkgManager",
  message: "Choose package manager",
  choices: [
    { title: "npm", value: "npm" },
    { title: "pnpm", value: "pnpm" },
  ],
});

await execa(pkgManager, ["install"], {
  stdio: "inherit",
});
```

---

# 十、常见问题类型速查表（重点）

| type           | 场景         |
| -------------- | ---------- |
| `text`         | 项目名 / 路径   |
| `number`       | 端口         |
| `password`     | token / 密钥 |
| `confirm`      | 是 / 否      |
| `toggle`       | 是 / 否（更友好） |
| `select`       | 框架 / 模板    |
| `multiselect`  | 功能选择       |
| `autocomplete` | 模板很多时      |
| `date`         | 日期（较少用）    |

---

# 十一、prompts 的设计哲学（你要理解的）

1. **prompts 是“声明式问题描述”**
2. 返回值始终是 **纯对象**
3. 没有魔法状态，全靠 Promise
4. 和 Commander / Execa 解耦，组合使用

---

# 十二、一个完整 CLI 交互示例（推荐你收藏）

```js
#!/usr/bin/env node
import prompts from "prompts";
import { execa } from "execa";

const answers = await prompts(
  [
    {
      type: "text",
      name: "name",
      message: "Project name",
      validate: (v) => v ? true : "Required",
    },
    {
      type: "select",
      name: "framework",
      message: "Framework",
      choices: [
        { title: "React", value: "react" },
        { title: "Vue", value: "vue" },
      ],
    },
    {
      type: "toggle",
      name: "useTS",
      message: "Use TypeScript?",
      initial: true,
      active: "yes",
      inactive: "no",
    },
  ],
  {
    onCancel() {
      console.log("Cancelled");
      process.exit(0);
    },
  }
);

console.log("Creating project:", answers);

await execa("npm", ["init", "-y"], { stdio: "inherit" });
```

---

# 十三、你现在这个阶段的学习建议（非常关键）

你现在学到 **Node CLI + commander + execa + prompts**，已经是：

> ✅ **完整 CLI 技术栈**

下一步建议你练 3 个小项目（非常有用）：

1. **脚手架 CLI**（类似 `create-xxx`）
2. **构建封装 CLI**（一键 lint / build / deploy）
3. **环境初始化 CLI**（检测 Node / Git / Docker）

---

如果你愿意，下一步我可以：

* 帮你 **设计一个完整 create-xxx 脚手架目录结构**
* 或把 **prompts + commander + execa** 封装成一套“企业级 CLI 基础层”
* 或逐行拆解一个真实开源 CLI（例如 create-vite 的交互设计）

你直接告诉我：**你想做哪一类 CLI**。
