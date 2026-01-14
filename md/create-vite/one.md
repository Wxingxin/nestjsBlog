下面给你一个**完整可运行**的“create-vite 简化版”，已经用 **`prompts` 做交互**（选择模板、是否 TS、是否安装依赖）。你复制粘贴就能在 Node 里跑起来。

---

## 1）先安装 prompts

在你放脚手架脚本的目录里执行：

```bash
npm i prompts
```

---

## 2）保存为 `create-mini-vite-prompts.mjs`

```js
#!/usr/bin/env node
/**
 * create-mini-vite-prompts.mjs
 * 用法：
 *   node create-mini-vite-prompts.mjs
 *   node create-mini-vite-prompts.mjs my-app
 *
 * 需要：Node 18+（推荐 20+）
 * 依赖：prompts
 */

import prompts from "prompts";
import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

function log(msg) {
  process.stdout.write(msg + "\n");
}
function warn(msg) {
  process.stderr.write(msg + "\n");
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const positionals = args.filter((a) => !a.startsWith("-"));
  return { projectName: positionals[0] };
}

function isValidPackageName(name) {
  // 简化校验：小写字母开头，可含数字/-/_
  return /^[a-z][a-z0-9-_]*$/.test(name);
}

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function isDirEmpty(dir) {
  const entries = await fs.readdir(dir);
  return entries.filter((e) => e !== ".DS_Store").length === 0;
}

function getPkgManager() {
  // 最稳：默认 npm（你可以扩展识别 pnpm/yarn/bun）
  return "npm";
}

function runCommand(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

async function writeFileSafe(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
}

/* -----------------------------
 * 模板生成（Vanilla / React）
 * JS / TS 两套
 * ----------------------------- */

function pkgJson(projectName, isTs, framework) {
  const scripts =
    framework === "react"
      ? {
          dev: "vite",
          build: "vite build",
          preview: "vite preview",
        }
      : {
          dev: "vite",
          build: "vite build",
          preview: "vite preview",
        };

  const devDependencies = { vite: "^5.0.0" };
  const dependencies = {};

  if (framework === "react") {
    dependencies.react = "^18.0.0";
    dependencies["react-dom"] = "^18.0.0";
    devDependencies["@vitejs/plugin-react"] = "^4.0.0";
  }

  if (isTs) {
    // TS：最小可用集合（够跑起来）
    devDependencies.typescript = "^5.0.0";
    if (framework === "react") {
      devDependencies["@types/react"] = "^18.0.0";
      devDependencies["@types/react-dom"] = "^18.0.0";
    }
  }

  return JSON.stringify(
    {
      name: projectName,
      private: true,
      version: "0.0.0",
      type: "module",
      scripts,
      dependencies: Object.keys(dependencies).length ? dependencies : undefined,
      devDependencies,
    },
    null,
    2
  );
}

function viteConfig(framework) {
  if (framework !== "react") {
    // vanilla：不需要插件
    return `import { defineConfig } from 'vite'

export default defineConfig({})
`;
  }

  return `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
`;
}

function tsConfig(framework) {
  // 简化版，足够用
  const jsx = framework === "react" ? `"jsx": "react-jsx",\n    ` : "";
  return `{
  "compilerOptions": {
    ${jsx}"target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src"]
}
`;
}

function vanillaIndexHtml(projectName) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="app">
      <h1>${projectName}</h1>
      <p>✅ Vanilla + Vite</p>
      <button id="btn">Click</button>
      <pre id="out"></pre>
    </div>
    <script type="module" src="/src/main.${"js"}"></script>
  </body>
</html>
`;
}

function vanillaMainJs() {
  return `import "./style.css";

const btn = document.querySelector("#btn");
const out = document.querySelector("#out");

let count = 0;
btn.addEventListener("click", () => {
  count++;
  out.textContent = "clicked: " + count;
});
`;
}

function vanillaMainTs() {
  return `import "./style.css";

const btn = document.querySelector<HTMLButtonElement>("#btn")!;
const out = document.querySelector<HTMLPreElement>("#out")!;

let count = 0;
btn.addEventListener("click", () => {
  count++;
  out.textContent = "clicked: " + count;
});
`;
}

function vanillaStyleCss() {
  return `:root{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5}
body{margin:0;padding:24px}
#app{max-width:680px;margin:0 auto}
button{padding:10px 14px;border:1px solid #aaa;background:#fff;border-radius:8px;cursor:pointer}
pre{margin-top:16px;padding:12px;background:#f6f6f6;border-radius:8px;min-height:48px}
`;
}

function reactIndexHtml(projectName) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.${"jsx"}"></script>
  </body>
</html>
`;
}

function reactIndexHtmlTs(projectName) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.${"tsx"}"></script>
  </body>
</html>
`;
}

function reactMainJsx() {
  return `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;
}

function reactMainTsx() {
  return `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;
}

function reactAppJsx(projectName) {
  return `export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>${projectName}</h1>
      <p>✅ React + Vite</p>
    </div>
  );
}
`;
}

function reactAppTsx(projectName) {
  return `export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>${projectName}</h1>
      <p>✅ React + Vite + TypeScript</p>
    </div>
  );
}
`;
}

function reactIndexCss() {
  return `:root{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5}
body{margin:0}
`;
}

/* -----------------------------
 * 主流程
 * ----------------------------- */

async function main() {
  const { projectName: argName } = parseArgs(process.argv);

  const questions = [
    {
      type: argName ? null : "text",
      name: "projectName",
      message: "项目名（package name）",
      initial: "my-app",
      validate: (v) => (isValidPackageName(v) ? true : "只允许小写字母开头，含数字/-/_"),
    },
    {
      type: "select",
      name: "template",
      message: "选择模板",
      choices: [
        { title: "Vanilla（原生）", value: "vanilla" },
        { title: "React", value: "react" },
      ],
      initial: 0,
    },
    {
      type: "confirm",
      name: "useTs",
      message: "是否使用 TypeScript？",
      initial: true,
    },
    {
      type: "confirm",
      name: "install",
      message: "是否安装依赖？",
      initial: true,
    },
  ];

  const answers = await prompts(questions, {
    onCancel() {
      warn("\n❌ 已取消");
      process.exit(1);
    },
  });

  const projectName = argName ?? answers.projectName;
  const template = answers.template;
  const useTs = answers.useTs;
  const install = answers.install;

  if (!projectName) {
    warn("❌ 未提供项目名");
    process.exit(1);
  }
  if (!isValidPackageName(projectName)) {
    warn("❌ 项目名不合法：" + projectName);
    process.exit(1);
  }

  const targetDir = path.resolve(process.cwd(), projectName);

  if (await pathExists(targetDir)) {
    const empty = await isDirEmpty(targetDir);
    if (!empty) {
      // 这里也可以做“是否覆盖”的 prompts，本例先简单退出
      warn(`❌ 目录已存在且不为空：${targetDir}`);
      warn("请换个项目名，或删除目录后重试。");
      process.exit(1);
    }
  } else {
    await fs.mkdir(targetDir, { recursive: true });
  }

  log(`\n📁 创建项目：${projectName}`);
  log(`📌 模板：${template}${useTs ? "+ts" : ""}`);
  log(`📌 目录：${targetDir}`);

  // 写 package.json / vite config
  await writeFileSafe(path.join(targetDir, "package.json"), pkgJson(projectName, useTs, template));
  await writeFileSafe(path.join(targetDir, "vite.config.js"), viteConfig(template));

  // TS 配置
  if (useTs) {
    await writeFileSafe(path.join(targetDir, "tsconfig.json"), tsConfig(template));
  }

  // .gitignore
  await writeFileSafe(
    path.join(targetDir, ".gitignore"),
    `node_modules
dist
.env
.DS_Store
`
  );

  // 写模板文件
  if (template === "vanilla") {
    const ext = useTs ? "ts" : "js";
    // index.html 里 script 的扩展名要对应
    const indexHtml = vanillaIndexHtml(projectName).replace("/src/main.js", `/src/main.${ext}`);
    await writeFileSafe(path.join(targetDir, "index.html"), indexHtml);
    await writeFileSafe(
      path.join(targetDir, "src", `main.${ext}`),
      useTs ? vanillaMainTs() : vanillaMainJs()
    );
    await writeFileSafe(path.join(targetDir, "src", "style.css"), vanillaStyleCss());
  } else {
    // react
    if (useTs) {
      await writeFileSafe(path.join(targetDir, "index.html"), reactIndexHtmlTs(projectName));
      await writeFileSafe(path.join(targetDir, "src", "main.tsx"), reactMainTsx());
      await writeFileSafe(path.join(targetDir, "src", "App.tsx"), reactAppTsx(projectName));
    } else {
      await writeFileSafe(path.join(targetDir, "index.html"), reactIndexHtml(projectName));
      await writeFileSafe(path.join(targetDir, "src", "main.jsx"), reactMainJsx());
      await writeFileSafe(path.join(targetDir, "src", "App.jsx"), reactAppJsx(projectName));
    }
    await writeFileSafe(path.join(targetDir, "src", "index.css"), reactIndexCss());
  }

  log("✅ 文件生成完成");

  if (install) {
    const pm = getPkgManager();
    log(`\n📦 安装依赖：${pm} install`);
    try {
      await runCommand(pm, ["install"], targetDir);
      log("✅ 依赖安装完成");
    } catch (e) {
      warn("⚠️ 安装失败（可手动执行 npm install）：");
      warn(String(e?.message || e));
    }
  } else {
    log("\nℹ️ 已跳过依赖安装");
  }

  log("\n🚀 Next steps:");
  log(`  cd ${projectName}`);
  if (!install) log("  npm install");
  log("  npm run dev\n");
}

main().catch((e) => {
  warn("❌ 执行失败：");
  warn(String(e?.stack || e));
  process.exit(1);
});
```

---

## 3）运行

```bash
node create-mini-vite-prompts.mjs
```

或者带项目名：

```bash
node create-mini-vite-prompts.mjs my-app
```

创建完后按提示：

```bash
cd my-app
npm run dev
```

---

## 4）你已经拥有的“create-vite 核心能力”

* ✅ prompts 交互：模板、是否 TS、是否安装
* ✅ 生成不同模板文件（Vanilla / React，JS/TS）
* ✅ 写 `package.json` + `vite.config.js` + `tsconfig.json`
* ✅ 可选安装依赖

---

如果你还想更像真正的 `create-vite`，我可以在这个版本上直接加 3 个增强（仍然完整可跑）：

1. **目录已存在时：是否覆盖 / 清空**（prompts confirm）
2. **支持 `--template react-ts` 这种参数**（无交互快速创建）
3. **自动识别 pnpm/yarn/bun**（根据 lockfile 或环境变量）
