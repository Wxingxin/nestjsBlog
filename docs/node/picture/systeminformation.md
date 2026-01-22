下面我用**“CLI 场景”**把 `systeminformation` 的使用方式**从最基础到工程化**讲清楚，重点放在：
👉 **在命令行程序里它是怎么被用起来的**
👉 **和 blessed / 普通 CLI 的结合模式**

---

## 一句话先给结论

> **systeminformation 在 CLI 中 = 一个“系统数据采集 SDK”**
> 它本身 **不关心 UI、不关心终端**，只负责**准确、跨平台地拿系统信息**。

在 CLI 里它通常以三种形态出现：

1. **一次性输出（类似 top -n 1）**
2. **持续刷新（监控型 CLI）**
3. **作为数据层 + UI 层（blessed / blessed-contrib / Ink）**

---

## 一、最基础：systeminformation 在 CLI 中“直接用”

### 1️⃣ 最小 CLI 示例（无 UI）

```js
#!/usr/bin/env node
import si from "systeminformation";

async function main() {
  const cpu = await si.currentLoad();
  const mem = await si.mem();

  console.log("CPU Load:", cpu.currentLoad.toFixed(2), "%");
  console.log(
    "Memory:",
    ((mem.used / mem.total) * 100).toFixed(2),
    "%"
  );
}

main();
```

运行：

```bash
node index.js
```

或加上可执行权限：

```bash
chmod +x index.js
./index.js
```

### 知识点

* systeminformation **100% Promise API**
* CLI 中通常 **await → console.log**
* 适合脚本、CI、一次性检测

---

## 二、真实 CLI 常见模式一：表格式输出

CLI 工具很少直接 dump JSON，而是格式化输出。

### 示例：进程 Top 列表

```js
import si from "systeminformation";

async function showProcesses() {
  const data = await si.processes();

  const top = data.list
    .sort((a, b) => b.cpu - a.cpu)
    .slice(0, 5)
    .map(p => ({
      pid: p.pid,
      name: p.name,
      cpu: p.cpu.toFixed(1) + "%",
      mem: p.mem.toFixed(1) + "%",
    }));

  console.table(top);
}

showProcesses();
```

输出类似：

```txt
┌─────┬─────┬─────────┬─────────┐
│ pid │ name│ cpu     │ mem     │
├─────┼─────┼─────────┼─────────┤
│ 123 │ node│ 12.4%   │ 5.1%    │
│ 456 │ chrome│ 9.8%  │ 10.2%   │
└─────┴─────┴─────────┴─────────┘
```

### 知识点

* `si.processes()` 是 CLI 最常用 API 之一
* systeminformation 返回的数据 **非常“原始”**
* CLI 工具几乎一定会 **二次整理 / 排序 / 截断**

---

## 三、真实 CLI 常见模式二：持续刷新（监控型）

这一步开始，就非常像 `top / htop` 了。

### 例：每秒刷新系统状态（无 UI）

```js
import si from "systeminformation";

async function loop() {
  console.clear();

  const cpu = await si.currentLoad();
  const mem = await si.mem();

  console.log("=== System Monitor ===");
  console.log("CPU:", cpu.currentLoad.toFixed(1), "%");
  console.log(
    "MEM:",
    ((mem.used / mem.total) * 100).toFixed(1),
    "%"
  );
}

setInterval(loop, 1000);
```

### 知识点

* `console.clear()` 是最简“伪 UI”
* 很多早期 CLI 监控工具就是这个思路
* 缺点：**闪屏、交互差、不可组合**

👉 这正是 **blessed 出现的原因**

---

## 四、工程级 CLI：systeminformation + commander

### 示例：带参数的 CLI 工具

```js
import { Command } from "commander";
import si from "systeminformation";

const program = new Command();

program
  .name("sys")
  .description("System information CLI")
  .version("1.0.0");

program
  .command("cpu")
  .description("Show CPU info")
  .action(async () => {
    const cpu = await si.cpu();
    console.log(cpu);
  });

program
  .command("mem")
  .description("Show memory usage")
  .action(async () => {
    const mem = await si.mem();
    console.log(
      `Used: ${(mem.used / mem.total * 100).toFixed(1)}%`
    );
  });

program.parse();
```

运行：

```bash
sys cpu
sys mem
```

### 知识点

* systeminformation **非常适合做子命令的数据源**
* commander / yargs 负责 CLI 结构
* systeminformation 负责“数据真相”

---

## 五、systeminformation + blessed（CLI UI 的标准形态）

### 这是 systeminformation 在 CLI 中**最典型、最正确**的用法

角色分工非常清晰：

| 模块                | 职责      |
| ----------------- | ------- |
| systeminformation | 拿系统数据   |
| 定时器               | 控制刷新频率  |
| blessed / contrib | 展示 & 交互 |

### 最小示意代码

```js
import blessed from "blessed";
import si from "systeminformation";

const screen = blessed.screen({
  smartCSR: true,
  title: "System Monitor",
});

screen.key(["q", "C-c", "escape"], () => process.exit(0));

const box = blessed.box({
  parent: screen,
  top: "center",
  left: "center",
  width: "50%",
  height: "30%",
  border: "line",
  label: " Stats ",
});

async function update() {
  const cpu = await si.currentLoad();
  const mem = await si.mem();

  box.setContent(
    `CPU: ${cpu.currentLoad.toFixed(1)}%\n` +
    `MEM: ${(mem.used / mem.total * 100).toFixed(1)}%`
  );

  screen.render();
}

setInterval(update, 1000);
update();
```

### 知识点（非常重要）

* systeminformation **不直接操作 UI**
* UI 更新 = `setContent / setData + screen.render()`
* 刷新频率建议 ≥ 800ms

---

## 六、systeminformation + blessed-contrib（专业监控 CLI）

在 **真实项目 / GitHub 项目**中，systeminformation 几乎都和 `blessed-contrib` 一起出现。

### 典型用法（简化版）

```js
import blessed from "blessed";
import contrib from "blessed-contrib";
import si from "systeminformation";

const screen = blessed.screen({ smartCSR: true });
screen.key(["q", "C-c"], () => process.exit(0));

const grid = new contrib.grid({ rows: 12, cols: 12, screen });

const cpuLine = grid.set(0, 0, 6, 12, contrib.line, {
  label: "CPU (%)",
  minY: 0,
  maxY: 100,
});

const x = [];
const y = [];
let t = 0;

async function tick() {
  const cpu = await si.currentLoad();

  t++;
  x.push(t.toString());
  y.push(cpu.currentLoad);
  if (x.length > 30) {
    x.shift();
    y.shift();
  }

  cpuLine.setData([{ title: "cpu", x, y }]);
  screen.render();
}

setInterval(tick, 1000);
```

### 知识点

* systeminformation → 原始数据
* contrib → 可视化
* grid → 工程级布局（避免手写坐标）

---

## 七、systeminformation 在 CLI 中常用 API 分类（速查）

### 🔹 CPU

```js
si.cpu()
si.currentLoad()
```

### 🔹 内存

```js
si.mem()
```

### 🔹 磁盘

```js
si.fsSize()
si.diskLayout()
```

### 🔹 网络

```js
si.networkStats()
si.networkInterfaces()
```

### 🔹 进程（CLI 最爱）

```js
si.processes()
```

### 🔹 Docker

```js
si.dockerAll()
si.dockerContainers()
```

---

## 八、为什么 systeminformation 特别适合 CLI？

这是重点理解：

1. **无 UI 依赖**（纯 Node）
2. **跨平台一致性好**
3. **数据粒度适合“终端展示”**
4. **Promise API 非常适合 async CLI**
5. **社区事实标准（运维 / DevOps）**

👉 很多 JS 写的 CLI 监控工具：

* UI 层不同
* **数据层几乎清一色 systeminformation**

---

## 九、给你的专业建议（结合你前端 + 工程背景）

如果你目标是 **学会“CLI 工程能力”**：

### 推荐练习路径

1. systeminformation + console.table（脚本）
2. systeminformation + commander（多命令）
3. systeminformation + setInterval（刷新）
4. systeminformation + blessed
5. systeminformation + blessed-contrib（完整监控）

👉 到第 5 步，你已经能写 **htop 级别的 JS CLI**

---

## 十、我可以下一步直接帮你做的事

如果你愿意，我可以直接给你：

* **systeminformation + blessed-contrib 的完整监控 CLI**

  * CPU / MEM / Disk / Network / Process Top
  * 清晰的工程结构
  * 可直接跑、可写进简历

你只要告诉我一句话：
👉 **“我要最小 Demo 还是完整工程版”**
