下面给你一份 **`blessed-contrib` 在命令行里绘制「柱状图 / 折线图」的常见使用大全**（可直接复制运行）。我会先给一个通用 Dashboard 骨架，再分别讲 **bar / line** 的数据格式、常用参数、动态更新、以及坑点。

> 约定：Node ESM（`type: "module"` 或 `.mjs`），终端支持 ANSI。
> 安装：`npm i blessed blessed-contrib`

---

## 1）最常用的 Dashboard 骨架（所有图表都基于它）

`blessed-contrib` 本质是：**blessed 的组件 + 内置图表组件**。
你要做图表，核心流程永远是：

1. `screen`（终端画布）
2. `grid`（布局）
3. `chart.setData(...)`（喂数据）
4. `screen.render()`（刷新）

```js
// dashboard.mjs
import blessed from "blessed";
import contrib from "blessed-contrib";

const screen = blessed.screen({ smartCSR: true, title: "Charts Dashboard" });
screen.key(["q", "C-c"], () => process.exit(0));

// 12x12 网格布局（最常用）
const grid = new contrib.grid({ rows: 12, cols: 12, screen });

// 你后面把图表放到 grid 里：grid.set(row, col, rowSpan, colSpan, widget, opts)

screen.render();
```

> 记住：**所有更新 UI，都要 `screen.render()`**。

---

## 2）柱状图 Bar Chart：最常见用法大全

### 2.1 最小可运行：绘制柱状图

`bar` 组件的数据格式通常是：

```js
bar.setData({
  titles: ["A", "B", "C"],
  data: [5, 10, 3],
});
```

完整示例：

```js
// bar.mjs
import blessed from "blessed";
import contrib from "blessed-contrib";

const screen = blessed.screen({ smartCSR: true, title: "Bar Chart" });
screen.key(["q", "C-c"], () => process.exit(0));

const grid = new contrib.grid({ rows: 12, cols: 12, screen });

const bar = grid.set(0, 0, 12, 12, contrib.bar, {
  label: "请求数（Bar）",
  barWidth: 6, // 柱子宽度（字符）
  barSpacing: 4, // 柱子间距
  xOffset: 2, // X 轴偏移（避免贴边）
  maxHeight: 20, // Y 最大高度（影响比例）
});

bar.setData({
  titles: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  data: [12, 5, 18, 9, 14, 7, 20],
});

screen.render();
```

运行：

```bash
node bar.mjs
```

---

### 2.2 柱状图常用配置项（你会经常调）

- `label`：面板标题
- `barWidth`：柱子粗细（字符宽度）
- `barSpacing`：柱间距
- `xOffset`：让坐标轴不挤
- `maxHeight`：决定视觉比例（不设也行，但设了更稳）
- `style`：配色（一般不用你硬写，默认也能看）

> 注意：终端“像素”是字符格，宽度不足就会挤成一坨，所以 **barWidth/barSpacing 很关键**。

---

### 2.3 动态刷新柱状图（实时更新）

```js
// bar-live.mjs
import blessed from "blessed";
import contrib from "blessed-contrib";

const screen = blessed.screen({ smartCSR: true, title: "Bar Live" });
screen.key(["q", "C-c"], () => process.exit(0));
const grid = new contrib.grid({ rows: 12, cols: 12, screen });

const bar = grid.set(0, 0, 12, 12, contrib.bar, { label: "实时 QPS" });

const titles = ["A", "B", "C", "D", "E"];
let values = [5, 8, 2, 9, 3];

function tick() {
  // 模拟数据变化
  values = values.map((v) =>
    Math.max(0, v + Math.floor(Math.random() * 7 - 3))
  );
  bar.setData({ titles, data: values });
  screen.render();
}

tick();
setInterval(tick, 800);
```

---

## 3）折线图 Line Chart：最常见用法大全

### 3.1 最小可运行：绘制折线图

`line` 组件的数据格式通常是：一个数组，多条线每条一个对象：

```js
line.setData([
  { title: 'cpu', x: [...], y: [...] },
  { title: 'mem', x: [...], y: [...] }
]);
```

完整示例：

```js
// line.mjs
import blessed from "blessed";
import contrib from "blessed-contrib";

const screen = blessed.screen({ smartCSR: true, title: "Line Chart" });
screen.key(["q", "C-c"], () => process.exit(0));
const grid = new contrib.grid({ rows: 12, cols: 12, screen });

const line = grid.set(0, 0, 12, 12, contrib.line, {
  label: "CPU / MEM（Line）",
  showLegend: true, // 显示图例
  wholeNumbersOnly: false, // 允许小数
  minY: 0, // Y 轴最小值（可选）
  // maxY: 100,          // 你想固定比例时再开
});

const x = ["00", "01", "02", "03", "04", "05", "06", "07"];
line.setData([
  { title: "cpu", x, y: [10, 30, 25, 40, 35, 50, 45, 60] },
  { title: "mem", x, y: [20, 22, 28, 30, 34, 38, 36, 40] },
]);

screen.render();
```

运行：

```bash
node line.mjs
```

---

### 3.2 折线图常用配置项（很实用）

- `showLegend: true`：多条线必开
- `minY / maxY`：固定纵轴范围（做监控很需要）
- `wholeNumbersOnly`：是否只显示整数
- `style`：线条颜色/图例颜色（一般默认够用）

---

### 3.3 动态刷新折线图（滚动时间窗）

最常见：保留最近 N 个点（比如最近 30 秒）。

```js
// line-live.mjs
import blessed from "blessed";
import contrib from "blessed-contrib";

const screen = blessed.screen({ smartCSR: true, title: "Line Live" });
screen.key(["q", "C-c"], () => process.exit(0));
const grid = new contrib.grid({ rows: 12, cols: 12, screen });

const line = grid.set(0, 0, 12, 12, contrib.line, {
  label: "实时指标（最近 20 点）",
  showLegend: true,
  minY: 0,
  maxY: 100,
});

const N = 20;
let t = 0;
let cpu = Array(N).fill(20);
let mem = Array(N).fill(40);

function tick() {
  t++;

  // 模拟数据波动
  const nextCpu = Math.max(
    0,
    Math.min(100, cpu[cpu.length - 1] + (Math.random() * 20 - 10))
  );
  const nextMem = Math.max(
    0,
    Math.min(100, mem[mem.length - 1] + (Math.random() * 12 - 6))
  );

  cpu = cpu.slice(1).concat(nextCpu);
  mem = mem.slice(1).concat(nextMem);

  const x = Array.from({ length: N }, (_, i) =>
    String(t - (N - 1 - i)).padStart(2, "0")
  );

  line.setData([
    { title: "cpu", x, y: cpu },
    { title: "mem", x, y: mem },
  ]);

  screen.render();
}

tick();
setInterval(tick, 800);
```

---

## 4）一个“柱状图 + 折线图”的完整 Dashboard（最贴近实战）

上：折线（趋势）
下：柱状（分布）

```js
// combo-dashboard.mjs
import blessed from "blessed";
import contrib from "blessed-contrib";

const screen = blessed.screen({ smartCSR: true, title: "Combo Dashboard" });
screen.key(["q", "C-c"], () => process.exit(0));

const grid = new contrib.grid({ rows: 12, cols: 12, screen });

const line = grid.set(0, 0, 7, 12, contrib.line, {
  label: "吞吐趋势（Line）",
  showLegend: true,
  minY: 0,
  maxY: 100,
});

const bar = grid.set(7, 0, 5, 12, contrib.bar, {
  label: "模块耗时（Bar）",
  barWidth: 6,
  barSpacing: 4,
  xOffset: 2,
  maxHeight: 30,
});

const N = 16;
let tickNo = 0;
let series = Array(N).fill(30);

const modules = ["auth", "db", "cache", "api", "queue"];
let costs = [8, 18, 6, 12, 10];

function tick() {
  tickNo++;

  // line 数据滚动
  const next = Math.max(
    0,
    Math.min(100, series[series.length - 1] + (Math.random() * 20 - 10))
  );
  series = series.slice(1).concat(next);
  const x = Array.from({ length: N }, (_, i) => String(tickNo - (N - 1 - i)));

  line.setData([{ title: "qps", x, y: series }]);

  // bar 数据变化
  costs = costs.map((v) => Math.max(0, v + Math.floor(Math.random() * 7 - 3)));
  bar.setData({ titles: modules, data: costs });

  screen.render();
}

tick();
setInterval(tick, 900);
```

---

## 5）常见坑（你会遇到的那种）

### 坑 1：忘记 `screen.render()`

更新数据后不 render，界面不会变。

### 坑 2：x/y 长度不一致

折线图里 `x.length` 必须和 `y.length` 对齐（多条线也要各自对齐）。

### 坑 3：终端太窄导致柱状图挤爆

调 `barWidth / barSpacing`，或者减少 `titles` 数量。

### 坑 4：不要用 `console.log`

会破坏 TUI。要日志用 `contrib.log`（或 blessed 的 `log`）。

### 坑 5：中文显示宽度问题

某些终端/字体对全角宽度处理不一致，会导致对齐抖动。解决思路：

- 尽量让坐标标签用英文/数字
- 或调大面板宽度、减少标签长度

---

## 6）你下一步最该做什么（实战建议）

你如果是做“监控面板 / 下载器 / 任务执行器”，我建议结构这样：

- `prompts`：启动前收集参数（可选）
- `blessed-contrib`：跑任务时实时图表 + 日志
- 任务结束：退出 TUI，输出最终总结（或保存 JSON）

---

如果你告诉我你要画的数据是什么（比如“接口 QPS、延迟、错误率”或“CPU/内存/磁盘”），我可以把上面的 demo 直接改成**贴你数据结构的版本**：包含数据采集、时间窗、平滑、阈值告警（比如超阈值闪烁/提示）。
