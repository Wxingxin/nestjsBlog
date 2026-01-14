下面我从**工程视角**回答你两个问题：
**① passport-jwt 在项目中到底怎么用**，
**② 它在真实项目里用得多不多、重不重要、值不值得学**。

---

# 一、passport-jwt 是什么（定位先搞清）

**passport-jwt = Passport 的一个策略（Strategy）**
本质作用只有一个：

> **从请求中解析 JWT → 校验 → 把用户对象挂到 `req.user`**

它**不负责**：

* 登录（签 token）
* 刷新 token
* 存 cookie
* 管 session

它只负责 **“鉴权”**（Authentication），而不是 **“授权设计”**。

---

# 二、passport-jwt 在 Express 项目中的典型使用方式

## 1️⃣ 最常见的使用场景

### 场景 1：API 路由鉴权（最典型）

```txt
前端 → Authorization: Bearer <jwt>
后端 → passport-jwt 校验
→ req.user
```

用于：

* REST API
* 后台管理系统
* 移动端接口
* 第三方 API

---

### 场景 2：JWT + Cookie（也能用）

```txt
前端 → Cookie: access_token=xxx
后端 → passport-jwt 从 cookie 取 token
```

> 只是 **token 提取方式不同**，passport-jwt 完全支持

---

## 2️⃣ 一个“真实可用但不复杂”的结构

```txt
src/
 ├─ auth/
 │   ├─ passport.js        # 所有 passport 策略
 │   └─ jwtStrategy.js
 ├─ middlewares/
 │   └─ auth.js            # protect / optionalAuth
 ├─ routes/
 │   └─ user.routes.js
 └─ app.js
```

---

## 3️⃣ 安装依赖

```bash
npm i passport passport-jwt
```

---

## 4️⃣ 配置 JWT Strategy（核心）

### `src/auth/jwtStrategy.js`

```js
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import User from "../models/User.js";

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
};

export default function jwtStrategy(passport) {
  passport.use(
    new JwtStrategy(opts, async (payload, done) => {
      try {
        // payload 通常是 { sub: userId, iat, exp }
        const user = await User.findById(payload.sub).select("-password");

        if (!user) {
          return done(null, false);
        }

        return done(null, user);
      } catch (err) {
        return done(err, false);
      }
    })
  );
}
```

> 说明：

* **JWT 里只放 userId（sub）**
* 每次请求从 DB 拿用户 → 可检查封号 / 权限变化
* 这是生产项目的常见做法

---

## 5️⃣ 初始化 passport

### `src/auth/passport.js`

```js
import passport from "passport";
import jwtStrategy from "./jwtStrategy.js";

jwtStrategy(passport);

export default passport;
```

---

## 6️⃣ Express 中使用（保护路由）

### `src/middlewares/auth.js`

```js
import passport from "../auth/passport.js";

export const protect = passport.authenticate("jwt", {
  session: false,
});

export const optionalAuth = passport.authenticate("jwt", {
  session: false,
  failWithError: false,
});
```

---

### 在路由中使用

```js
// user.routes.js
import express from "express";
import { protect } from "../middlewares/auth.js";

const router = express.Router();

router.get("/me", protect, (req, res) => {
  res.json(req.user);
});

export default router;
```

---

## 7️⃣ 登录时签发 JWT（passport 不管）

```js
import jwt from "jsonwebtoken";

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
}
```

---

# 三、passport-jwt 在项目中“用得多吗？”

### 结论分三层

---

## 🟢 用得多的场景

✅ **传统 Express / NestJS 后端**
✅ **REST API 项目**
✅ **多策略登录（JWT + OAuth + 本地登录）**
✅ **需要“统一鉴权入口”的团队项目**

原因：

* Passport 是**策略模式**
* jwt / google / github / local 可并存
* 团队协作清晰

---

## 🟡 用得一般的场景

⚠️ **小型项目 / 个人项目**

* 直接 `jsonwebtoken.verify()` + 中间件
* 代码更直观、依赖更少

---

## 🔴 用得少的场景

❌ **Next.js App Router / Edge Runtime**
❌ **Serverless（Vercel Edge / Cloudflare）**
❌ **极简 API（1~2 个接口）**

原因：

* passport 偏“重量级”
* 抽象多，不如手写直观

---

# 四、passport-jwt 重要吗？值不值得学？

## 面试 & 工程角度结论

### ✅ **重要，但不是“必须依赖”**

你要掌握的是：

* JWT 鉴权模型
* Token 提取 / 校验 / 用户注入
* 中间件式保护路由

**passport-jwt 是一种“成熟实现方案”，不是唯一方案。**

---

## 面试时正确的态度（非常加分）

> “我理解 JWT 鉴权的完整流程，
> 在中大型 Express 项目中我会用 passport-jwt 来统一鉴权策略，
> 小项目我会手写中间件，减少复杂度。”

👉 这是**工程成熟度**的体现。

---

# 五、passport-jwt vs 手写 JWT 中间件

| 对比点    | passport-jwt | 手写中间件 |
| ------ | ------------ | ----- |
| 上手难度   | 中            | 低     |
| 可读性    | 一般           | 高     |
| 多策略扩展  | ✅ 非常强        | ❌     |
| 代码可控性  | 中            | 高     |
| 小项目适合度 | 一般           | 很好    |
| 团队协作   | 很好           | 一般    |

---

# 六、结合你现在的学习阶段（建议）

结合你目前在：

* Express
* JWT + Cookie
* 后端架构学习

### ✅ 建议路线

1. **先会手写 JWT 鉴权中间件**
2. 再学 passport-jwt（理解“策略化鉴权”）
3. 项目中二选一都 OK，能说明取舍即可

---

如果你愿意，下一步我可以：

* 帮你 **把 passport-jwt 和你现在的 JWT + HttpOnly Cookie + Refresh 方案整合**
* 或直接对比 **passport-jwt vs 自写中间件（完整代码）**
* 或给你一份 **“面试怎么讲 passport-jwt” 的标准话术**

你可以直接选一个。
