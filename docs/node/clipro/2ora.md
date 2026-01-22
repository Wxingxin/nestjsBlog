下面我把 **ora** 在 **Node.js CLI** 中的**常见使用方式 + 必须掌握的知识点**系统性梳理一遍，覆盖你在**真实脚手架 / 工程 CLI**里 90% 会用到的场景，并给出**可直接复用的代码模式**。

> 一句话定位：**ora 是终端里的 loading / 状态指示器**，用于把“正在执行的耗时操作”可视化，是 CLI 体验好坏的关键组件之一。

---

# 一、ora 在 CLI 里的角色定位

| 场景                          | 是否用 ora | 说明             |
| --------------------------- | ------- | -------------- |
| 执行耗时任务（install/build/fetch） | ✅       | 用户需要“正在做什么”的反馈 |
| 快速同步操作                      | ❌       | 没必要            |
| 配合 execa 执行命令               | ✅       | 最典型用法          |
| 批量步骤（step 1 / 2 / 3）        | ✅       | 状态明确           |
| 非 TTY（CI）                   | ⚠️      | 需禁用            |

---

# 二、最基础用法（你必须会）

## 1️⃣ 创建 / 启动 / 停止 spinner

**知识点**

* `ora()` 创建 spinner
* `.start()` 开始
* `.stop()` 停止（不显示成功/失败）
* `.succeed()` / `.fail()` 显示最终状态并停止

```js
import ora from "ora";

const spinner = ora("Loading...").start();

// 模拟耗时
await new Promise((r) => setTimeout(r, 1500));

spinner.succeed("Done");
```

---

## 2️⃣ 最常见模式：try / catch + succeed / fail

**这是 CLI 中最推荐的写法**

```js
const spinner = ora("Installing dependencies").start();

try {
  await doSomething();
  spinner.succeed("Dependencies installed");
} catch (err) {
  spinner.fail("Installation failed");
  process.exitCode = 1;
}
```

---

# 三、和 Execa 联合（CLI 核心场景）

## 3️⃣ spinner + 外部命令

**关键知识点**

* 执行命令时通常 **不要 `stdio: "inherit"`**
* 否则 spinner 会被子进程输出打乱
* 真正需要实时输出时，先 `spinner.stop()`，再执行

---

### 推荐模式：命令静默执行

```js
import { execa } from "execa";
import ora from "ora";

const spinner = ora("Running build").start();

try {
  await execa("npm", ["run", "build"]);
  spinner.succeed("Build completed");
} catch (err) {
  spinner.fail("Build failed");
  console.error(err.stderr);
}
```

---

### 需要实时输出时（正确姿势）

```js
const spinner = ora("Building").start();

spinner.stop(); // 先停 spinner
await execa("npm", ["run", "build"], { stdio: "inherit" });
spinner.succeed("Build finished");
```

---

# 四、更新文本（实时进度提示）

## 4️⃣ `.text` 动态修改

```js
const spinner = ora("Step 1/3").start();

await step1();
spinner.text = "Step 2/3";

await step2();
spinner.text = "Step 3/3";

await step3();
spinner.succeed("All steps done");
```

---

# 五、多步骤 / 多 spinner（脚手架常见）

## 5️⃣ 串行步骤（推荐）

```js
const s1 = ora("Checking environment").start();
await checkEnv();
s1.succeed("Environment OK");

const s2 = ora("Creating project").start();
await createProject();
s2.succeed("Project created");
```

---

## ⚠️ 不推荐并行 spinner

* 多 spinner 同时运行会导致终端混乱
* 如果必须并行：

  * 合并到一个 spinner
  * 或只展示阶段状态

---

# 六、颜色、样式、图标（进阶但常用）

## 6️⃣ 自定义 spinner 样式

```js
const spinner = ora({
  text: "Loading",
  spinner: "dots",
  color: "cyan",
}).start();
```

**常用内置样式**

* `dots`
* `line`
* `star`
* `bouncingBar`

---

## 7️⃣ 成功 / 失败图标

```js
spinner.succeed("Success");
spinner.fail("Error occurred");
spinner.warn("Warning");
spinner.info("Info");
```

---

# 七、CI / 非交互环境（必须处理）

## 8️⃣ `isEnabled` / `isTTY`

**知识点**

* 在 CI、重定向输出时 spinner 会乱码
* 必须禁用

```js
const spinner = ora({
  text: "Running",
  isEnabled: process.stdout.isTTY,
}).start();
```

---

# 八、与 Commander / prompts 的组合顺序

## 9️⃣ 推荐交互顺序（真实项目）

```txt
解析参数 (commander)
↓
交互提问 (prompts)
↓
spinner + 执行任务 (ora + execa)
↓
最终结果输出
```

---

## 示例：完整 action

```js
program
  .command("init")
  .action(async () => {
    const answers = await prompts(...);

    const spinner = ora("Creating project").start();
    try {
      await createProject(answers);
      spinner.succeed("Project created");
    } catch {
      spinner.fail("Failed");
    }
  });
```

---

# 九、错误处理与退出码（专业 CLI 必须）

## 🔴 重要知识点

* `spinner.fail()` **不会自动退出进程**
* 你必须设置 `process.exitCode`

```js
spinner.fail("Error");
process.exitCode = 1;
```

---

# 十、ora 的常见坑（你一定会遇到）

## ❌ 1. spinner + console.log

```js
spinner.start();
console.log("hello"); // 会打断 spinner
```

✅ 正确：

```js
spinner.stop();
console.log("hello");
spinner.start();
```

---

## ❌ 2. spinner + stdio: inherit

* 子进程输出会破坏 spinner

✅ 正确：

* 二选一：spinner 或 实时输出

---

## ❌ 3. CI 不禁用

* GitHub Actions / Pipe 会乱码

---

# 十一、CLI 中 ora 的“设计哲学”

1. **spinner 是“状态指示”，不是日志**
2. **一次只展示一个关注点**
3. **长任务才显示**
4. **失败必须给明确信息**

---

# 十二、一个“可直接复用”的 spinner 工具封装（强烈推荐）

```js
import ora from "ora";

export async function withSpinner(text, task) {
  const spinner = ora({
    text,
    isEnabled: process.stdout.isTTY,
  }).start();

  try {
    const result = await task();
    spinner.succeed();
    return result;
  } catch (err) {
    spinner.fail(err?.message ?? "Failed");
    throw err;
  }
}
```

**使用**

```js
await withSpinner("Installing deps", () =>
  execa("pnpm", ["install"])
);
```

---

# 十三、你现在这个阶段的正确学习路线

你已经学过：

* commander（参数解析）
* execa（执行命令）
* prompts（交互输入）
* **ora（状态反馈）** ✅

👉 你现在 **已经具备写“工业级 CLI”的全部基础组件**

下一步最有价值的是：

1. **把这 4 个库封装成 CLI 基础层**
2. 统一错误处理 / spinner / 日志
3. 做一个 `create-xxx` 脚手架

---

如果你愿意，我可以下一步：

* 帮你 **设计一个完整 CLI 工程结构**
* 或把 **ora + execa** 封装成“自动切换 spinner / 输出模式”的执行器
* 或带你一步步做一个 **真正可发布的脚手架 CLI**

你只需要告诉我：**你想做哪一类 CLI**。
