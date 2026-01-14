

# 一、dotenv 是干什么的（在 Express 中的定位）

**一句话**：

> `dotenv` 用来把 `.env` 文件中的配置，加载到 `process.env`，让你的 Express 项目**不把敏感信息写死在代码里**。

在 Express 项目中，dotenv 主要负责：

* 🔐 管理敏感信息

  * 数据库密码
  * JWT 密钥
  * 第三方 API Key
* 🌍 区分环境

  * development / test / production
* 🧱 配置即代码（Config as Code）

  * 不同环境用不同 `.env` 文件


# 二、最基础、100%正确的用法

## 1️⃣ 安装

```bash
npm install dotenv
```

---

## 2️⃣ 最小可用写法（必须放在最前面）

```js
// index.js / app.js / server.js（第一行）
require("dotenv").config();

const express = require("express");
const app = express();

app.listen(process.env.PORT || 3000);
```

⚠️ **关键点**

* `dotenv.config()` **一定要在所有使用 `process.env` 之前执行**
* 推荐在入口文件第一行调用

---

## 3️⃣ `.env` 文件示例

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=123456
DB_NAME=x_social

JWT_SECRET=super_secret_key
```

访问方式：

```js
process.env.DB_HOST
process.env.JWT_SECRET
```

---

# 三、Express 项目中最常见的使用场景

## 场景 1：端口 & 运行环境

```js
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";
```

```js
if (NODE_ENV === "development") {
  console.log("开发环境");
}
```

---

## 场景 2：数据库配置（Prisma / Sequelize / 原生）

```js
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};
```

👉 **绝对不要写死在代码中**

---

## 场景 3：JWT / Session / 加密

```js
const jwt = require("jsonwebtoken");

jwt.sign(payload, process.env.JWT_SECRET, {
  expiresIn: "7d",
});
```

---

## 场景 4：第三方服务（Clerk / OAuth / OSS / S3）

```js
const s3 = new S3({
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_KEY,
});
```

---

# 四、dotenv + Express 的工程化进阶用法（重点）

## 1️⃣ 多环境配置（强烈推荐）

### 文件结构

```txt
.env                 # 本地默认
.env.development
.env.test
.env.production
```

### 启动时指定环境

```bash
NODE_ENV=production node app.js
```

### 手动指定 dotenv 文件

```js
require("dotenv").config({
  path: `.env.${process.env.NODE_ENV}`,
});
```

📌 **常见映射**

| NODE_ENV    | 使用文件             |
| ----------- | ---------------- |
| development | .env.development |
| test        | .env.test        |
| production  | .env.production  |

---

## 2️⃣ 配置集中管理（非常重要）

❌ 不推荐到处写 `process.env.xxx`

✅ 推荐：统一 `config/index.js`

```js
require("dotenv").config();

function must(name) {
  if (!process.env[name]) {
    throw new Error(`❌ Missing env: ${name}`);
  }
  return process.env[name];
}

module.exports = {
  env: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 3000,

  jwtSecret: must("JWT_SECRET"),

  db: {
    host: must("DB_HOST"),
    user: must("DB_USER"),
    password: must("DB_PASSWORD"),
    name: must("DB_NAME"),
  },
};
```

使用：

```js
const config = require("./config");

app.listen(config.port);
```

✅ 好处：

* 启动时直接报错
* 防止线上“忘配环境变量”
* IDE 自动补全更友好

---

## 3️⃣ dotenv-safe（可选但专业）

如果你想**强制所有环境变量都必须存在**：

```bash
npm install dotenv-safe
```

```js
require("dotenv-safe").config();
```

配合 `.env.example`：

```env
PORT=
DB_HOST=
DB_USER=
DB_PASSWORD=
JWT_SECRET=
```

📌 非常适合团队协作、CI/CD。

---

## 4️⃣ dotenv 在测试环境中的用法（Jest / Vitest）

```js
require("dotenv").config({
  path: ".env.test",
});
```

```js
beforeAll(() => {
  process.env.NODE_ENV = "test";
});
```

👉 测试数据库、测试密钥必须和生产环境隔离。

---

# 五、常见错误 & 坑（Express 项目高频）

### ❌ 错误 1：dotenv 放在中间文件

```js
// routes/user.js
require("dotenv").config(); // ❌
```

✅ 正确：**只在入口文件调用一次**

---

### ❌ 错误 2：把 `.env` 提交到 Git

```gitignore
.env
.env.*
```

必须忽略 `.env`，只提交 `.env.example`

---

### ❌ 错误 3：修改 `.env` 不重启服务

> dotenv **只在启动时加载一次**

修改 `.env` 后：

```bash
Ctrl + C
node app.js
```

---

### ❌ 错误 4：以为 dotenv 会自动区分环境

dotenv **不会**自动识别 `NODE_ENV`，你要自己指定 `path`。

---

# 六、Express + dotenv 的推荐最佳实践（总结）

✅ **必须做**

* dotenv 只在入口文件调用
* 所有敏感信息进 `.env`
* `.env` 不进 Git

✅ **强烈推荐**

* 使用 `.env.development / production`
* 集中管理 config
* 启动时校验变量是否存在

✅ **大型项目**

* dotenv-safe
* CI/CD 中注入环境变量（而不是用 `.env`）

---

# 七、一个「X 社交平台」级别的 dotenv 示例

```env
NODE_ENV=development
PORT=3000

DATABASE_URL=postgresql://user:pass@localhost:5432/x_social

JWT_SECRET=jwt_secret
JWT_EXPIRES_IN=7d

REDIS_URL=redis://localhost:6379

S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_BUCKET=

RATE_LIMIT_POINTS=100
RATE_LIMIT_DURATION=60
```

---

如果你愿意，下一步我可以直接帮你做：

* ✅ **Express + dotenv + config 模块的项目模板**
* ✅ **dotenv + Prisma / JWT / Redis 的完整落地示例**
* ✅ **dotenv 在 Docker / CI/CD 中的用法**

你可以直接说一句：
👉「我用的是 JS / TS + Prisma + JWT」
