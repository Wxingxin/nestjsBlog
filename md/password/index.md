在 **Express** 中，**密码加密不使用 Passport**，而是使用 **crypto（或 bcrypt / argon2 等加密库）**。
二者的职责完全不同，这一点在实际项目中非常重要。

---

## 一句话结论

* **密码加密 / 校验** → 使用 **crypto / bcrypt / argon2**
* **用户认证流程（登录、会话、策略）** → 使用 **passport**
* **Passport 不负责密码加密**

---

## 一、crypto 是做什么的（或 bcrypt / argon2）

### 职责：**密码的安全存储与校验**

你在这些场景中使用它：

* 用户注册时：**对密码进行哈希后存数据库**
* 用户登录时：**将输入密码哈希后与数据库对比**

### 为什么不用明文？

* 防止数据库泄露
* 防止内部人员看到用户密码
* 符合基本安全规范

---

### ❌ 不推荐：Node 原生 crypto（除非你很清楚在做什么）

虽然可以用：

```js
crypto.createHash('sha256')
```

但 **不推荐直接用 hash 算法存密码**，原因：

* 太快（容易被暴力破解）
* 没有内置盐或成本因子

---

### ✅ 推荐方案（真实项目）

| 库                     | 推荐程度  | 说明        |
| --------------------- | ----- | --------- |
| **bcrypt / bcryptjs** | ⭐⭐⭐⭐  | 使用最广，成熟稳定 |
| **argon2**            | ⭐⭐⭐⭐⭐ | 密码学上更先进   |
| crypto                | ⭐     | 只适合底层或学习  |

---

### bcrypt 示例（最常见）

#### 注册时加密密码

```js
import bcrypt from 'bcrypt';

const hash = await bcrypt.hash(password, 10); // 10 = salt rounds
```

#### 登录时校验密码

```js
const isMatch = await bcrypt.compare(inputPassword, user.password);
```

---

## 二、Passport 是做什么的

### 职责：**认证流程管理**

Passport 负责的是：

* 登录逻辑
* 认证策略（Strategy）
* session / jwt 绑定
* 第三方登录（GitHub / Google / 微信）

**它不负责：**

* 密码加密算法
* 如何存储密码

---

### Passport 的工作模式（核心思想）

> Passport =「认证流程框架」

你告诉它三件事：

1. **怎么验证用户**
2. **用户验证成功后是谁**
3. **如何保持登录状态**

---

### Passport Local 示例（核心）

```js
passport.use(new LocalStrategy(
  async (username, password, done) => {
    const user = await User.findOne({ username });
    if (!user) return done(null, false);

    // 👇 这里才用 bcrypt
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return done(null, false);

    return done(null, user);
  }
));
```

> 注意：**bcrypt 是你写的，passport 不帮你加密**

---

## 三、真实项目中的组合方式（推荐）

### 1️⃣ 注册阶段

```
前端 → 后端
        ↓
   bcrypt / argon2
        ↓
    存入数据库
```

### 2️⃣ 登录阶段

```
前端输入密码
        ↓
passport 接管流程
        ↓
bcrypt.compare()
        ↓
生成 session / JWT
```

---

## 四、常见误区（你一定会遇到）

### ❌ 误区 1：Passport 会自动加密密码

**错误**。Passport 根本不知道你的密码怎么存的。

---

### ❌ 误区 2：crypto + JWT 就够了，不用 bcrypt

**错误**。JWT 只是身份载体，和密码存储无关。

---

### ❌ 误区 3：前端加密一次就安全

**错误**。前端加密 ≠ 后端安全存储。

---

## 五、给你的明确建议（基于你目前的学习阶段）

你现在在学 **Express + Node.js**，推荐你这样用：

### ✅ 简单项目（最推荐）

* **bcrypt**
* **JWT（jsonwebtoken）**
* 不用 Passport（先理解底层）

### ✅ 中大型 / 企业项目

* **bcrypt / argon2**
* **passport + passport-jwt / passport-local**

---

## 六、总结对照表

| 功能    | 用什么                    |
| ----- | ---------------------- |
| 密码加密  | bcrypt / argon2        |
| 密码校验  | bcrypt.compare         |
| 登录流程  | passport               |
| 会话管理  | passport-session / JWT |
| 第三方登录 | passport               |

---

如果你愿意，我可以 **直接帮你设计一个完整的 Express 登录模块**（注册 + 登录 + JWT / Passport 两种版本对比），非常适合你后面做后台管理系统。
