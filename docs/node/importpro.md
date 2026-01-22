在 **Express 项目**中，`"commonjs"` 与 `"module"` 指的是 **Node.js 的两种模块系统**。它们的核心差异体现在 **语法、加载方式、生态兼容性、配置方式** 以及 **在 Express 项目中的最佳实践** 上。

下面从**工程实践角度**系统说明二者在 Express 项目中的使用区别。



## 一、概念定位

| 模块类型         | 官方名称               | 简称  |
| ------------ | ------------------ | --- |
| `"commonjs"` | CommonJS Modules   | CJS |
| `"module"`   | ECMAScript Modules | ESM |

Node.js **默认使用 CommonJS**，而 `"module"` 是 Node 对 **ES Module（ESM）** 的支持方式。

---

## 二、启用方式（Express 项目中最关键的区别）

### 1️⃣ CommonJS（默认）

无需额外配置：

```json
// package.json
{
  "name": "express-app"
}
```

所有 `.js` 文件默认就是 **CommonJS**

---

### 2️⃣ ES Module（"module"）

必须在 `package.json` 中显式声明：

```json
{
  "type": "module"
}
```

此时：

* `.js` → **ESM**
* `.cjs` → 强制 CommonJS
* `.mjs` → 强制 ESM

⚠️ 一旦声明 `"type": "module"`，**整个项目的语义都会改变**

---

## 三、语法差异（Express 中最直观的区别）

### CommonJS（CJS）

```js
const express = require('express');
const router = require('./router');

module.exports = app;
```

### ES Module（ESM）

```js
import express from 'express';
import router from './router.js';

export default app;
```

⚠️ **ESM 必须写文件后缀**

```js
import router from './router.js'; // 必须 .js
```

---

## 四、Express 项目结构对比（实战）

### 1️⃣ CommonJS 项目（传统写法）

```txt
express-app/
├── app.js
├── routes/
│   └── user.js
├── controllers/
│   └── user.controller.js
└── package.json
```

#### app.js

```js
const express = require('express');
const userRouter = require('./routes/user');

const app = express();
app.use('/user', userRouter);

module.exports = app;
```

#### routes/user.js

```js
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.send('user list');
});

module.exports = router;
```

---

### 2️⃣ ES Module 项目（现代写法）

```txt
express-app/
├── app.js
├── routes/
│   └── user.js
└── package.json
```

#### package.json

```json
{
  "type": "module"
}
```

#### app.js

```js
import express from 'express';
import userRouter from './routes/user.js';

const app = express();
app.use('/user', userRouter);

export default app;
```

#### routes/user.js

```js
import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.send('user list');
});

export default router;
```

---

## 五、Node.js 特性支持差异（Express 项目常踩坑）

### 1️⃣ `__dirname` / `__filename`

|      | CommonJS | ES Module |
| ---- | -------- | --------- |
| 是否支持 | ✅ 原生     | ❌ 不存在     |

#### ES Module 替代方案（Express 常用）

```js
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```

---

### 2️⃣ JSON 导入

|      | CommonJS              | ES Module |
| ---- | --------------------- | --------- |
| JSON | `require('./a.json')` | 需要断言      |

```js
import data from './a.json' assert { type: 'json' };
```

---

### 3️⃣ 动态导入

|      | CommonJS    | ES Module      |
| ---- | ----------- | -------------- |
| 动态加载 | `require()` | `import()`（异步） |

```js
const module = await import('./test.js');
```

---

## 六、生态兼容性（非常重要）

### Express 生态现状

| 方面                | CommonJS | ES Module |
| ----------------- | -------- | --------- |
| Express 官方示例      | ✅ 多      | ⚠️ 部分     |
| 老中间件              | ✅ 完美     | ⚠️ 可能需兼容  |
| 新库（如 Zod、Drizzle） | ⚠️       | ✅ 更友好     |
| Node 18+          | ✅        | ✅         |

⚠️ **有些老库只能用 `require()`**

---

## 七、混合使用（真实项目中很常见）

### 在 ESM 中使用 CommonJS 包

```js
import pkg from 'some-cjs-lib';
const lib = pkg.default ?? pkg;
```

或：

```js
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const lib = require('some-cjs-lib');
```

---

## 八、Express 项目中该怎么选？

### ✅ 推荐结论（工程角度）

| 场景                  | 建议            |
| ------------------- | ------------- |
| 学习 Express / 新项目    | **ES Module** |
| 老项目 / 兼容性优先         | **CommonJS**  |
| NestJS / 现代全栈       | **ES Module** |
| 需要大量老中间件            | **CommonJS**  |
| Node ≥ 18 + 前后端统一语法 | **ES Module** |

---

## 九、Express + 现代技术栈推荐组合

如果你是**前端背景（你目前在学 React / Next / Node）**，推荐：

```txt
Express
ES Module
Node 18+
Zod / Prisma
dotenv
tsx / ts-node（如用 TS）
```

---

## 十、一句话总结

> **CommonJS 是历史包袱但稳定可靠；ES Module 是未来方向，更贴近前端生态。**

如果你愿意，下一步我可以帮你：

* 把一个 **CommonJS Express 项目完整迁移到 ES Module**
* 列一份 **Express + ESM 常见踩坑清单**
* 给你一个 **Express + ESM + Zod + Prisma 的标准项目模板**

你可以直接告诉我你更偏向哪一个。
