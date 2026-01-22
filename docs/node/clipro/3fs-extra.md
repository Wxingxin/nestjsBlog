下面按“你写 Node CLI（脚手架/构建封装/部署工具）时最常用的能力”把 **fs-extra** 的常见用法与对应知识点系统整理一遍，并给出可直接复用的代码模式。

> fs-extra 的核心价值：在原生 `fs` 基础上补齐了 CLI 常用的高层操作（递归创建目录、拷贝目录、递归删除、JSON 读写、outputFile 等），并提供异步/同步两套 API。 ([NPM][1])

---

## 1) 安装与导入方式（ESM / CJS）

**知识点**

* fs-extra 导出是一个增强版 `fs`：你可以把它当成 `fs` 的“超集”来用（很多 `fs` 的 API 也能直接用）。 ([NPM][1])

```js
// ESM
import fs from "fs-extra";

// CJS
// const fs = require("fs-extra");
```

---

## 2) CLI 最常用的“确保存在”系列：ensureDir / ensureFile

### 2.1 `ensureDir(dir)`

**场景**

* 初始化项目目录
* 生成构建产物目录（如 `dist/`、`.cache/`）

**知识点**

* 等价于“递归 mkdir”（不需要你先判断父目录是否存在）。 ([GitHub][2])

```js
await fs.ensureDir("dist/assets");
```

### 2.2 `ensureFile(filePath)`

**场景**

* 生成 `.env`、`README.md`、`config.json` 等占位文件

**知识点**

* 会自动创建父目录；如果已存在不会改内容。 ([CSDN][3])
* 注意：中间路径如果被同名文件占据，会报错（例如把 `a.txt` 当成目录继续创建）。该类情况在 issue 中也被讨论过。 ([GitHub][4])

```js
await fs.ensureFile("config/.env");
```

---

## 3) 路径存在判断：pathExists（代替 fs.exists）

**场景**

* CLI 里决定是否覆盖、是否需要提示 `--force`

**知识点**

* `pathExists(path)` 返回 boolean（Promise），避免 `fs.exists` 的历史问题与回调风格。 ([CSDN][3])

```js
if (await fs.pathExists("dist")) {
  console.log("dist exists");
}
```

---

## 4) 复制/移动/删除：脚手架与构建工具的三件套

### 4.1 `copy(src, dest, options?)`

**场景**

* 脚手架：复制模板目录到目标目录
* 发布：复制资源文件到输出目录

**知识点**

* 可复制文件或目录（递归复制是它的核心能力之一）。 ([GitHub][2])

```js
await fs.copy("template", "my-app", {
  overwrite: true,
  errorOnExist: false,
});
```

**常用 options（非常实战）**

* `filter`: 过滤不需要的文件（如 `.git`、`node_modules`）
* `overwrite`: 是否覆盖
* `dereference`: 处理符号链接时是否跟随真实文件（做模板时经常要明确）

```js
await fs.copy("template", "my-app", {
  filter: (src) => !src.includes("node_modules") && !src.includes(".git"),
});
```

### 4.2 `move(src, dest, options?)`

**场景**

* 构建产物原子替换：先生成到临时目录，再 move 覆盖
* 重命名目录/文件

**知识点**

* 支持跨设备移动（比原生 rename 更“鲁棒”，遇到跨盘/跨设备更常见）。 ([CSDN][3])

```js
await fs.move(".tmp/dist", "dist", { overwrite: true });
```

### 4.3 `remove(path)`

**场景**

* `clean` 命令：删除 `dist/`、`.cache/`、临时文件

**知识点**

* 递归删除文件或目录，等价“rm -rf”。 ([GitHub][2])

```js
await fs.remove("dist");
```

---

## 5) 清空目录但保留目录：emptyDir

**场景**

* 每次构建前清空输出目录，但不想删除目录本身（避免权限/路径问题）

**知识点**

* `emptyDir(dir)`：确保目录为空；不存在则创建；存在则清空内容但保留目录。 ([CSDN][3])

```js
await fs.emptyDir("dist");
```

---

## 6) “写文件前自动建目录”：outputFile / outputJson

### 6.1 `outputFile(file, data)`

**场景**

* CLI 生成文件：`dist/report.txt`、`src/generated/index.ts`

**知识点**

* 与 `writeFile` 类似，但父目录不存在会自动创建。 ([CSDN][3])

```js
await fs.outputFile("dist/meta/build.txt", "build ok\n");
```

### 6.2 JSON：readJson / writeJson / outputJson

**场景**

* 读取/写入 `package.json`、工具配置文件
* CLI 修改用户项目配置

**知识点**

* `readJson` 直接读并解析 JSON
* `writeJson` 写入 JSON
* `outputJson` = 写入 JSON + 自动创建目录 ([GitHub][5])

```js
const pkg = await fs.readJson("package.json");

pkg.scripts ??= {};
pkg.scripts.build = "vite build";

await fs.writeJson("package.json", pkg, { spaces: 2 });
```

```js
await fs.outputJson("dist/meta/info.json", { ok: true }, { spaces: 2 });
```

---

## 7) 同步 vs 异步：CLI 里怎么选

**知识点**

* fs-extra 提供 `xxxSync` 与 async 版本（如 `copySync/removeSync/readJsonSync`）。 ([GitHub][5])
* CLI 建议默认使用 async/await（避免阻塞），但在“启动阶段少量 IO”或“非常简单的单次脚本”同步也可接受。

---

## 8) CLI 工程化模式：把 fs-extra 用成“可复用的文件系统层”

### 8.1 安全写入：临时文件 + move 覆盖（减少写到一半崩溃）

**适用**：写配置、生成产物、写 lock 信息

```js
import path from "node:path";
import fs from "fs-extra";

export async function atomicWriteJson(targetFile, data) {
  const dir = path.dirname(targetFile);
  const tmp = path.join(dir, `.${path.basename(targetFile)}.tmp`);

  await fs.ensureDir(dir);
  await fs.writeJson(tmp, data, { spaces: 2 });
  await fs.move(tmp, targetFile, { overwrite: true });
}
```

### 8.2 脚手架常见：目标目录存在时的策略（force/merge/abort）

```js
import fs from "fs-extra";

export async function prepareTargetDir(targetDir, { force = false } = {}) {
  const exists = await fs.pathExists(targetDir);
  if (!exists) {
    await fs.ensureDir(targetDir);
    return;
  }
  if (!force) {
    throw new Error(`Target directory exists: ${targetDir}. Use --force to overwrite.`);
  }
  await fs.emptyDir(targetDir);
}
```

---

## 9) 常见坑与注意事项（CLI 里非常高频）

1. **不要先 `pathExists` 再操作当作“无竞态保证”**
   多进程/并发情况下仍可能被插入更改；更稳妥是直接 try/catch 处理 EEXIST/ENOENT 等错误。

2. **copy/move/remove 会改动很多文件**
   CLI 里建议提供 `--dry-run`（只打印将要操作的路径），避免误删误覆盖。

3. **Windows 符号链接与权限**
   脚手架里如果涉及 symlink，需考虑 Windows 权限/开发者模式；必要时使用 `dereference` 或避免 symlink 模板。

4. **输出体验**
   大量文件操作建议配合 `cli-progress`（已知总量）或 `ora`（未知耗时），但注意进度条期间不要频繁 `console.log`。

---

## 10) 最常用 API 速查表（按 CLI 使用频率）

| 需求          | 推荐 API                                        |
| ----------- | --------------------------------------------- |
| 确保目录存在      | `ensureDir` ([GitHub][2])                     |
| 确保文件存在      | `ensureFile` ([CSDN][3])                      |
| 判断是否存在      | `pathExists` ([CSDN][3])                      |
| 复制模板/资源     | `copy` ([GitHub][2])                          |
| 移动/重命名/覆盖替换 | `move` ([CSDN][3])                            |
| 删除目录/文件（递归） | `remove` ([GitHub][2])                        |
| 清空输出目录      | `emptyDir` ([CSDN][3])                        |
| 写文件并自动建目录   | `outputFile` ([CSDN][3])                      |
| 读写 JSON 配置  | `readJson/writeJson/outputJson` ([GitHub][5]) |

---

如果你愿意，我可以基于你正在做的 CLI 类型（例如 `create-xxx` 脚手架、`build` 封装、`deploy` 工具），把 fs-extra 相关逻辑整理成一套“可直接放进项目”的 `src/fs/` 模块：包含原子写入、模板复制过滤、force 策略、日志/进度输出的一体化封装。你只要说你的 CLI 主要会操作哪些目录（模板、dist、配置文件）即可。

[1]: https://www.npmjs.com/package/fs-extra?utm_source=chatgpt.com "Node.js: fs-extra"
[2]: https://github.com/jprichardson/node-fs-extra?utm_source=chatgpt.com "jprichardson/node-fs-extra: Node.js: extra methods for the ..."
[3]: https://blog.csdn.net/tiven_/article/details/135363678?utm_source=chatgpt.com "fs-extra 文件操作的常用API 原创"
[4]: https://github.com/jprichardson/node-fs-extra/issues/696?utm_source=chatgpt.com "ensureFile misleading error message · Issue #696"
[5]: https://github.com/jprichardson/node-fs-extra/blob/master/test.mjs?utm_source=chatgpt.com "test.mjs - jprichardson/node-fs-extra"
