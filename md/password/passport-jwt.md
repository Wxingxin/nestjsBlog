我会按 **“概念→关键点→属性/API→工程结构→完整可跑代码→常见坑&安全加固”** 给你一套 `passport-jwt` 在 Express 里的**知识点大全 + 使用方法大全**（偏实战，复制就能用）。

> 说明：`passport-jwt` 是 Passport 的一个 Strategy，用 JWT 来鉴权 REST API，典型用法是**无 session**的接口保护。([GitHub][1])

---

## 1) passport-jwt 在项目里解决什么问题？

### 你要做的事分两段

1. **登录时签发 token**（用 `jsonwebtoken` 的 `sign`）
2. **访问受保护接口时验证 token**（用 `passport-jwt` 的 `Strategy` + `passport.authenticate`）

`jsonwebtoken` 会在签名校验通过后返回 decoded payload，并且可选校验 `exp/aud/iss` 等。([npm][2])

---

## 2) 你必须掌握的核心概念（很重要）

### A. Access Token vs Refresh Token（建议）

* **Access Token**：短时（如 15m），放 Header `Authorization: Bearer <token>`
* **Refresh Token**：长时（如 7d/30d），建议放 **HttpOnly Cookie** 或安全存储，并在服务端可撤销（数据库/Redis 存一份 tokenId 或哈希）

> 只用 Access Token 也能跑，但**无法安全“强制下线/撤销”**，实战通常要 Refresh 或者 token 版本号策略。

### B. Passport 的 `session: false`

`passport-jwt` 设计目标就是“无 session 的 REST API”，因此你通常在路由上 `passport.authenticate('jwt', { session: false })`。([GitHub][1])

---

## 3) passport-jwt 的“属性/配置项大全”——Strategy Options

`passport-jwt` 的核心就是配置 `JwtStrategy(options, verify)`。

### 3.1 options 里最常用的字段

| 字段                    | 作用                                 | 典型值/建议                                                       |
| --------------------- | ---------------------------------- | ------------------------------------------------------------ |
| `jwtFromRequest`      | **从哪里提取 token**                    | `ExtractJwt.fromAuthHeaderAsBearerToken()`（最常用）([GitHub][1]) |
| `secretOrKey`         | HMAC 密钥（HS256）或公钥（RS256）           | `process.env.JWT_SECRET` 或 RSA public key                    |
| `secretOrKeyProvider` | 动态提供 key（用于**key rotation / 多租户**） | 高级用法                                                         |
| `issuer`              | 校验 `iss`                           | 你的服务名（建议）                                                    |
| `audience`            | 校验 `aud`                           | 你的前端/客户端标识（建议）                                               |
| `algorithms`          | 限制可接受算法                            | `['HS256']` 或 `['RS256']`（强烈建议显式限制）                          |
| `ignoreExpiration`    | 是否忽略过期                             | **不要开**（除非调试）([GitHub][1])                                   |
| `passReqToCallback`   | verify 回调里是否拿到 req                 | 需要读 header/cookies 时开 ([GitHub][3])                          |

### 3.2 ExtractJwt 常用提取方式（你会用 1-2 个就够了）

* `fromAuthHeaderAsBearerToken()`：标准 Bearer
* `fromHeader('x-access-token')`：自定义 header
* `fromBodyField('token')`：从 body 取（不推荐）
* `fromUrlQueryParameter('token')`：URL 参数（非常不推荐，容易泄露）

---

## 4) verify 回调（鉴权的“灵魂”）

`verify(payload, done)` 你通常做三件事：

1. **查数据库**确认用户存在/未禁用
2. 把用户对象（或最小字段）放到 `req.user`
3. `done(null, user)` 或 `done(null, false)`（鉴权失败）

> payload 里只放**必要字段**（如 `sub/userId`, `role`, `tokenVersion`），别塞敏感信息。

---

## 5) 推荐工程结构（Express 项目落地）

```
src/
  app.js
  config/
    passport.js
  routes/
    auth.routes.js
    user.routes.js
  middleware/
    authz.js
    error.js
  services/
    token.service.js
  models/
    user.model.js   (示意)
```

---

## 6) 一套“可复制跑”的完整示例（HS256）

### 6.1 安装

```bash
npm i express passport passport-jwt jsonwebtoken dotenv
```

### 6.2 src/config/passport.js（配置 JwtStrategy）

```js
import passport from "passport";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";

// 假设你有个异步方法：根据 id 查用户
async function findUserById(id) {
  // TODO: 换成你的 DB 查询
  if (id === "123") return { id: "123", username: "alice", role: "user", disabled: false, tokenVersion: 0 };
  return null;
}

export function setupPassport() {
  const opts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET,
    issuer: process.env.JWT_ISSUER,     // 可选但推荐
    audience: process.env.JWT_AUDIENCE, // 可选但推荐
    algorithms: ["HS256"],
    // passReqToCallback: true, // 需要 req 再开
  };

  passport.use(
    new JwtStrategy(opts, async (payload, done) => {
      try {
        const userId = payload.sub; // 推荐用 sub 存 userId
        const user = await findUserById(userId);

        if (!user) return done(null, false);
        if (user.disabled) return done(null, false);

        // 可选：token 版本号（用于强制下线）
        if (typeof payload.tv === "number" && payload.tv !== user.tokenVersion) {
          return done(null, false);
        }

        // 把用户挂到 req.user
        return done(null, user);
      } catch (err) {
        return done(err, false);
      }
    })
  );

  return passport.initialize();
}
```

### 6.3 src/services/token.service.js（签发 token）

```js
import jwt from "jsonwebtoken";

export function signAccessToken(user) {
  const payload = {
    sub: user.id,
    role: user.role,
    tv: user.tokenVersion ?? 0,
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "15m",
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
  });
}
```

`jsonwebtoken` 的 `sign/verify` 支持 `expiresIn、issuer、audience、algorithm` 等校验配置。([npm][2])

### 6.4 src/middleware/authz.js（鉴权 + 权限）

```js
import passport from "passport";

export const requireAuth = passport.authenticate("jwt", { session: false });

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: "Forbidden" });
    next();
  };
}
```

### 6.5 src/routes/auth.routes.js（登录签发）

```js
import { Router } from "express";
import { signAccessToken } from "../services/token.service.js";

const router = Router();

// demo：假装校验账号密码
async function verifyPassword(username, password) {
  if (username === "alice" && password === "123456") {
    return { id: "123", username: "alice", role: "user", tokenVersion: 0 };
  }
  return null;
}

router.post("/login", async (req, res) => {
  const { username, password } = req.body ?? {};
  const user = await verifyPassword(username, password);
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const accessToken = signAccessToken(user);
  res.json({ accessToken });
});

export default router;
```

### 6.6 src/routes/user.routes.js（受保护接口）

```js
import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/authz.js";

const router = Router();

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.get("/admin", requireAuth, requireRole("admin"), (req, res) => {
  res.json({ ok: true });
});

export default router;
```

### 6.7 src/app.js（组装）

```js
import "dotenv/config";
import express from "express";
import { setupPassport } from "./config/passport.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";

const app = express();
app.use(express.json());

// Passport 初始化（只需要 initialize，不要 session）
app.use(setupPassport());

app.use("/auth", authRoutes);
app.use("/users", userRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Server error" });
});

app.listen(3000, () => console.log("http://localhost:3000"));
```

---

## 7) 常见坑（你很可能会踩）

### 坑 1：忘了 `passport.initialize()`

不初始化 → `passport.authenticate` 不工作。

### 坑 2：token 不是 “Bearer”

Header 必须像这样：

```
Authorization: Bearer eyJ...
```

否则 `fromAuthHeaderAsBearerToken()` 提取不到 token。

### 坑 3：`secretOrKey` 不一致

签发用的密钥 ≠ 验证用的密钥 → 永远 401。

### 坑 4：算法不限制

不限制 `algorithms` 容易引入错误配置风险；建议显式写死 `['HS256']` 或 `['RS256']`。

### 坑 5：把敏感信息塞进 payload

JWT payload 是可解码的（只是签名保证没被篡改），不要放密码/隐私数据。JWT 结构基础可以参考 jwt.io 的介绍。([JSON Web Tokens - jwt.io][4])

---

## 8) 安全最佳实践（生产建议）

Express 官方强调生产安全最佳实践（TLS、输入校验、安全 header 等）。([expressjs.com][5])
结合 JWT/Passport，建议你至少做到：

1. **全站 HTTPS**
2. Access Token 短过期（10–20m）
3. Refresh Token 可撤销（DB/Redis），并做轮换
4. `issuer/audience/algorithms` 显式校验（不要偷懒）
5. 登录/刷新接口加 **rate limit**
6. 记录 `jti` 或 `tokenVersion` 做强制下线
7. 错误返回统一：`401 Unauthorized` / `403 Forbidden` 区分清楚

---

## 9) 你下一步最该做什么（给你一个落地路线）

1. 先把上面 **HS256 版本**跑通（/auth/login → /users/me）
2. 加上 **refresh token**（我可以给你一份“可撤销刷新”的模板）
3. 加 RBAC（role/permission）
4. 上线前做安全加固（HTTPS、rate limit、helmet、CORS、日志脱敏等）

---

如果你告诉我：你现在的项目是 **MongoDB 还是 MySQL（或 Prisma）**、想用 **Access+Refresh** 还是只用 Access，我就直接给你一份**完全贴合你技术栈**的“生产级 auth 模板”（含刷新、退出登录、强制下线、黑名单/版本号方案）。

[1]: https://github.com/mikenicholson/passport-jwt?utm_source=chatgpt.com "mikenicholson/passport-jwt"
[2]: https://www.npmjs.com/package/jsonwebtoken?utm_source=chatgpt.com "jsonwebtoken"
[3]: https://github.com/mikenicholson/passport-jwt/blob/master/README.md?plain=1&utm_source=chatgpt.com "README.md - mikenicholson/passport-jwt"
[4]: https://jwt.io/introduction?utm_source=chatgpt.com "JSON Web Token Introduction - jwt.io"
[5]: https://expressjs.com/en/advanced/best-practice-security.html?utm_source=chatgpt.com "Security Best Practices for Express in Production"
