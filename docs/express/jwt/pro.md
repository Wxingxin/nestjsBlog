下面给你一份偏“工程化”的 **Express 项目 JWT（jsonwebtoken）配置大全**（含最佳实践、常见坑、可直接拷贝的代码结构）。默认你前端是 React，但这里主要聚焦后端 Express。

---

## 1) 必装依赖与目录建议

### 依赖（按场景选）

* 必需：`jsonwebtoken`
* 环境变量：`dotenv`
* Cookie 方案：`cookie-parser`
* 请求校验/安全：`helmet`、`cors`
* 密码：`bcrypt` / `bcryptjs`

```bash
npm i jsonwebtoken dotenv
npm i cookie-parser cors helmet
```

### 推荐目录

```
src/
  app.js
  config/
    env.js
    jwt.js
  middleware/
    auth.js
    error.js
  routes/
    auth.routes.js
  controllers/
    auth.controller.js
  utils/
    signToken.js
```

---

## 2) 环境变量配置（强烈建议）

`.env`

```env
NODE_ENV=development
PORT=3000

JWT_SECRET=replace_with_long_random_secret
JWT_EXPIRES_IN=15m

JWT_REFRESH_SECRET=replace_with_long_random_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d

COOKIE_SECURE=false
COOKIE_DOMAIN=
```

### env 加载

`src/config/env.js`

```js
import dotenv from "dotenv";
dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3000),

  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "15m",

  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",

  cookieSecure: process.env.COOKIE_SECURE === "true",
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
};

if (!env.jwtSecret) throw new Error("Missing JWT_SECRET");
if (!env.jwtRefreshSecret) throw new Error("Missing JWT_REFRESH_SECRET");
```

---

## 3) JWT 配置核心点（你要“配哪些东西”）

JWT “配置”主要是这些维度：

1. **Payload 结构**：放什么（userId、role、tokenVersion 等）
2. **签名算法**：默认 HS256（常用），或 RS256（更高级）
3. **过期策略**：access 短、refresh 长
4. **签发者/受众**：`issuer(iss)`、`audience(aud)`（企业项目常见）
5. **黑名单/撤销机制**：tokenVersion、refresh rotation、jti 等
6. **传输方式**：Header 或 HttpOnly Cookie
7. **错误处理**：401 vs 403；过期 vs 无效

---

## 4) 统一的签发工具（推荐写成函数）

`src/config/jwt.js`

```js
import { env } from "./env.js";

export const jwtConfig = {
  access: {
    secret: env.jwtSecret,
    expiresIn: env.jwtExpiresIn, // 15m
    issuer: "your-app",
    audience: "your-app-users",
  },
  refresh: {
    secret: env.jwtRefreshSecret,
    expiresIn: env.jwtRefreshExpiresIn, // 7d
    issuer: "your-app",
    audience: "your-app-users",
  },
};
```

`src/utils/signToken.js`

```js
import jwt from "jsonwebtoken";
import { jwtConfig } from "../config/jwt.js";

export function signAccessToken(payload) {
  return jwt.sign(payload, jwtConfig.access.secret, {
    expiresIn: jwtConfig.access.expiresIn,
    issuer: jwtConfig.access.issuer,
    audience: jwtConfig.access.audience,
  });
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, jwtConfig.refresh.secret, {
    expiresIn: jwtConfig.refresh.expiresIn,
    issuer: jwtConfig.refresh.issuer,
    audience: jwtConfig.refresh.audience,
  });
}
```

---

## 5) 鉴权中间件（Header 版：最常用）

`src/middleware/auth.js`

```js
import jwt from "jsonwebtoken";
import { jwtConfig } from "../config/jwt.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing Bearer token" });
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = jwt.verify(token, jwtConfig.access.secret, {
      issuer: jwtConfig.access.issuer,
      audience: jwtConfig.access.audience,
    });

    req.user = payload; // { userId, role, ... }
    next();
  } catch (err) {
    // TokenExpiredError / JsonWebTokenError / NotBeforeError
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
```

### 授权（RBAC：role 权限）

```js
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user?.role) return res.status(403).json({ message: "Forbidden" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: "Forbidden" });
    next();
  };
}
```

---

## 6) Cookie 版（HttpOnly）鉴权中间件（可选）

需要：

```js
import cookieParser from "cookie-parser";
app.use(cookieParser());
```

中间件：

```js
export function requireAuthCookie(req, res, next) {
  const token = req.cookies?.access_token;
  if (!token) return res.status(401).json({ message: "Missing token cookie" });

  try {
    const payload = jwt.verify(token, jwtConfig.access.secret, {
      issuer: jwtConfig.access.issuer,
      audience: jwtConfig.access.audience,
    });
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
```

---

## 7) 登录/刷新/登出（推荐“Access + Refresh”完整配置）

### Cookie 参数（工程常用）

```js
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production", // https 才能 secure
  sameSite: "lax", // 跨站需求高再考虑 "none" + secure
  path: "/",
};
```

`src/controllers/auth.controller.js`

```js
import { signAccessToken, signRefreshToken } from "../utils/signToken.js";

export async function login(req, res) {
  // 1) 校验账号密码（略）
  const user = { id: "u1", role: "user", tokenVersion: 1 };

  // 2) payload 建议只放必要字段
  const payload = { userId: user.id, role: user.role, tv: user.tokenVersion };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  // Header 方案：直接返回给前端存储
  // return res.json({ accessToken, refreshToken });

  // Cookie 方案：写入 HttpOnly Cookie
  res.cookie("access_token", accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
  res.cookie("refresh_token", refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

  return res.json({ message: "ok" });
}
```

### 刷新接口（refresh → new access）

```js
import jwt from "jsonwebtoken";
import { jwtConfig } from "../config/jwt.js";
import { signAccessToken } from "../utils/signToken.js";

export async function refresh(req, res) {
  const token = req.cookies?.refresh_token; // 或从 body/header 取
  if (!token) return res.status(401).json({ message: "Missing refresh token" });

  try {
    const payload = jwt.verify(token, jwtConfig.refresh.secret, {
      issuer: jwtConfig.refresh.issuer,
      audience: jwtConfig.refresh.audience,
    });

    // 可选：查库验证 tokenVersion / 用户状态，做“撤销”
    const newAccess = signAccessToken({
      userId: payload.userId,
      role: payload.role,
      tv: payload.tv,
    });

    res.cookie("access_token", newAccess, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
    return res.json({ message: "ok" });
  } catch {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
}
```

### 登出（清 Cookie）

```js
export async function logout(req, res) {
  res.clearCookie("access_token");
  res.clearCookie("refresh_token");
  return res.json({ message: "logged out" });
}
```

---

## 8) CORS/React 联调配置（非常关键）

如果你走 **Cookie 方案**，React 端必须 `credentials: 'include'`，并且后端 CORS 必须允许凭据。

```js
import cors from "cors";

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  credentials: true,
}));
```

React fetch：

```js
fetch("http://localhost:3000/api/auth/refresh", {
  method: "POST",
  credentials: "include",
});
```

---

## 9) 常见坑与最佳实践清单（你写项目一定会踩）

### 安全与设计

* Access Token 建议 **短期（5–30min）**，Refresh Token **长（7–30d）**
* Payload 不要放敏感信息（密码、邮箱可不放）
* JWT 不是“会话存储”，它是“可验证声明”
* 需要“强制下线/封禁”时：用 `tokenVersion(tv)` 或 refresh token rotation

### 报错语义

* **401 Unauthorized**：没登录/Token 无效
* **403 Forbidden**：已登录但无权限

### Cookie 相关

* `sameSite: "none"` 必须配 `secure: true`（HTTPS），否则浏览器丢 Cookie
* 生产环境用 HTTPS；本地开发可用 `lax + 非 secure`

### 依赖

* `jsonwebtoken` 只做 token，不做“策略”，要么自己写中间件，要么用 `passport-jwt`

---

## 10) 一份最小可跑的 app.js（把配置串起来）

`src/app.js`

```js
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { requireAuth } from "./middleware/auth.js";

const app = express();

app.use(helmet());
app.use(express.json());
app.use(cookieParser());

app.use(cors({
  origin: ["http://localhost:5173"],
  credentials: true,
}));

app.get("/health", (req, res) => res.json({ ok: true }));

app.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.listen(env.port, () => console.log(`Server on ${env.port}`));
```

---

如果你告诉我你准备采用哪一种存储方式：

1. **Header（Bearer）**
2. **Cookie（HttpOnly）**

我可以把上面这套“大全”进一步收敛成你项目的**最终版本模板**（含 routes、controllers、错误处理中间件、刷新 token 的自动化处理方案）。
