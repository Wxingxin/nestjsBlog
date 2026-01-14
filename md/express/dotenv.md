
# 一、dotenv 是什么？解决什么问题

**dotenv** 的作用只有一句话：

> 👉 **把 `.env` 文件里的环境变量加载到 `process.env` 中**

在 Express 项目里，dotenv 主要用来：

* 存 **敏感信息**

  * 数据库连接串
  * JWT_SECRET
  * 第三方 API Key
* 区分 **开发 / 测试 / 生产环境**
* 避免把配置写死在代码中

❌ 错误做法：

```js
const JWT_SECRET = "123456";
```

✅ 正确做法：

```js
const JWT_SECRET = process.env.JWT_SECRET;
```

---

# 二、dotenv 的核心原理（一定要懂）

### 1️⃣ `.env` 文件

本质就是一个 **key=value** 的文本文件

```env
PORT=3000
JWT_SECRET=super-secret-key
DB_URL=mongodb://127.0.0.1:27017/test
```

### 2️⃣ dotenv 做了什么

```js
require('dotenv').config();
```

等价于：

* 读取 `.env`
* 解析内容
* 写入 `process.env`

```js
process.env = {
  ...process.env,
  PORT: "3000",
  JWT_SECRET: "super-secret-key",
}
```

⚠️ 注意：**所有值都是字符串**

---

# 三、安装与最基础使用（100% 必会）

```bash
npm install dotenv
```

### 方式一：最常见（入口文件）

```js
// app.js / index.js / server.js
import dotenv from "dotenv";
dotenv.config();

import express from "express";

const app = express();
app.listen(process.env.PORT);
```

### 方式二：Node 启动参数（更干净，推荐）

```bash
node -r dotenv/config app.js
```

或在 `package.json`：

```json
{
  "scripts": {
    "dev": "node -r dotenv/config app.js"
  }
}
```

✔ 不用在代码里写 `dotenv.config()`

---

# 四、dotenv 在 Express 中的常见使用场景

## 1️⃣ 端口配置

```js
const PORT = process.env.PORT || 3000;
app.listen(PORT);
```

---

## 2️⃣ 数据库连接

```env
DB_HOST=localhost
DB_PORT=27017
DB_NAME=mydb
```

```js
const uri = `mongodb://${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
```

---

## 3️⃣ JWT / bcrypt / session 配置

```env
JWT_SECRET=jwt-secret
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=10
```

```js
const saltRounds = Number(process.env.BCRYPT_ROUNDS);
```

⚠️ 记住：**需要自己转换类型**

---

## 4️⃣ 第三方服务配置

```env
ALIYUN_KEY=xxx
GITHUB_CLIENT_ID=xxx
```

```js
axios.get(url, {
  headers: {
    Authorization: process.env.ALIYUN_KEY
  }
});
```

---

# 五、多环境配置（重点，工程必会）

## 方案一：多个 `.env` 文件（最常用）

```txt
.env
.env.development
.env.production
.env.test
```

```env
# .env.development
PORT=3000
DB_URL=mongodb://localhost/dev
```

```env
# .env.production
PORT=80
DB_URL=mongodb://prod/db
```

### 加载方式

```js
dotenv.config({
  path: `.env.${process.env.NODE_ENV}`
});
```

```bash
NODE_ENV=production node app.js
```

---

## 方案二：dotenv-expand（变量引用）

```env
DB_HOST=localhost
DB_PORT=3306
DB_URL=mysql://${DB_HOST}:${DB_PORT}/test
```

```js
import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";

const env = dotenv.config();
dotenvExpand.expand(env);
```

---

# 六、dotenv 的高级配置项

```js
dotenv.config({
  path: ".env",
  encoding: "utf8",
  override: false,
  debug: true,
});
```

| 参数       | 说明         |
| -------- | ---------- |
| path     | 指定 env 文件  |
| override | 是否覆盖已有 env |
| debug    | 输出调试日志     |

---

# 七、dotenv 与 Express 项目结构（推荐）

```txt
project
├── src
│   ├── app.js
│   ├── routes
│   ├── config
│   │   ├── env.js
│   │   └── db.js
├── .env
├── .env.example
├── package.json
```

### `config/env.js`

```js
export const env = {
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET,
};
```

统一出口，避免到处 `process.env.xxx`

---

# 八、dotenv 安全与规范（非常重要）

## 1️⃣ `.env` 一定要加入 `.gitignore`

```txt
.env
.env.*
```

## 2️⃣ 提供 `.env.example`

```env
PORT=
JWT_SECRET=
DB_URL=
```

团队协作 / 开源项目必做

---

## 3️⃣ 不要在前端暴露 `.env`

* Express 是 **后端**，安全
* 前端（Vite / Next）有特殊规则（如 `VITE_`、`NEXT_PUBLIC_`）

---

# 九、常见坑 & 面试高频问题

### ❌ dotenv 放在 import 之后

```js
import app from "./app";
dotenv.config(); // 错
```

✔ 必须在 **使用 env 之前**

---

### ❌ 认为 dotenv 会自动区分环境

> dotenv 不会管 `NODE_ENV`，你要自己处理

---

### ❌ 忘记字符串类型

```js
process.env.PORT + 1 // ❌ "30001"
```

✔

```js
Number(process.env.PORT) + 1
```

---

### ❌ 在库文件里随便调用 dotenv

> dotenv 只应该在 **入口文件** 初始化一次

---

# 十、dotenv + Express 的最佳实践总结（记住这 7 条）

1. dotenv 只负责 **加载配置**
2. 入口文件最先执行 `dotenv.config`
3. 所有 env 默认都是字符串
4. `.env` 永远不进 git
5. 提供 `.env.example`
6. 多环境用 `.env.xxx`
7. 用 config 模块统一导出 env

---

如果你愿意，下一步我可以帮你把：

* **dotenv + bcrypt + jwt + express** 整合成一套完整鉴权架构
* 或直接给你一个 **真实项目级目录结构 + 配置加载方案**

你下一步是想「做登录系统」还是「做完整后端模板」？
