下面给你一份**“工程级别”的 Express 项目常用 Node.js 库全景清单**。
我会按 **必备 / 常用 / 进阶 / 可选增强 / 开发辅助** 分层说明，并明确**哪些是你现在就该用的，哪些可以暂缓**。

> 这是基于**真实生产 Express 项目**整理的，不是简单罗列 npm 包。

---

## 一、Express 项目「最小可用」核心库（必须）

> 没有这些，Express 项目基本不成立

### 1️⃣ Web 框架本体

```bash
npm install express
```

| 库           | 作用       |
| ----------- | -------- |
| **express** | Web 框架核心 |

---

### 2️⃣ 环境变量管理（必装）

```bash
npm install dotenv
```

| 库          | 作用              |
| ---------- | --------------- |
| **dotenv** | 管理数据库密码、JWT 密钥等 |

```js
import 'dotenv/config';
```

---

### 3️⃣ 请求体解析（Express 4+ 已内置）

```js
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
```

> 不再需要 body-parser（除非老项目）

---

## 二、安全 & 认证（几乎必用）

### 4️⃣ 密码加密

```bash
npm install bcrypt
```

| 库          | 作用   |
| ---------- | ---- |
| **bcrypt** | 密码哈希 |

---

### 5️⃣ 身份认证（JWT）

```bash
npm install jsonwebtoken
```

| 库                | 作用          |
| ---------------- | ----------- |
| **jsonwebtoken** | 生成 / 校验 JWT |

---

### 6️⃣ Cookie 支持（如用 Cookie + JWT）

```bash
npm install cookie-parser
```

---

### 7️⃣ 基础安全防护

```bash
npm install helmet cors
```

| 库          | 作用       |
| ---------- | -------- |
| **helmet** | HTTP 安全头 |
| **cors**   | 跨域控制     |

---

## 三、数据库相关（按你用的技术选）

### MongoDB 技术栈（你很可能会用）

```bash
npm install mongoose
```

| 库            | 作用          |
| ------------ | ----------- |
| **mongoose** | MongoDB ODM |



### SQL 技术栈（MySQL / PostgreSQL）

| 库          | 场景            |
| ---------- | ------------- |
| **prisma** | ⭐ 推荐 ORM      |
| sequelize  | 老牌 ORM        |
| knex       | Query Builder |

```bash
npm install prisma
```

---

## 四、日志 & 错误处理（强烈推荐）

### 8️⃣ 请求日志

```bash
npm install morgan
```

---

### 9️⃣ 统一日志系统（中大型项目）

```bash
npm install winston
```

---

### 10️⃣ HTTP 错误封装

```bash
npm install http-errors
```

---

## 五、文件 & 静态资源（常见）

### 11️⃣ 文件上传

```bash
npm install multer
```

---

### 12️⃣ 静态资源服务（Express 内置）

```js
app.use(express.static('public'));
```

---

## 六、参数校验 & 数据验证（非常重要）

### 13️⃣ 请求参数校验

```bash
npm install express-validator
```

| 库                     | 作用    |
| --------------------- | ----- |
| **express-validator** | 防止脏数据 |

---

## 七、进阶：认证框架 & 中间件体系

### 14️⃣ Passport（可选）

```bash
npm install passport passport-jwt passport-local
```

| 场景    |
| ----- |
| 多登录策略 |
| 第三方登录 |
| 企业级项目 |

> 小项目 **可以不用**

---

## 八、任务调度 & 异步能力（中大型项目）

### 15️⃣ 定时任务

```bash
npm install node-cron
```

---

### 16️⃣ 队列 / 消息

| 库      | 场景         |
| ------ | ---------- |
| bullmq | Redis 队列   |
| agenda | MongoDB 队列 |

---

## 九、开发体验 & 工程化（强烈推荐）

### 17️⃣ 热更新 & 启动工具

```bash
npm install -D nodemon
```

---

### 18️⃣ 代码规范

```bash
npm install -D eslint prettier
```

---

### 19️⃣ TypeScript（如果你用 TS）

```bash
npm install -D typescript ts-node @types/node @types/express
```

---

## 十、测试（专业项目必备）

```bash
npm install -D jest supertest
```

| 库         | 作用     |
| --------- | ------ |
| jest      | 单元测试   |
| supertest | API 测试 |

---

## 十一、典型 Express 项目依赖组合（推荐）

### 🔹 初学 / 后台管理系统（你当前阶段）

```txt
express
dotenv
bcrypt
jsonwebtoken
cors
helmet
mongoose
express-validator
morgan
nodemon
```

---

### 🔹 中大型 / 企业项目

```txt
express
dotenv
bcrypt
jsonwebtoken
passport
helmet
cors
prisma
winston
http-errors
multer
node-cron
```


## 十二、你**不该一开始就装的库**

| 库              | 原因           |
| -------------- | ------------ |
| passport       | 学习成本高        |
| redis / bullmq | 复杂度高         |
| graphql        | 非 Express 核心 |
| socket.io      | 没实时需求别用      |

---

## 十三、总结一句话版本

> **Express 本体很小，真正的项目是靠“中间件生态”搭起来的**
> 学习顺序应是：
> **Express → 安全 → 认证 → 数据库 → 工程化**

---

如果你愿意，下一步我可以直接帮你做三件事之一：
1️⃣ **给你一份 Express 项目标准目录结构（可直接开项目）**
2️⃣ **手把手搭一个 JWT 登录 + 权限控制 Demo**
3️⃣ **按“前端转后端”的角度给你一条 Express 学习路线**

你选一个，我按实战标准给你做。
