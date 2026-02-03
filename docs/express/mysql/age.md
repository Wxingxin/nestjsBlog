下面给你一套**Express + MySQL**在真实项目里最常用、最稳的“配置与使用”方式（偏工程化，不是玩具 demo）。默认用 **mysql2**（支持 Promise、性能好、社区通用）。

---

## 0) 安装依赖

```bash
npm i express mysql2 dotenv
npm i -D nodemon
```

项目结构建议（你可以按这个来）：

```
src/
  app.js
  server.js
  config/
    env.js
    db.js
  db/
    query.js
  modules/
    users/
      users.routes.js
      users.controller.js
      users.service.js
      users.repo.js
```

---

## 1) 环境变量配置

### `.env`

```env
PORT=3000

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=your_db
DB_CONN_LIMIT=10
```

### `src/config/env.js`

```js
import "dotenv/config";

export const env = {
  port: Number(process.env.PORT || 3000),

  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: Number(process.env.DB_CONN_LIMIT || 10),
  },
};
```

---

## 2) 创建 MySQL 连接池（核心）

> **不要每个请求 new connection**，用 **pool**（连接池）才是生产写法。

### `src/config/db.js`

```js
import mysql from "mysql2/promise";
import { env } from "./env.js";

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: env.db.connectionLimit,
  queueLimit: 0,
});
```

---

## 3) 封装一个 query 工具（统一写 SQL）

### `src/db/query.js`

```js
import { pool } from "../config/db.js";

/**
 * @param {string} sql
 * @param {any[]} params
 */
export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params); // ✅ 预编译参数，防 SQL 注入
  return rows;
}
```

---

## 4) Express 启动文件

### `src/app.js`

```js
import express from "express";
import usersRoutes from "./modules/users/users.routes.js";

const app = express();
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/users", usersRoutes);

// 统一错误处理（建议保留）
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Internal Server Error" });
});

export default app;
```

### `src/server.js`

```js
import app from "./app.js";
import { env } from "./config/env.js";
import { pool } from "./config/db.js";

app.listen(env.port, () => {
  console.log(`Server running on http://localhost:${env.port}`);
});

// 优雅关闭（可选但推荐）
process.on("SIGINT", async () => {
  try {
    await pool.end();
  } finally {
    process.exit(0);
  }
});
```

---

## 5) 写一个完整 CRUD（Repository → Service → Controller → Routes）

### 5.1 Repository：只负责 SQL

`src/modules/users/users.repo.js`

```js
import { query } from "../../db/query.js";

export async function createUser({ username, email }) {
  const result = await query(
    "INSERT INTO users (username, email) VALUES (?, ?)",
    [username, email]
  );
  // mysql2 的 INSERT 返回 result.insertId（在 OkPacket 上）
  return result.insertId;
}

export async function findUsers({ limit = 20, offset = 0 } = {}) {
  return query("SELECT id, username, email FROM users LIMIT ? OFFSET ?", [
    Number(limit),
    Number(offset),
  ]);
}

export async function findUserById(id) {
  const rows = await query(
    "SELECT id, username, email FROM users WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] || null;
}

export async function findUserByEmail(email) {
  const rows = await query(
    "SELECT id, username, email FROM users WHERE email = ? LIMIT 1",
    [email]
  );
  return rows[0] || null;
}

export async function updateUser(id, { username, email }) {
  const result = await query(
    "UPDATE users SET username = COALESCE(?, username), email = COALESCE(?, email) WHERE id = ?",
    [username ?? null, email ?? null, id]
  );
  return result.affectedRows; // 受影响行数
}

export async function deleteUser(id) {
  const result = await query("DELETE FROM users WHERE id = ?", [id]);
  return result.affectedRows;
}
```

---

### 5.2 Service：业务逻辑（比如查重）

`src/modules/users/users.service.js`

```js
import * as repo from "./users.repo.js";

export async function registerUser({ username, email }) {
  const exists = await repo.findUserByEmail(email);
  if (exists) {
    const err = new Error("Email already exists");
    err.status = 409;
    throw err;
  }

  const id = await repo.createUser({ username, email });
  return repo.findUserById(id);
}

export async function listUsers({ limit, offset }) {
  return repo.findUsers({ limit, offset });
}

export async function getUser(id) {
  return repo.findUserById(id);
}

export async function patchUser(id, data) {
  const affected = await repo.updateUser(id, data);
  if (affected === 0) return null;
  return repo.findUserById(id);
}

export async function removeUser(id) {
  const affected = await repo.deleteUser(id);
  return affected > 0;
}
```

---

### 5.3 Controller：HTTP 层

`src/modules/users/users.controller.js`

```js
import * as service from "./users.service.js";

export async function create(req, res, next) {
  try {
    const { username, email } = req.body;
    const user = await service.registerUser({ username, email });
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

export async function list(req, res, next) {
  try {
    const limit = req.query.limit ?? 20;
    const offset = req.query.offset ?? 0;
    const users = await service.listUsers({ limit, offset });
    res.json(users);
  } catch (err) {
    next(err);
  }
}

export async function get(req, res, next) {
  try {
    const user = await service.getUser(req.params.id);
    if (!user) return res.status(404).json({ message: "Not Found" });
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function patch(req, res, next) {
  try {
    const user = await service.patchUser(req.params.id, req.body);
    if (!user) return res.status(404).json({ message: "Not Found" });
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const ok = await service.removeUser(req.params.id);
    if (!ok) return res.status(404).json({ message: "Not Found" });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
```

---

### 5.4 Routes：绑定路由

`src/modules/users/users.routes.js`

```js
import { Router } from "express";
import * as c from "./users.controller.js";

const router = Router();

router.post("/", c.create);
router.get("/", c.list);
router.get("/:id", c.get);
router.patch("/:id", c.patch);
router.delete("/:id", c.remove);

export default router;
```

---

## 6) MySQL 表结构（你先建好）

```sql
CREATE TABLE users (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 7) 事务怎么写（多表写入必用）

当你要“扣库存 + 创建订单”这种 **必须一致性**的操作：

```js
import { pool } from "../config/db.js";

export async function createOrderWithItems(order, items) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [orderRes] = await conn.execute(
      "INSERT INTO orders (user_id, total) VALUES (?, ?)",
      [order.userId, order.total]
    );
    const orderId = orderRes.insertId;

    for (const it of items) {
      await conn.execute(
        "INSERT INTO order_items (order_id, product_id, qty) VALUES (?, ?, ?)",
        [orderId, it.productId, it.qty]
      );
    }

    await conn.commit();
    return orderId;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
```

---

## 8) 你必须记住的“坑位清单”（生产必看）

* ✅ **永远用 `?` 占位符**（防 SQL 注入），不要字符串拼 SQL
* ✅ 用 **pool**，不要 per-request 新建连接
* ✅ 大项目建议加 **迁移工具**（比如把建表 SQL 放 `migrations/` 管理）
* ✅ 返回值要注意：

  * `SELECT` → rows（数组）
  * `INSERT` → `insertId`
  * `UPDATE/DELETE` → `affectedRows`

---

如果你告诉我你更想要哪一种风格，我可以把上面继续升级成你更可能用到的版本：

1. **最简版**（一个 `db.js` + routes 直接写 SQL）
2. **企业版**（分层 + 事务 + 统一错误码 + 校验）
3. **配 Docker Compose**（一键起 MySQL + Express）

你现在更偏哪一种？
