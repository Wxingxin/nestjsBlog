下面给你一份 **blessed / blessed-contrib 常见用法大全**（偏工程实战），包含：核心概念、常用组件、布局模式、事件与交互、数据刷新、blessed-contrib 图表、以及一套可直接跑的经典示例与项目结构建议。

> 运行环境默认 Node.js。示例以 ESM（`type: "module"`）写法为主；你也可以很容易改成 CommonJS。

---

## 1) 安装与最小可运行

### 安装

```bash
npm i blessed blessed-contrib
```

### 最小示例：一个可退出的 Screen

```js
import blessed from "blessed";

const screen = blessed.screen({
  smartCSR: true, // 更高效的重绘
  title: "Blessed Demo",
});

const box = blessed.box({
  parent: screen,
  top: "center",
  left: "center",
  width: "70%",
  height: "50%",
  border: "line",
  content: "Hello blessed!\nPress q / Esc / Ctrl+C to quit.",
  tags: true,
});

screen.key(["q", "C-c", "escape"], () => process.exit(0));

screen.render();
```

### 知识点

- **screen**：整个终端 UI 的根容器，负责渲染、键盘鼠标事件、重绘。
- **smartCSR**：优化重绘（强烈建议开启）。
- **screen.render()**：每次 UI 变化后需要触发渲染（很多组件 setContent 之后也需要 render）。

---

## 2) blessed 核心概念速览（必须掌握）

### 2.1 组件树（parent/child）

绝大多数组件都支持：

- `parent: screen` 或 `parent: 某个 box`
- 或者创建后 `parent.append(child)`

### 2.2 坐标与尺寸（top/left/width/height）

支持：

- 绝对数字：`top: 0`
- 百分比：`width: "50%"`
- 关键字：`"center"`, `"right"`, `"bottom"`

### 2.3 选择/聚焦（focus）

交互组件（list、textbox、button）通常需要聚焦：

- `screen.focusNext()` / `screen.focusPrev()`
- `component.focus()`

### 2.4 可滚动区域（scrollable）

- `scrollable: true`
- `alwaysScroll: true`
- `keys: true`（允许键盘滚动）
- `mouse: true`（允许鼠标滚轮）

---

## 3) blessed 常用组件与经典用法

### 3.1 Box：基础容器（布局、分区）

```js
const leftPanel = blessed.box({
  parent: screen,
  top: 0,
  left: 0,
  width: "30%",
  height: "100%",
  border: "line",
  label: " Left ",
});

const mainPanel = blessed.box({
  parent: screen,
  top: 0,
  left: "30%",
  width: "70%",
  height: "100%",
  border: "line",
  label: " Main ",
});
```

**知识点**

- Box 是最常用的“div”，做布局、包裹其他组件、加边框、加标题。

---

### 3.2 Text：静态文本

```js
const title = blessed.text({
  parent: leftPanel,
  top: 1,
  left: 2,
  content: "Server Monitor",
});
```

---

### 3.3 List：列表（可选择、回车确认）

```js
const menu = blessed.list({
  parent: leftPanel,
  top: 3,
  left: 1,
  width: "95%",
  height: "60%",
  border: "line",
  label: " Menu ",
  items: ["Overview", "Logs", "Processes"],
  keys: true,
  mouse: true,
  vi: true, // 支持 j/k
  style: {
    selected: { inverse: true },
  },
});

menu.on("select", (item, index) => {
  mainPanel.setContent(`You selected: ${item.getText()} (index=${index})`);
  screen.render();
});

menu.focus();
```

**知识点**

- `keys: true` 让上下键可用；`vi: true` 支持 j/k。
- `select` 事件是列表交互的核心。

---

### 3.4 Table：表格（适合状态列表）

```js
const table = blessed.listtable({
  parent: mainPanel,
  top: 1,
  left: 1,
  width: "98%",
  height: "60%",
  border: "line",
  label: " Services ",
  keys: true,
  mouse: true,
  align: "left",
  data: [
    ["Name", "Status", "Latency"],
    ["api", "OK", "32ms"],
    ["db", "OK", "12ms"],
    ["cache", "WARN", "120ms"],
  ],
});

screen.render();
```

**知识点**

- `listtable` 会把表格当作可选择列表处理，更适合交互。
- 频繁更新用 `setData()` 或直接覆盖 `data`（不同组件方法略有差异，见后面 contrib）。

---

### 3.5 Form + Textbox + Button：输入与提交

```js
const form = blessed.form({
  parent: mainPanel,
  top: "65%",
  left: 1,
  width: "98%",
  height: "30%",
  border: "line",
  label: " Search ",
  keys: true,
});

const input = blessed.textbox({
  parent: form,
  top: 1,
  left: 2,
  width: "70%",
  height: 3,
  border: "line",
  inputOnFocus: true,
  name: "query",
});

const btn = blessed.button({
  parent: form,
  top: 1,
  left: "75%",
  width: 12,
  height: 3,
  border: "line",
  content: "Search",
  mouse: true,
  keys: true,
  shrink: true,
  style: {
    focus: { inverse: true },
    hover: { inverse: true },
  },
});

btn.on("press", () => form.submit());

form.on("submit", (data) => {
  mainPanel.setContent(`Submitted query: ${data.query || ""}`);
  screen.render();
});

input.focus();
```

**知识点**

- `textbox` 通常要 `inputOnFocus: true`
- `form.submit()` + `form.on('submit')` 是典型模式
- 按钮 press 事件与 hover/focus 样式属于常规交互要点

---

### 3.6 Log：滚动日志面板（非常常用）

```js
const log = blessed.log({
  parent: mainPanel,
  top: 1,
  left: 1,
  width: "98%",
  height: "90%",
  border: "line",
  label: " Logs ",
  scrollable: true,
  alwaysScroll: true,
  keys: true,
  mouse: true,
});

let n = 0;
setInterval(() => {
  log.log(`log line #${++n} at ${new Date().toLocaleTimeString()}`);
  screen.render();
}, 1000);
```

**知识点**

- `alwaysScroll: true` 能持续跟随最新日志
- 日志更新通常定时 + `screen.render()`

---

## 4) blessed-contrib：仪表盘与图表（核心卖点）

`blessed-contrib` 基于 blessed 提供现成可视化组件，典型用途：系统监控、任务面板、实时图表。

### 4.1 最推荐：grid 布局（仪表盘标准写法）

```js
import blessed from "blessed";
import contrib from "blessed-contrib";

const screen = blessed.screen({ smartCSR: true, title: "Dashboard" });
screen.key(["q", "C-c", "escape"], () => process.exit(0));

const grid = new contrib.grid({ rows: 12, cols: 12, screen });

// 折线图：CPU
const cpuLine = grid.set(0, 0, 6, 8, contrib.line, {
  label: "CPU Load (%)",
  showLegend: true,
  minY: 0,
  maxY: 100,
});

// 仪表盘：Memory
const memGauge = grid.set(0, 8, 3, 4, contrib.gauge, {
  label: "Memory",
  stroke: "green",
  fill: "white",
});

// 表格：Top Processes（示例）
const procTable = grid.set(6, 0, 6, 12, contrib.table, {
  label: "Top Processes",
  columnWidth: [24, 10, 10],
});

let t = 0;
const x = [];
const y = [];

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

setInterval(() => {
  t += 1;

  // 模拟数据（真实项目替换为 systeminformation 等数据源）
  const cpu = clamp(
    Math.round(40 + 30 * Math.sin(t / 4) + Math.random() * 10),
    0,
    100,
  );
  const mem = clamp(
    Math.round(60 + 20 * Math.cos(t / 5) + Math.random() * 8),
    0,
    100,
  );

  x.push(t.toString());
  y.push(cpu);
  if (x.length > 30) {
    x.shift();
    y.shift();
  }

  cpuLine.setData([{ title: "cpu", x, y }]);

  memGauge.setData([mem]);

  procTable.setData({
    headers: ["Name", "CPU", "MEM"],
    data: [
      ["node", `${cpu}%`, `${mem}%`],
      ["nginx", `${clamp(cpu - 10, 0, 100)}%`, `${clamp(mem - 20, 0, 100)}%`],
      ["mongo", `${clamp(cpu - 20, 0, 100)}%`, `${clamp(mem - 10, 0, 100)}%`],
    ],
  });

  screen.render();
}, 800);

screen.render();
```

**知识点**

- `contrib.grid` 适合做“监控大屏”，避免手写 top/left。
- `line.setData([...])`：折线图通常接收 series 数组。
- `gauge.setData([value])`：gauge 通常是 0~100。
- `table.setData({ headers, data })`：contrib.table 结构化数据更新。

---

### 4.2 常见图表组件与 setData 形态（速查）

| 组件            | 用途              | 常见 setData 形态                                     |
| --------------- | ----------------- | ----------------------------------------------------- |
| `contrib.line`  | 折线趋势          | `[{ title, x: [], y: [] }]`                           |
| `contrib.bar`   | 柱状对比          | `{ titles: [], data: [] }` 或数组形态（版本略有差异） |
| `contrib.donut` | 占比/环形图       | `[{ percent, label, color? }, ...]`                   |
| `contrib.gauge` | 单指标百分比      | `[value]`                                             |
| `contrib.table` | 列表/表格         | `{ headers: [], data: [[],[]] }`                      |
| `contrib.log`   | 日志（contrib版） | `log.log(str)`                                        |

> 注：不同版本的 blessed-contrib 在部分图表（尤其 bar/donut）参数上会有细微差异；工程上建议你固定依赖版本，并以你安装版本的 README 为准。

---

## 5) 交互与事件：键盘、鼠标、Resize

### 5.1 全局快捷键（强烈建议）

```js
screen.key(["tab"], () => {
  screen.focusNext();
  screen.render();
});

screen.key(["S-tab"], () => {
  screen.focusPrev();
  screen.render();
});
```

### 5.2 鼠标支持

给组件开启：

- `mouse: true`
- 某些组件还需要 `scrollable: true`

### 5.3 终端大小变化

```js
screen.on("resize", () => {
  // grid 通常会自动适配，但你仍可在此做额外处理
  screen.render();
});
```

---

## 6) 数据刷新与性能（真实项目的关键）

### 6.1 典型刷新策略

- **固定 interval**（例如 500ms~2000ms）
- **先更新数据，再更新 UI，再 render**
- 避免每个组件单独 render（集中一次 render）

### 6.2 避免闪烁与高 CPU

- 开启 `smartCSR`
- 控制刷新频率（监控一般 1s 足够）
- 不要一次性 setContent 超长字符串（日志用 log 组件）

---

## 7) 工程化项目结构建议（可维护）

```txt
src/
  app.js                 // 入口：创建 screen / grid / 绑定 key
  ui/
    dashboard.js         // 创建各 widgets，暴露 update(data)
  services/
    metrics.js           // 数据采集：systeminformation / API / Docker
  state/
    store.js             // 聚合状态（可选）
```

典型模式：UI 不直接拿数据，而是由 services 提供标准化数据对象：

```js
// metrics.js
export async function getMetrics() {
  return {
    cpu: 42,
    mem: 68,
    procs: [{ name: "node", cpu: 12, mem: 20 }],
  };
}
```

---

## 8) 一个“实战级”整合模板（UI + 数据 + 刷新）

下面给你一个通用模板，你把 `getMetrics()` 换成 systeminformation/接口就能变成真监控：

```js
import blessed from "blessed";
import contrib from "blessed-contrib";

async function getMetrics() {
  // TODO: 替换为真实数据源（systeminformation / dockerode / axios 等）
  const cpu = Math.floor(30 + Math.random() * 60);
  const mem = Math.floor(40 + Math.random() * 50);
  return {
    cpu,
    mem,
    procs: [
      { name: "node", cpu: cpu - 10, mem: mem - 15 },
      { name: "nginx", cpu: cpu - 20, mem: mem - 25 },
      { name: "mongo", cpu: cpu - 30, mem: mem - 5 },
    ].map((p) => ({
      ...p,
      cpu: Math.max(0, Math.min(100, p.cpu)),
      mem: Math.max(0, Math.min(100, p.mem)),
    })),
  };
}

const screen = blessed.screen({ smartCSR: true, title: "Ops Dashboard" });
screen.key(["q", "C-c", "escape"], () => process.exit(0));

const grid = new contrib.grid({ rows: 12, cols: 12, screen });

const cpuLine = grid.set(0, 0, 6, 8, contrib.line, {
  label: "CPU (%)",
  minY: 0,
  maxY: 100,
});
const memGauge = grid.set(0, 8, 3, 4, contrib.gauge, { label: "Memory (%)" });
const status = grid.set(3, 8, 3, 4, blessed.box, {
  label: "Status",
  border: "line",
  content: "OK",
});
const table = grid.set(6, 0, 6, 12, contrib.table, {
  label: "Processes",
  columnWidth: [24, 10, 10],
});

const x = [];
const y = [];
let tick = 0;

async function loop() {
  try {
    const m = await getMetrics();

    tick += 1;
    x.push(tick.toString());
    y.push(m.cpu);
    if (x.length > 30) {
      x.shift();
      y.shift();
    }

    cpuLine.setData([{ title: "cpu", x, y }]);
    memGauge.setData([m.mem]);

    status.setContent(`Last update:\n${new Date().toLocaleTimeString()}`);

    table.setData({
      headers: ["Name", "CPU", "MEM"],
      data: m.procs.map((p) => [p.name, `${p.cpu}%`, `${p.mem}%`]),
    });

    screen.render();
  } catch (e) {
    status.setContent(`Error:\n${String(e?.message || e)}`);
    screen.render();
  }
}

setInterval(loop, 1000);
loop();
screen.render();
```

**知识点**

- “**数据层失败不应拖垮 UI**”：try/catch + status 区展示错误
- “**一次 tick 集中 render**”：提升性能与稳定性
- “**UI 与数据源解耦**”：换数据源不改 UI

---

## 9) 常见坑与规避（经验型）

1. **忘了 `screen.render()`**：UI 不更新最常见原因。
2. **交互组件没 focus**：`textbox/list/button` 不响应键盘。
3. **布局被覆盖**：box 区域重叠；优先用 `grid` 或明确 top/left/width/height。
4. **刷新太频繁**：500ms 以下很容易 CPU 高、闪烁。
5. **终端兼容问题**：不同终端对 Unicode/宽字符支持不同；尽量避免复杂字符画。
6. **退出时清理**：真实项目建议监听 `process.on('SIGINT')` 做收尾（例如恢复终端光标等）。

---

## 10) 下一步建议（基于你前端背景的最优路线）

如果你目标是“做一个能写进简历的工具”：

- 先用 **grid + line + gauge + table + log** 做出一个监控面板壳子
- 再接入数据源：
  - 本机：`systeminformation`
  - Docker：`dockerode`
  - 远端：WebSocket/HTTP 拉取

如果你希望我继续，我可以直接给你一套“systeminformation + blessed-contrib 真监控”的完整实现（含 CPU/内存/磁盘/网络/进程 TopN），并按工程结构拆成多个文件，保证你复制到项目就能跑。你只要告诉我你用的是 **Windows / macOS / Linux**，我会顺带规避该平台常见兼容点。
