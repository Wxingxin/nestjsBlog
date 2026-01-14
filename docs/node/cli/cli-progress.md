

# 一、cli-progress 是什么？

**`cli-progress`** 是一个 **Node.js 终端进度条库**，用于在 **CLI 程序**中直观展示任务执行进度。

一句话总结：

> `cli-progress` = 帮你在终端里“优雅地显示进度”

典型用途：

* 文件下载 / 上传
* 构建过程
* 批量处理任务
* 脚本执行反馈
* 脚手架工具（如 create-xxx）

---

# 二、安装与基础使用

```bash
npm install cli-progress
```

```js
import cliProgress from 'cli-progress';
```

---

## 最小可用示例（必会）

```js
import cliProgress from 'cli-progress';

const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

bar.start(100, 0);

let value = 0;
const timer = setInterval(() => {
  value++;
  bar.update(value);

  if (value >= 100) {
    clearInterval(timer);
    bar.stop();
  }
}, 50);
```

---

# 三、核心概念（非常重要）

## 1️⃣ SingleBar vs MultiBar

| 类型          | 作用         |
| ----------- | ---------- |
| `SingleBar` | 单进度条（最常用）  |
| `MultiBar`  | 多进度条（并发任务） |

---

## 2️⃣ bar 的生命周期

```text
new → start → update / increment → stop
```

### 常见错误 ❌

* `update` 前没 `start`
* 忘记 `stop` 导致终端卡住

---

# 四、SingleBar 常用配置项大全（重点）

```js
new SingleBar(options, preset)
```

---

## 1️⃣ format（最重要）

```js
format: '进度 |{bar}| {percentage}% | {value}/{total}'
```

### 内置占位符

| 占位符            | 含义       |
| -------------- | -------- |
| `{bar}`        | 进度条本体    |
| `{percentage}` | 百分比      |
| `{value}`      | 当前值      |
| `{total}`      | 总数       |
| `{duration}`   | 已用时间     |
| `{eta}`        | 预计剩余时间   |
| `{speed}`      | 速度（需自定义） |

---

## 2️⃣ barCompleteChar / barIncompleteChar

```js
barCompleteChar: '█',
barIncompleteChar: '░'
```

---

## 3️⃣ hideCursor（强烈推荐）

```js
hideCursor: true
```

防止光标闪烁。

---

## 4️⃣ clearOnComplete

```js
clearOnComplete: false
```

* `true`：完成后清除
* `false`：保留最后一行

---

## 5️⃣ stopOnComplete

```js
stopOnComplete: true
```

---

## 6️⃣ fps（刷新频率）

```js
fps: 10
```

---

# 五、update / increment 使用大全

---

## 1️⃣ update(value)

```js
bar.update(50);
```

---

## 2️⃣ update(value, payload)

```js
bar.update(30, {
  speed: '2.4MB/s',
  file: 'video.mp4'
});
```

```js
format: '{bar} {percentage}% | {file} | {speed}'
```

---

## 3️⃣ increment(step)

```js
bar.increment();
bar.increment(5);
```

---

# 六、Preset（预设样式）

```js
cliProgress.Presets.shades_classic
cliProgress.Presets.shades_grey
cliProgress.Presets.legacy
```

推荐：

```js
cliProgress.Presets.shades_classic
```

---

# 七、MultiBar 使用大全（并发任务）

## 示例：多个下载任务

```js
const multibar = new cliProgress.MultiBar({
  clearOnComplete: false,
  hideCursor: true,
  format: '{bar} | {filename} | {percentage}%'
}, cliProgress.Presets.shades_classic);

const bar1 = multibar.create(100, 0, { filename: 'a.zip' });
const bar2 = multibar.create(200, 0, { filename: 'b.zip' });

let i = 0;
const timer = setInterval(() => {
  bar1.increment();
  bar2.increment(2);
  i++;

  if (i >= 100) {
    clearInterval(timer);
    multibar.stop();
  }
}, 100);
```

---

# 八、与 async / await 结合（真实项目）

```js
async function runTasks(tasks) {
  const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  bar.start(tasks.length, 0);

  for (let i = 0; i < tasks.length; i++) {
    await tasks[i]();
    bar.increment();
  }

  bar.stop();
}
```

---

# 九、真实工程常见模式（高级）

---

## 1️⃣ 文件下载进度

```js
response.on('data', chunk => {
  downloaded += chunk.length;
  bar.update(downloaded);
});
```

---

## 2️⃣ 构建流程

```js
const steps = ['Compile', 'Bundle', 'Minify'];

bar.start(steps.length, 0);

for (const step of steps) {
  await run(step);
  bar.increment();
}
```

---

## 3️⃣ 与 ansi-escapes / chalk 结合

```js
format: chalk.green('{bar}') + ' {percentage}%'
```

---

# 十、常见坑（必看）

### ❌ 1. Windows 编码问题

确保终端支持 Unicode：

```js
barCompleteChar: '█'
```

如果乱码，换成：

```js
barCompleteChar: '#'
```

---

### ❌ 2. 不要 console.log

进度条运行期间：

```js
❌ console.log()
✅ bar.stop() 后再 log
```

---

### ❌ 3. MultiBar 忘记 stop

```js
multibar.stop();
```

---

# 十一、cli-progress 不适合的场景

| 场景         | 建议                |
| ---------- | ----------------- |
| Loading 动画 | `ora`             |
| 复杂 TUI     | `ink` / `blessed` |
| Web 进度条    | 前端组件              |

---

# 十二、结合你当前水平的进阶建议

你已经能写出：

```js
bar.update(value, { speed: 'xxMb/s' });
```
# 

下面给你一份 **`cli-progress` 配置（options）大全**，按你在项目里真正会用到的方式来整理：**SingleBar 配置**、**MultiBar 容器配置**、**format 占位符/自定义 token**、**Preset（主题）**、以及一些容易误解的点。内容以官方 README / npm 页面为准。 ([Npm][1])

---

## 1) SingleBar：配置项大全（最常用）

创建方式：

```js
const bar = new cliProgress.SingleBar(options, preset);
```

### 1.1 视觉与格式

* **`format`**：进度条一行的模板字符串（最重要）

  * 内置 token（如 `{bar}`, `{percentage}` 等）+ 你传的 payload 自定义 token（如 `{speed}`, `{file}`）
  * README 明确：`update(currentValue, payload)` 的 payload 是给自定义 token 用的；只更新 payload 时可以把 `currentValue` 设为 `null`。 ([GitHub][2])
* **`barCompleteChar`**：已完成部分字符（例如 `█` / `#`）
* **`barIncompleteChar`**：未完成部分字符（例如 `░` / `-`）
* **`barsize`**：进度条宽度（字符数），也有人写成 `barSize` 但常见配置名是 `barsize`（官方示例里出现） ([GitHub][2])
* **`linewrap`**：是否允许换行/自动换行（用于避免超长 format 把终端撑乱；具体行为以 README 为准） ([GitHub][2])

### 1.2 渲染行为与性能

* **`fps`**：刷新率（每秒渲染次数），值越大越流畅但更吃 CPU；类型定义/测试里常见用法是 `fps: 5` 这类。 ([GitHub][3])
* **`stream`**：输出流（默认 `process.stderr` 或 `process.stdout`，看你的用法；可显式改成 `process.stdout`）
* **`noTTYOutput` / `notTTyOutput`（以 README 为准）**：非 TTY 环境下是否仍输出（例如重定向到文件时的行为）。([GitHub][2])
* **`forceRedraw`**：即使值没变化也强制重绘（适合 payload 持续变化、但 value 不变的场景）([GitHub][2])

### 1.3 光标与收尾

* **`hideCursor`**：渲染期间隐藏光标（强烈建议开，体验更好；你之前也在用）
* **`clearOnComplete`**：完成后清掉整行（不保留最终结果）
* **`stopOnComplete`**：到达 total 自动 `stop()`
* **`synchronousUpdate` / `etaAsynchronousUpdate`（以 README/CHANGES 为准）**：与 ETA/渲染时机相关的策略（不同版本可能有差异，建议你按你项目安装版本的 README 对照）([GitHub][2])

---

## 2) MultiBar：容器配置大全（多任务并发）

创建方式：

```js
const multibar = new cliProgress.MultiBar(options, preset);
const bar = multibar.create(total, startValue, payload, barOptions?);
```

关键点：

* **MultiBar 的 `options/preset` 会作为每个子 bar 的默认配置**。([Npm][1])
* CHANGES 提到：**`multibar.create(...)` 支持传“单条 bar 的覆盖 options”**（让某一条和全局风格不同）。([GitHub][4])

MultiBar 常见配置项（大体与 SingleBar 相同，但更关注“多行管理”）：

* **`format` / `barsize` / `barCompleteChar` / `barIncompleteChar`**
* **`hideCursor`**
* **`clearOnComplete` / `stopOnComplete`**
* **`fps`**
* **`stream`**
* **容器停止**：结束时通常调用 `multibar.stop()`（一次性停掉所有条）

另外：MultiBar + payload token 的使用要严格依赖 `format`（issue 里也有人因为 format 没配而误以为 payload 不生效）。([GitHub][5])

---

## 3) format 内置 token 与自定义 token（你配置时最常改的地方）

### 3.1 内置 token（常见）

在 npm/README 的示例中，常见内置 token 包括：

* `{bar}`：进度条主体
* `{percentage}`：百分比
* `{value}` / `{total}`：当前值 / 总值
* `{eta}`：预计剩余时间（秒）
* `{duration}`：已用时间（秒）

这些在 README 的“格式化/更新”说明与示例里会反复出现。([GitHub][2])

### 3.2 自定义 token（payload）

`bar.update(value, payload)` 的 payload 会合并进 token：

```js
bar.update(10, { speed: '3.2MB/s', file: 'a.zip' });
```

`format` 里写 `{speed}` `{file}` 即可显示。
并且：**只更新 payload** 可以 `bar.update(null, {speed: '...'})`。([GitHub][2])

---

## 4) Presets（主题预设）

`cli-progress` 自带一些 presets（典型如 `shades_classic` 等），用来快速获得一组默认格式、字符、颜色策略等：

```js
new cliProgress.SingleBar(options, cliProgress.Presets.shades_classic);
```

npm 页面与 README 都把 preset 当作第二参数的常规用法。([Npm][1])

---

## 5) 你在项目里最常用的一套“配置模板”（建议直接抄）

```js
const bar = new cliProgress.SingleBar({
  format: '进度 |{bar}| {percentage}% | {value}/{total} | ETA:{eta}s | {speed}',
  barCompleteChar: '█',
  barIncompleteChar: '░',
  barsize: 30,
  hideCursor: true,
  fps: 10,
  clearOnComplete: false,
  stopOnComplete: true,
}, cliProgress.Presets.shades_classic);
```

然后更新：

```js
bar.start(total, 0, { speed: '0MB/s' });
bar.update(cur, { speed: '12.3MB/s' }); // payload 自定义 token
```

---

## 6) 容易踩坑的 5 点（你会“改不动”的通常在这）

1. **payload 不会“自动显示”**：必须在 `format` 里写 `{speed}` 才会出现。([GitHub][2])
2. 进度条运行期间尽量别 `console.log`，会把行打乱（建议暂停 bar 或用 MultiBar 的日志能力/统一输出流）。
3. `fps` 太高会让 CPU 明显上升，尤其你用 `setInterval(20ms)` 这种高频更新时。([GitHub][3])
4. MultiBar 子 bar 想用不同样式：用 `multibar.create(..., barOptionsOverride)`（CHANGES 提到已支持）。([GitHub][4])
5. 你的终端宽度不够时：`format` 太长会换行/覆盖，优先缩短 `format` 或调小 `barsize`。

---

如果你愿意，我可以把你现在那段 `cli-progress` 代码（你之前发的带 speed 的版本）拿来，按“你要改什么效果”逐项告诉你应该改 **哪个 option**、会带来 **什么显示变化**。你只要说：你想把进度条改成“下载文件”的样式，还是“批量任务”的样式。

[1]: https://www.npmjs.com/package/cli-progress?utm_source=chatgpt.com "cli-progress"
[2]: https://github.com/npkgz/cli-progress/blob/master/README.md?utm_source=chatgpt.com "cli-progress/README.md at master"
[3]: https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/cli-progress/cli-progress-tests.ts?utm_source=chatgpt.com "cli-progress-tests.ts - DefinitelyTyped"
[4]: https://github.com/npkgz/cli-progress/blob/master/CHANGES.md?utm_source=chatgpt.com "cli-progress/CHANGES.md at master"
[5]: https://github.com/npkgz/cli-progress/issues/128?utm_source=chatgpt.com "Payload does not work · Issue #128 · npkgz/cli-progress"

