在 **Express + MySQL** 项目中，相比 **Express + MongoDB（Mongoose）**，你需要引入**不同的数据驱动、ORM/查询构建器和部分工具包**。下面我按**“必须 / 常用 / 对比 MongoDB”**三个层级，系统性地给你一份**清单 + 作用说明**，并结合你做中小项目、学习后端的实际场景来讲。

---

## 一、核心结论先给你（速览版）

| 分类         | Express + MySQL                    | Express + MongoDB |
| ------------ | ---------------------------------- | ----------------- |
| 数据库驱动   | `mysql2`                           | `mongodb`         |
| ORM / ODM    | `sequelize` / `prisma` / `typeorm` | `mongoose`        |
| 数据模型     | 表（Table）+ SQL                   | Schema + Document |
| 关系处理     | JOIN / 外键                        | ObjectId 引用     |
| 学习成本     | SQL + 表结构                       | Schema 更直观     |
| 中小项目推荐 | `mysql2` 或 `prisma`               | `mongoose`        |

---

## 二、Express + MySQL **必须安装的包**

### 1️⃣ mysql2（必选）

```bash
npm install mysql2
```

**作用：**

- MySQL 官方推荐的 Node.js 驱动
- 负责 **Node ↔ MySQL** 的底层通信
- 支持：
  - Promise（`mysql2/promise`）
  - 连接池
  - 预处理语句（防 SQL 注入）

**对应 MongoDB：**

| MySQL  | MongoDB |
| ------ | ------- |
| mysql2 | mongodb |

**典型使用：**

```js
import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "123456",
  database: "test_db",
});
```

---

## 三、ORM / 数据层（可选，但强烈推荐）

> ⚠️ 和 MongoDB 最大区别就在这里

### 2️⃣ Prisma（强烈推荐你用）

```bash
npm install prisma @prisma/client
npx prisma init
```

**作用：**

- 类型安全的 ORM（非常适合你这种前端 / TS 学习者）
- 用 **Schema 文件** 描述表结构
- 自动生成 SQL
- 自动迁移表结构

**对应 MongoDB：**

| MySQL              | MongoDB  |
| ------------------ | -------- |
| Prisma / Sequelize | Mongoose |

**为什么适合你：**

- 你在学 **TypeScript、React、Next.js**
- Prisma 的类型提示非常强
- 心智模型清晰（接近前端）

---

### 3️⃣ Sequelize（传统 ORM）

```bash
npm install sequelize mysql2
```

**作用：**

- 老牌 ORM
- 面向对象定义表结构
- 支持 MySQL / PostgreSQL / SQLite

**对比 Prisma：**

| Prisma      | Sequelize  |
| ----------- | ---------- |
| Schema 驱动 | JS 类驱动  |
| 类型安全强  | 类型一般   |
| 新项目首选  | 老项目常见 |

---

## 四、Express + MySQL 常见“基础通用包”（和 MongoDB 一样）

这些在 **Express + MongoDB** 项目里你已经见过了，**MySQL 仍然要用**：

| 包名                  | 作用     |
| --------------------- | -------- |
| `express`             | Web 框架 |
| `dotenv`              | 环境变量 |
| `cors`                | 跨域     |
| `morgan`              | 请求日志 |
| `winston`             | 日志系统 |
| `jsonwebtoken`        | JWT      |
| `bcrypt` / `bcryptjs` | 密码加密 |
| `express-validator`   | 参数校验 |
| `multer`              | 文件上传 |

👉 **数据库换了，但 Web 层完全一样**

---

## 五、和 MongoDB 项目中“不再需要 / 用法变化”的包

### ❌ 不需要的 MongoDB 专用包

| MongoDB 项目   | MySQL 项目 |
| -------------- | ---------- |
| mongoose       | ❌         |
| mongodb        | ❌         |
| Schema / Model | ❌         |

---

### ⚠️ 思维方式变化（非常重要）

#### MongoDB（你之前用的）

```js
const UserSchema = new Schema({
  username: String,
  posts: [{ type: ObjectId, ref: "Post" }],
});
```

#### MySQL（SQL / Prisma）

```sql
SELECT users.*, posts.*
FROM users
JOIN posts ON posts.user_id = users.id;
```

或 Prisma：

```prisma
model User {
  id    Int    @id @default(autoincrement())
  posts Post[]
}
```

👉 **MySQL = 表 + 关系**
👉 **MongoDB = 文档 + 引用**

---

## 六、一个 Express + MySQL 推荐安装清单（学习向）

### 📦 最小学习组合（强烈推荐）

```bash
npm install express mysql2 dotenv cors morgan
npm install prisma @prisma/client
npm install jsonwebtoken bcrypt express-validator
```

---

## 七、什么时候选 MySQL，什么时候选 MongoDB（结合你）

| 场景                         | 推荐           |
| ---------------------------- | -------------- |
| 学 SQL、数据库基础           | ✅ MySQL       |
| 表关系多（订单、评论、点赞） | ✅ MySQL       |
| 快速原型、结构变化大         | MongoDB        |
| RN / Flutter + 后端学习      | MySQL + Prisma |
| 做“类 X / 社交平台”          | MySQL 更规范   |

---

## 八、给你一个学习路线建议（重要）

**如果你现在从 MongoDB 转 MySQL：**

1. 先学 **SQL（CRUD + JOIN）**
2. 用 `mysql2` 跑原生 SQL
3. 再上 `Prisma`
4. 用 Prisma 重写 MongoDB 项目结构
5. 对比两种数据库设计思路

---

如果你愿意，下一步我可以帮你：

- 把你 **现有 Express + MongoDB 项目改成 MySQL**
- 给你一套 **Express + MySQL + Prisma 完整项目结构**
- 对比 **同一个“用户-帖子-评论”在 MongoDB vs MySQL 的设计**

你告诉我你现在 **更偏向学习 / 做项目 / 面试准备**，我给你精确方案。
