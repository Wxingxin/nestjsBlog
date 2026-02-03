下面给你一套 **Express + MySQL + Prisma** 的“安装 → 配置 → 基本使用”完整落地方案（偏真实项目结构，直接可抄）。

---

## 0) 安装依赖

```bash
npm i express dotenv
npm i -D prisma
npm i @prisma/client
```

初始化 Prisma：

```bash
npx prisma init
```

这会生成：

* `prisma/schema.prisma`
* `.env`（里面会有 `DATABASE_URL`）

---

## 1) 配置 MySQL 连接（DATABASE_URL）

在 `.env` 写：

```env
PORT=3000
DATABASE_URL="mysql://root:your_password@127.0.0.1:3306/your_db?connection_limit=10"
```

> `connection_limit` 是 Prisma 的连接池上限参数之一（你也可以先不写，默认也能跑）。

---

## 2) 配置 `schema.prisma`

`prisma/schema.prisma`：

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  username  String
  email     String   @unique
  createdAt DateTime @default(now())
}
```

---

## 3) 生成表（迁移）

开发环境（会生成 migration 文件并创建表）：

```bash
npx prisma migrate dev --name init
```

可选：打开数据库可视化：

```bash
npx prisma studio
```

---

## 4) Express 项目结构建议

```
src/
  app.js
  server.js
  config/
    env.js
  db/
    prisma.js
  modules/
    users/
      users.routes.js
      users.controller.js
      users.service.js
      users.repo.js
```

---

## 5) PrismaClient 单例（核心）

`src/db/prisma.js`

```js
import { PrismaClient } from "@prisma/client";

export const prisma = globalThis.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
```

> 这样在开发热重载/测试时不会反复创建连接（尤其在某些开发环境里很常见）。

---

## 6) Express 启动

`src/config/env.js`

```js
import "dotenv/config";

export const env = {
  port: Number(process.env.PORT || 3000),
};
```

`src/app.js`

```js
import express from "express";
import usersRoutes from "./modules/users/users.routes.js";

const app = express();
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));
app.use("/users", usersRoutes);

// 统一错误处理
app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({ message: err.message || "Internal Server Error" });
});

export default app;
```

`src/server.js`

```js
import app from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./db/prisma.js";

app.listen(env.port, () => {
  console.log(`http://localhost:${env.port}`);
});

// 优雅关闭
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
```

---

## 7) 基本 CRUD（Repo → Service → Controller → Routes）

### 7.1 Repo：只写 Prisma 查询

`src/modules/users/users.repo.js`

```js
import { prisma } from "../../db/prisma.js";

export function createUser(data) {
  return prisma.user.create({ data });
}

export function listUsers() {
  return prisma.user.findMany({
    select: { id: true, username: true, email: true, createdAt: true },
    orderBy: { id: "desc" },
  });
}

export function getUserById(id) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, username: true, email: true, createdAt: true },
  });
}

export function getUserByEmail(email) {
  return prisma.user.findUnique({ where: { email } });
}

export function updateUser(id, data) {
  return prisma.user.update({
    where: { id },
    data,
    select: { id: true, username: true, email: true, createdAt: true },
  });
}

export function deleteUser(id) {
  return prisma.user.delete({ where: { id } });
}
```

---

### 7.2 Service：业务逻辑（查重、返回规范）

`src/modules/users/users.service.js`

```js
import * as repo from "./users.repo.js";

export async function registerUser({ username, email }) {
  const exists = await repo.getUserByEmail(email);
  if (exists) {
    const err = new Error("Email already exists");
    err.status = 409;
    throw err;
  }
  return repo.createUser({ username, email });
}

export function listUsers() {
  return repo.listUsers();
}

export async function getUser(id) {
  return repo.getUserById(id);
}

export async function patchUser(id, data) {
  // prisma.user.update 找不到会抛异常，所以这里你可以提前查
  const existing = await repo.getUserById(id);
  if (!existing) return null;

  return repo.updateUser(id, data);
}

export async function removeUser(id) {
  const existing = await repo.getUserById(id);
  if (!existing) return false;

  await repo.deleteUser(id);
  return true;
}
```

---

### 7.3 Controller：HTTP 层

`src/modules/users/users.controller.js`

```js
import * as service from "./users.service.js";

export async function create(req, res, next) {
  try {
    const { username, email } = req.body;
    const user = await service.registerUser({ username, email });
    res.status(201).json(user);
  } catch (e) {
    next(e);
  }
}

export async function list(req, res, next) {
  try {
    const users = await service.listUsers();
    res.json(users);
  } catch (e) {
    next(e);
  }
}

export async function get(req, res, next) {
  try {
    const id = Number(req.params.id);
    const user = await service.getUser(id);
    if (!user) return res.status(404).json({ message: "Not Found" });
    res.json(user);
  } catch (e) {
    next(e);
  }
}

export async function patch(req, res, next) {
  try {
    const id = Number(req.params.id);
    const user = await service.patchUser(id, req.body);
    if (!user) return res.status(404).json({ message: "Not Found" });
    res.json(user);
  } catch (e) {
    next(e);
  }
}

export async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    const ok = await service.removeUser(id);
    if (!ok) return res.status(404).json({ message: "Not Found" });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}
```

---

### 7.4 Routes：路由绑定

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

## 8) 事务怎么写（Prisma $transaction）

例：创建用户 + 创建 profile，必须同生共死：

```js
import { prisma } from "../../db/prisma.js";

export async function createUserWithProfile(userData, profileData) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: userData });
    const profile = await tx.profile.create({
      data: { ...profileData, userId: user.id },
    });
    return { user, profile };
  });
}
```

> `$transaction(async tx => ...)` 是最常用的“交互式事务”写法。

---

## 9) 你必须记住的“差异点”（MySQL vs Prisma 体验）

* MySQL 原生库（mysql2）：你自己写 SQL、自己管结果结构、自己处理表字段映射
* Prisma：你写 model，CRUD 是类型安全 API，迁移/生成 client 一体化

**在 Express 里用 Prisma 的核心就是：**

> `PrismaClient` 单例 + `schema.prisma` + `migrate` + 在 repo 层写查询

---

如果你愿意，我可以按你之前喜欢的“**等价展开**”风格，把 Prisma 的：

* `create()` / `findMany()` / `findUnique()` / `update()` / `delete()`
* `select` / `include` / `where` / `orderBy` / `skip/take` / `transaction`

做成一套对照速记模板（写完你就能直接上手写项目）。
