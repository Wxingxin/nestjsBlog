

## 1) bcrypt 是什么，解决什么问题

**bcrypt** 是一种专门为“密码哈希”设计的算法/库，用来把明文密码变成**不可逆的哈希值**，存库时只存哈希而不是明文。

你在 Express 里用 bcrypt 的目的：

* ✅ **注册**：把 `password` 变成哈希再存数据库
* ✅ **登录**：把用户输入的密码和数据库哈希做比对
* ✅ **改密码/重置密码**：同样 hash 后再更新
* ✅ **防泄露**：即使数据库被拖库，也很难直接还原用户密码

> 重点：bcrypt 是 **hash**，不是加密。加密是可逆的，hash 是不可逆的。

---

## 2) bcrypt 的核心概念（必须懂）

### 2.1 Salt（盐）

bcrypt 在 hash 时会自动生成随机 salt，并把它**包含在哈希结果里**。

* 同一个密码，每次 hash 出来的结果也不同（因为 salt 不同）
* 你不需要自己单独存 salt（bcrypt hash 字符串里已经包含）

### 2.2 Cost / Rounds（成本因子）

bcrypt 的强度来自一个参数：**salt rounds**（也叫 cost）

* rounds 越大：越安全（更慢），暴力破解成本更高
* rounds 越大：服务器越吃 CPU（注册/改密会更慢）

常见取值（经验）：

* 开发环境：`8~10`
* 生产环境：`10~12`（很多项目默认 10 或 12）
* 过高（比如 14+）可能会导致高并发下 CPU 爆炸

### 2.3 hash 格式长啥样（理解即可）

bcrypt 的哈希一般长这样：

`$2b$10$xxxxxxxxxxxxxxxxxxxxxxYYYYYYYYYYYYYYYYYYYYYYYYYYYY`

* `$2b$`：版本
* `10`：rounds
* 后面包含 salt + hash

---

## 3) bcrypt / bcryptjs 怎么选

* `bcrypt`：有原生依赖（C++ binding），通常更快；部署有时需要编译环境。
* `bcryptjs`：纯 JS 实现，兼容性好，通常更慢。

在 Node + Express 生产服务里：

* 能装原生依赖就选 `bcrypt`
* 部署环境麻烦就选 `bcryptjs`（API 基本一样）

---

## 4) API 使用大全（最常用 4 个）

> 建议在 Express 里 **优先使用 async 版本**，避免阻塞事件循环。

### 4.1 `bcrypt.hash(plain, saltRounds)`

把明文密码变哈希

```js
import bcrypt from "bcrypt";

const saltRounds = 10;
const hash = await bcrypt.hash(password, saltRounds);
```

### 4.2 `bcrypt.compare(plain, hash)`

比对密码是否正确（登录用）

```js
const ok = await bcrypt.compare(inputPassword, user.passwordHash);
```

### 4.3 `bcrypt.genSalt(saltRounds)`（可选）

手动生成 salt，再 hash（通常没必要）

```js
const salt = await bcrypt.genSalt(10);
const hash = await bcrypt.hash(password, salt);
```

### 4.4 同步版 `hashSync/compareSync`

不推荐在 Web 服务请求链路用（会阻塞），但在脚本/一次性迁移工具里 OK。

---

## 5) Express 项目典型流程写法（注册 / 登录 / 改密）

下面给你一套“最常见、最接近真实项目”的写法（示例用伪 DB，逻辑可直接迁移到 MongoDB / MySQL / Prisma 等）。

### 5.1 注册（Sign Up）

关键点：

* 校验输入（长度/复杂度）
* **hash 后存**
* 永远不返回 hash 给前端

```js
import bcrypt from "bcrypt";
import express from "express";

const router = express.Router();
const SALT_ROUNDS = 10;

router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1) 基本校验（示例）
    if (!email || !password) {
      return res.status(400).json({ message: "email/password required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "password too short" });
    }

    // 2) 查重（示例）
    const existed = await db.user.findByEmail(email);
    if (existed) {
      return res.status(409).json({ message: "email already exists" });
    }

    // 3) hash
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // 4) 入库
    const user = await db.user.create({ email, passwordHash });

    return res.status(201).json({
      id: user.id,
      email: user.email,
    });
  } catch (err) {
    return res.status(500).json({ message: "server error" });
  }
});
```

### 5.2 登录（Sign In）

关键点：

* **先按 email 找用户**
* 用 `bcrypt.compare()` 对比
* 登录失败信息不要太“精确”（避免被枚举账号）

```js
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await db.user.findByEmail(email);
    // 统一返回，避免告诉别人“这个邮箱存在”
    if (!user) {
      return res.status(401).json({ message: "invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "invalid credentials" });
    }

    // TODO: 这里一般会签发 JWT / session
    return res.json({ message: "login ok", userId: user.id });
  } catch (err) {
    return res.status(500).json({ message: "server error" });
  }
});
```

### 5.3 修改密码（Change Password）

关键点：

* 先验证旧密码（防止被盗号后直接改）
* 新密码再 hash

```js
router.post("/change-password", async (req, res) => {
  try {
    const userId = req.user.id; // 假设你已有鉴权中间件
    const { oldPassword, newPassword } = req.body;

    const user = await db.user.findById(userId);
    if (!user) return res.status(404).json({ message: "not found" });

    const ok = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "invalid credentials" });

    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await db.user.updatePasswordHash(userId, newHash);

    return res.json({ message: "password updated" });
  } catch {
    return res.status(500).json({ message: "server error" });
  }
});
```

---

## 6) 在 Express 里封装成“密码工具模块”（推荐）

把 hashing / compare 的细节集中起来，便于后续调整 rounds 或切换算法。

```js
// utils/password.js
import bcrypt from "bcrypt";

const SALT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 10);

export async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}
```

---

## 7) 安全与工程“关键知识点”（面试/实战都常问）

### 7.1 永远不要“加密存密码”

很多新手会用 AES 加密存密码，这是错的：

* 加密是可逆的，密钥泄露就全完
* 密码必须用 hash（bcrypt/argon2/scrypt）

### 7.2 不要把 rounds 写死在代码里

用环境变量控制更合理：

* `BCRYPT_ROUNDS=10` 之类
* 方便未来升级安全强度

### 7.3 不要在请求高频路径里做同步 hash/compare

同步版会阻塞 Node 事件循环：

* 登录高并发会卡全站

### 7.4 bcrypt 的性能与压测思路

* rounds 越高 CPU 越吃紧
* 注册/改密属于低频操作，可以慢一点
* 登录一般也没那么高频，但大站要考虑限流/风控

### 7.5 防爆破：限流 + 错误信息统一

bcrypt 不负责防爆破，服务端要做：

* `express-rate-limit`
* 统一错误：`invalid credentials`
* 可选：登录失败次数锁定、验证码、风控

### 7.6 密码迁移与升级 rounds（进阶）

当你想把 rounds 从 10 升到 12：

* 用户登录成功后，检测 hash 里的 rounds
* 如果低于目标 rounds，**重新 hash** 并更新库（无感升级）

> bcrypt hash 里带 rounds 信息，所以可以解析判断。

## 8) 常见踩坑合集

1. **把 `compare` 写反**
   `bcrypt.compare(plain, hash)` 才对

2. **重复 hash**
   不要把用户的 hash 再 hash 一遍存库

3. **返回用户对象时把 hash 带回前端**
   一定要在序列化时剔除 `passwordHash`

4. **忘记 await**
   `bcrypt.hash()` 返回 Promise，忘 await 会把 Promise 存进 DB（灾难）

5. **rounds 设置过高导致 CPU 飙升**
   尤其是容器资源少的情况下

---

## 9) 你可以直接复用的“最小最佳实践清单”

* [ ] 密码字段只存 `passwordHash`
* [ ] `hash(password, rounds)`（async）
* [ ] `compare(input, hash)`（async）
* [ ] 登录错误统一：`invalid credentials`
* [ ] rounds 用环境变量控制
* [ ] 注册/登录加限流、失败计数
* [ ] 输出用户数据时删除 hash 字段

下面给你一份「**bcrypt 在 Express / Node.js 项目中的使用大全**」，覆盖：安装选型、最佳实践、注册/登录/改密/重置密码、并发与性能、与 JWT/Session 的组合、安全清单、常见坑与排错。内容以 **bcrypt（原生库）** 为主，同时说明 `bcryptjs` 差异。

---

## 1) bcrypt 是什么（在项目里用它做什么）

* **用途**：把用户的明文密码做成**不可逆哈希**（hash）并保存到数据库；登录时用 `compare` 校验。
* **特点**：

  * **自动加盐（salt）**：同一密码每次 hash 结果也不同
  * **慢哈希**：提升暴力破解成本
  * **不可解密**：只能 compare，不能还原

---

## 2) 选型：bcrypt vs bcryptjs（怎么选）

### bcrypt（推荐）

* 原生扩展，通常更快
* 需要编译环境（但多数平台已提供预编译）

### bcryptjs

* 纯 JS 实现，兼容性好
* 性能通常更慢

**建议**：生产优先 `bcrypt`；如果你在某些环境安装困难再退到 `bcryptjs`。

---

## 3) 安装与基本引入

```bash
npm i bcrypt
# 或 pnpm add bcrypt / yarn add bcrypt
```

ESM：

```js
import bcrypt from "bcrypt";
```

CommonJS：

```js
const bcrypt = require("bcrypt");
```

---

## 4) 核心 API 一览（项目用到的就这几个）

* `bcrypt.hash(plain, saltRounds)`：生成 hash（异步，推荐）
* `bcrypt.hashSync(plain, saltRounds)`：同步 hash（不推荐在高并发请求里用）
* `bcrypt.compare(plain, hash)`：校验（异步，推荐）
* `bcrypt.compareSync(plain, hash)`：同步校验（不推荐）
* `bcrypt.genSalt(rounds)`：生成 salt（一般不需要手动用）

---

## 5) saltRounds 设多少合适（成本因子）

`rounds` 越大越安全但越慢。常用：

* **10**：多数 Web 项目默认档
* **12**：更安全但更吃 CPU（高并发要评估）

**建议策略**：

* 小中型项目：`10` 起步
* 高安全要求且登录量不大：`12`
* 不要随便上到 14/15+，会显著拖慢并发

---

## 6) 项目里最标准的用法（注册 + 登录）

### 6.1 注册：只存 hash，永不存明文

```js
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

app.post("/register", async (req, res) => {
  const { password } = req.body;

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  await User.create({
    // ...
    passwordHash,
  });

  res.json({ ok: true });
});
```

### 6.2 登录：用 compare，不要二次 hash 对比

```js
app.post("/login", async (req, res) => {
  const { password, email } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: "邮箱或密码错误" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: "邮箱或密码错误" });

  res.json({ ok: true });
});
```

---

## 7) 改密码（需要验证旧密码）

```js
app.post("/change-password", async (req, res) => {
  const userId = req.user.id;
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(userId);

  const ok = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!ok) return res.status(401).json({ message: "旧密码不正确" });

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();

  res.json({ ok: true });
});
```

**最佳实践**：改密码后让旧 token/session 失效（见第 11 节）。

---

## 8) 重置密码（忘记密码）正确做法

重置密码不要让用户“找回原密码”，而是“重置为新密码”。

**流程**（常见标准）：

1. 用户提交邮箱
2. 服务端生成 **一次性 token**（随机字符串或 JWT），写入数据库并设置过期时间
3. 邮件发重置链接 `/reset?token=...`
4. 用户提交新密码 + token
5. 校验 token 有效后 `bcrypt.hash(newPassword)` 更新 `passwordHash`，并清理 token

**关键点**：重置 token 不是密码 hash 的替代品，密码依旧必须 bcrypt 存储。

---

## 9) 在数据库字段层面的设计建议

* 字段名推荐：`passwordHash`（明确它不是原密码）
* 长度：bcrypt hash 一般 60 字符左右（`$2b$...`），数据库字段用 `VARCHAR(100)` 足够
* 不要存 `salt`：bcrypt 的 hash 字符串本身包含了 salt 与 cost 信息

---

## 10) Express 中封装成工具函数（工程化）

`utils/password.js`

```js
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

export function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}
```

业务代码里就很干净：

```js
const passwordHash = await hashPassword(password);
const ok = await verifyPassword(password, user.passwordHash);
```

---

## 11) bcrypt + JWT / Session 的组合要点

### JWT

* 登录成功后签发 JWT（access token）
* 改密码后：建议维护一个 `tokenVersion` 或 `passwordChangedAt`

  * JWT 里带 `ver` 或 `iat`
  * 服务端验证时对比数据库 `tokenVersion` 或 `passwordChangedAt`，不符合就拒绝

### Session（cookie-session / express-session）

* 登录成功建立 session
* 改密码后：销毁其他设备 session（如果你做多端登录管理）

---

## 12) 安全清单（项目里必须注意）

1. **永远不存明文密码**
2. **永远用 async 版本**（`hash/compare`）避免阻塞事件循环
3. 登录错误信息统一（避免用户名枚举）
4. 密码强度校验（长度、复杂度、泄漏密码库可选）
5. 配合限流（rate limit）防爆破
6. 日志里不要打印密码/哈希
7. 生产环境使用 HTTPS（否则密码在传输层可能被截获）
8. 设置合理 rounds（10 或 12）

---

## 13) 常见坑与排错

### 坑 1：登录时用 hash 再对比

* bcrypt 每次 hash 都不同，必须 `compare`

### 坑 2：同步 API 导致卡顿

* `hashSync/compareSync` 会阻塞 Node 主线程，高并发下会明显抖动

### 坑 3：更换 rounds 会影响旧用户吗？

* 不影响。旧 hash 仍可 compare。
* 新密码或改密时用新 rounds 即可（渐进升级）

### 坑 4：数据库字段太短导致截断

* bcrypt hash 被截断后 compare 一定失败
* 字段至少 `VARCHAR(100)` 更稳

---

## 14) 一套“可直接抄”的最小可用实现（注册/登录）

```js
import express from "express";
import bcrypt from "bcrypt";

const app = express();
app.use(express.json());

const SALT_ROUNDS = 10;

// 伪数据库
const users = new Map(); // email -> { passwordHash }

app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  if (users.has(email)) return res.status(409).json({ message: "邮箱已存在" });

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  users.set(email, { passwordHash });

  res.json({ ok: true });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = users.get(email);
  if (!user) return res.status(401).json({ message: "邮箱或密码错误" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: "邮箱或密码错误" });

  res.json({ ok: true });
});

app.listen(3000);
```

---

如果你告诉我你现在的技术栈（例如 **MongoDB+Mongoose / Prisma+MySQL / PostgreSQL**，以及你用 **JWT 还是 Cookie Session**），我可以把上面的“使用大全”进一步落到你项目的真实结构里：包含路由、service、validator、错误处理、中间件、以及更安全的改密/重置密码完整模块。
