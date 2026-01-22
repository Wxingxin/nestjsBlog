下面我把 **cli-progress** 在 **Node.js CLI** 中的**常见使用方式 + 必须掌握的知识点**系统梳理一遍，覆盖你在**真实工程级 CLI / 脚手架 / 构建工具**里最常见、最实用的场景，并给出**可直接复制使用的代码模式**。

> 一句话定位：
> **cli-progress 用来展示“有明确进度”的任务**（百分比、条数、文件数），是 ora（不确定耗时）之外的“确定型进度反馈”。

---

# 一、cli-progress 在 CLI 里的角色定位

| 场景          | 是否适合 cli-progress | 说明    |
| ----------- | ----------------- | ----- |
| 文件下载        | ✅                 | 已知总大小 |
| 批量处理（N 个任务） | ✅                 | 已知总数  |
| 构建多个子任务     | ✅                 | 明确阶段  |
| 单个未知耗时任务    | ❌                 | 用 ora |
| CI / 非 TTY  | ⚠️                | 需关闭   |

👉 **判断原则**

* ❓不知道要多久 → **ora**
* 📊知道总量 / 进度 → **cli-progress**

---

# 二、最基础用法（单进度条）

## 1️⃣ 创建、启动、更新、结束

**知识点**

* `SingleBar`：最常用
* `start(total, initial)`
* `update(value)`
* `increment()`
* `stop()`

```js
import cliProgress from "cli-progress";

const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

bar.start(100, 0);

for (let i = 0; i <= 100; i++) {
  await new Promise(r => setTimeout(r, 30));
  bar.update(i);
}

bar.stop();
```

---

# 三、最常见真实场景

## 2️⃣ 批量任务（for / Promise）

**知识点**

* `increment()` 是最常用方法
* 不需要你自己算百分比

```js
const bar = new cliProgress.SingleBar();
bar.start(files.length, 0);

for (const file of files) {
  await processFile(file);
  bar.increment();
}

bar.stop();
```

---

## 3️⃣ 文件下载进度（字节级）

```js
const bar = new cliProgress.SingleBar();
bar.start(totalBytes, 0);

stream.on("data", chunk => {
  bar.increment(chunk.length);
});

stream.on("end", () => bar.stop());
```

---

# 四、格式化输出（非常重要）

## 4️⃣ 自定义进度条格式

**知识点**

* `format` 决定显示内容
* 常用占位符：

| 占位符            | 含义   |
| -------------- | ---- |
| `{bar}`        | 进度条  |
| `{percentage}` | 百分比  |
| `{value}`      | 当前   |
| `{total}`      | 总量   |
| `{duration}`   | 已耗时  |
| `{eta}`        | 剩余时间 |

```js
const bar = new cliProgress.SingleBar({
  format: "Progress |{bar}| {percentage}% | {value}/{total} | ETA: {eta}s",
});
```

---

## 5️⃣ 自定义样式字符

```js
const bar = new cliProgress.SingleBar({
  barCompleteChar: "█",
  barIncompleteChar: "░",
});
```

---

# 五、多进度条（高级但很常用）

## 6️⃣ MultiBar（多个并行任务）

**知识点**

* 一个 `MultiBar` 管理多个 `SingleBar`
* 常见于并行下载 / 多包构建

```js
const multibar = new cliProgress.MultiBar({
  clearOnComplete: false,
  hideCursor: true,
}, cliProgress.Presets.shades_grey);

const bar1 = multibar.create(100, 0);
const bar2 = multibar.create(200, 0);

bar1.update(50);
bar2.update(120);

multibar.stop();
```

---

## ⚠️ 多进度条使用原则

* 只在 **明确并行任务** 时用
* 每个 bar 必须语义清晰（文件名 / 包名）

---

# 六、动态 payload（显示文件名 / 状态）

## 7️⃣ payload：进度条右侧信息（非常实用）

```js
const bar = new cliProgress.SingleBar({
  format: "{bar} {percentage}% | {filename}",
});

bar.start(3, 0, { filename: "a.js" });

bar.update(1, { filename: "b.js" });
bar.update(2, { filename: "c.js" });

bar.stop();
```

---

# 七、和 Execa 联合（构建 / 批处理 CLI）

## 8️⃣ 批量执行命令 + 进度条

```js
import { execa } from "execa";

const tasks = ["build", "lint", "test"];
const bar = new cliProgress.SingleBar();

bar.start(tasks.length, 0);

for (const task of tasks) {
  await execa("npm", ["run", task]);
  bar.increment();
}

bar.stop();
```

---

# 八、和 ora 的协作（高级体验）

## 9️⃣ ora + cli-progress 正确组合

**模式**

1. 用 ora 表示“准备中 / 初始化”
2. 切换到 cli-progress 表示“执行中”
3. 最后 ora.succeed / fail

```js
const spinner = ora("Preparing").start();
await prepare();
spinner.stop();

const bar = new cliProgress.SingleBar();
bar.start(100, 0);
await work(bar);
bar.stop();

spinner.succeed("All done");
```

---

# 九、CI / 非 TTY 环境（必须处理）

## 🔴 重要知识点

* 非 TTY 会乱码
* 必须禁用进度条

```js
if (!process.stdout.isTTY) {
  // fallback: console.log
} else {
  const bar = new cliProgress.SingleBar();
}
```

---

# 十、错误处理（专业 CLI 必须）

## 10️⃣ 出错时必须 stop()

```js
try {
  bar.start(10, 0);
  await work();
} catch (e) {
  bar.stop();
  console.error("Error:", e.message);
  process.exitCode = 1;
}
```

---

# 十一、cli-progress 常见坑（你一定会遇到）

## ❌ 1. 进度条期间 console.log

* 会破坏 UI

✅ 正确：

```js
bar.stop();
console.log("log");
bar.start(total, value);
```

---

## ❌ 2. total 不准确

* 会导致 ETA 错误
* 建议 **预扫描一次** 再开始

---

## ❌ 3. 忘记 stop()

* 终端光标错乱

---

# 十二、cli-progress vs ora（你必须分清）

| 对比         | cli-progress | ora |
| ---------- | ------------ | --- |
| 是否需要 total | ✅            | ❌   |
| 是否显示百分比    | ✅            | ❌   |
| 适合未知耗时     | ❌            | ✅   |
| 批量任务       | ✅            | ⚠️  |
| 下载/复制      | ✅            | ❌   |

---

# 十三、一个“生产级封装”示例（强烈推荐）

```js
import cliProgress from "cli-progress";

export function createProgress(total, format) {
  if (!process.stdout.isTTY) {
    return {
      increment() {},
      update() {},
      stop() {},
    };
  }

  const bar = new cliProgress.SingleBar({
    format: format ?? "{bar} {percentage}% | {value}/{total}",
  });

  bar.start(total, 0);
  return bar;
}
```

**使用**

```js
const bar = createProgress(files.length);

for (const f of files) {
  await handle(f);
  bar.increment();
}

bar.stop();
```

---

# 十四、你现在的技术栈已经非常完整

你已经学过：

* commander（命令解析）
* execa（执行命令）
* prompts（用户交互）
* ora（不确定 loading）
* **cli-progress（确定进度）** ✅

👉 **这是完整的“专业 CLI 技术栈”**

---

## 下一步最值得做的 3 件事

1. 封装 **spinner / progress / logger** 统一层
2. 写一个 **create-xxx 脚手架**
3. 模拟 **真实构建工具（lint/build/test）CLI**

---

如果你愿意，下一步我可以：

* 帮你把 **ora + cli-progress 自动切换**
* 帮你设计 **企业级 CLI 目录结构**
* 带你一步步实现一个 **真正可发布的脚手架 CLI**

你只要告诉我：**你想做哪一类 CLI**。
