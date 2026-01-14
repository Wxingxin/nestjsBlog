下面给你一套把你“上一版 Header 方案”**改成**「**JWT + HttpOnly Cookie + Refresh Token（旋转）**」的**完整可跑代码**。我会按“同一项目结构”给出**需要替换/新增的文件**，你直接复制覆盖即可。

关键变化：

- **Access Token**：写入 `HttpOnly` cookie：`access_token`
- **Refresh Token**：写入 `HttpOnly` cookie：`refresh_token`
- React **不再存 token**（不再 localStorage）
- React 发请求时：`credentials: "include"`
- CORS：`credentials: true` + 指定 `origin`
- Refresh：后端从 cookie 读取 refresh，验证后 **rotation**（撤销旧 jti，签发新 refresh）

> 关于 CSRF：
> 如果你前端和后端是 **同站点**（例如同域或同站点 eTLD+1），`SameSite=Lax` 通常足够。
> 如果你是严格跨站（不同站点域名），你需要 `SameSite=None; Secure` 并且**必须加 CSRF 防护**（我在文末给你可落地方案）。

---

# 1) 后端 Express（Cookie + Refresh Rotation）

## 1.1 安装依赖

在 `server/`：

```bash
npm i cookie-parser cors helmet
```

你的 `jsonwebtoken bcrypt dotenv uuid express` 保持不变。

---

## 1.2 server/package.json（确认有这些依赖）

`server/package.json`

```json
{
  "name": "jwt-cookie-server",
  "type": "module",
  "scripts": {
    "dev": "node --watch src/app.js",
    "start": "node src/app.js"
  },
  "dependencies": {
    "bcrypt": "^5.1.1",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "uuid": "^9.0.1"
  }
}
```

---

## 1.3 server/.env（重点：Cookie/CORS）

`server/.env`

```env
PORT=4000
NODE_ENV=development

JWT_ACCESS_SECRET=replace_access_secret_long_random
JWT_REFRESH_SECRET=replace_refresh_secret_long_random
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# React dev server
CORS_ORIGIN=http://localhost:5173

# Cookie
COOKIE_SECURE=false
COOKIE_DOMAIN=
COOKIE_SAMESITE=lax
```

> 生产环境（HTTPS）通常要：`COOKIE_SECURE=true`；如果跨站：`COOKIE_SAMESITE=none`

---

## 1.4 server/src/config.js（替换）

`server/src/config.js`

```js
import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",

  access: {
    secret: process.env.JWT_ACCESS_SECRET,
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
    issuer: "jwt-cookie-demo",
    audience: "jwt-cookie-demo-users",
  },
  refresh: {
    secret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
    issuer: "jwt-cookie-demo",
    audience: "jwt-cookie-demo-users",
  },

  cookie: {
    secure: process.env.COOKIE_SECURE === "true",
    domain: process.env.COOKIE_DOMAIN || undefined,
    sameSite: process.env.COOKIE_SAMESITE || "lax", // "lax" | "strict" | "none"
  },
};

if (!config.access.secret) throw new Error("Missing JWT_ACCESS_SECRET");
if (!config.refresh.secret) throw new Error("Missing JWT_REFRESH_SECRET");
```

---

## 1.5 server/src/db.js（沿用即可）

（无需修改，仍然用内存 Map 存 refresh jti）

`server/src/db.js`

```js
export const db = {
  users: new Map(), // email -> user
  refreshTokens: new Map(), // jti -> { userId, expiresAt, revoked }
};
```

---

## 1.6 server/src/auth/token.js（沿用即可）

（不变：sign/verify 工具）

`server/src/auth/token.js`

```js
import jwt from "jsonwebtoken";
import { config } from "../config.js";

export function signAccessToken(payload) {
  return jwt.sign(payload, config.access.secret, {
    expiresIn: config.access.expiresIn,
    issuer: config.access.issuer,
    audience: config.access.audience,
  });
}

export function signRefreshToken(payload, options = {}) {
  return jwt.sign(payload, config.refresh.secret, {
    expiresIn: config.refresh.expiresIn,
    issuer: config.refresh.issuer,
    audience: config.refresh.audience,
    jwtid: options.jti,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.access.secret, {
    issuer: config.access.issuer,
    audience: config.access.audience,
  });
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, config.refresh.secret, {
    issuer: config.refresh.issuer,
    audience: config.refresh.audience,
  });
}
```

---

## 1.7 server/src/auth/auth.middleware.js（改成从 cookie 取 access）

`server/src/auth/auth.middleware.js`

```js
import { verifyAccessToken } from "./token.js";

export function requireAuth(req, res, next) {
  const token = req.cookies?.access_token;
  if (!token) return res.status(401).json({ message: "Missing access token" });

  try {
    const payload = verifyAccessToken(token);
    req.user = payload; // { userId, role, tv }
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
```

---

## 1.8 server/src/auth/auth.controller.js（核心：写 cookie + refresh rotation）

`server/src/auth/auth.controller.js`

```js
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db.js";
import { config } from "../config.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "./token.js";

function buildCookieOptions() {
  return {
    httpOnly: true,
    secure: config.cookie.secure, // production: true(https)
    sameSite: config.cookie.sameSite, // "lax" usually for same-site
    domain: config.cookie.domain, // optional
    path: "/",
  };
}

// access 短期 cookie（ms）
function accessCookieMaxAgeMs() {
  // 这里不做 parse 字符串（15m），直接给一个与你 expiresIn 接近的 ms
  return 15 * 60 * 1000;
}

function refreshCookieMaxAgeMs() {
  return 7 * 24 * 60 * 60 * 1000;
}

function setAuthCookies(res, { accessToken, refreshToken }) {
  const base = buildCookieOptions();

  res.cookie("access_token", accessToken, {
    ...base,
    maxAge: accessCookieMaxAgeMs(),
  });

  res.cookie("refresh_token", refreshToken, {
    ...base,
    maxAge: refreshCookieMaxAgeMs(),
  });
}

function clearAuthCookies(res) {
  const base = buildCookieOptions();
  // clearCookie 需要同样的属性（domain/sameSite/secure）才能确保清掉
  res.clearCookie("access_token", { ...base });
  res.clearCookie("refresh_token", { ...base });
}

/**
 * 注册
 */
export async function register(req, res) {
  const { email, password } = req.body ?? {};
  if (!email || !password)
    return res.status(400).json({ message: "email/password required" });

  if (db.users.has(email))
    return res.status(409).json({ message: "Email already exists" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: uuidv4(),
    email,
    passwordHash,
    role: "user",
    tokenVersion: 1,
  };

  db.users.set(email, user);
  return res.status(201).json({ message: "registered" });
}

/**
 * 登录：签发 access/refresh，并写入 HttpOnly cookies
 */
export async function login(req, res) {
  const { email, password } = req.body ?? {};
  if (!email || !password)
    return res.status(400).json({ message: "email/password required" });

  const user = db.users.get(email);
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const payload = { userId: user.id, role: user.role, tv: user.tokenVersion };

  const refreshJti = uuidv4();
  const refreshToken = signRefreshToken(payload, { jti: refreshJti });
  const accessToken = signAccessToken(payload);

  // 保存 refresh jti，用于撤销/轮换
  db.refreshTokens.set(refreshJti, {
    userId: user.id,
    expiresAt: Date.now() + refreshCookieMaxAgeMs(),
    revoked: false,
  });

  setAuthCookies(res, { accessToken, refreshToken });

  // 前端不需要 token，返回 user 即可
  return res.json({
    user: { id: user.id, email: user.email, role: user.role },
  });
}

/**
 * 刷新：从 cookie 取 refresh_token，rotation 后写回 cookies
 */
export async function refresh(req, res) {
  const refreshToken = req.cookies?.refresh_token;
  if (!refreshToken)
    return res.status(401).json({ message: "Missing refresh token" });

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    return res.status(401).json({ message: "Invalid refresh token" });
  }

  const jti = payload.jti;
  if (!jti)
    return res
      .status(401)
      .json({ message: "Invalid refresh token (missing jti)" });

  const record = db.refreshTokens.get(jti);
  if (!record || record.revoked)
    return res.status(401).json({ message: "Refresh token revoked" });
  if (record.expiresAt < Date.now())
    return res.status(401).json({ message: "Refresh token expired" });

  const user = [...db.users.values()].find((u) => u.id === payload.userId);
  if (!user) return res.status(401).json({ message: "User not found" });
  if (user.tokenVersion !== payload.tv)
    return res.status(401).json({ message: "Token version mismatch" });

  // rotation：撤销旧 jti
  db.refreshTokens.set(jti, { ...record, revoked: true });

  const newPayload = {
    userId: user.id,
    role: user.role,
    tv: user.tokenVersion,
  };

  const newAccessToken = signAccessToken(newPayload);
  const newJti = uuidv4();
  const newRefreshToken = signRefreshToken(newPayload, { jti: newJti });

  db.refreshTokens.set(newJti, {
    userId: user.id,
    expiresAt: Date.now() + refreshCookieMaxAgeMs(),
    revoked: false,
  });

  setAuthCookies(res, {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  });

  return res.json({ message: "refreshed" });
}

/**
 * 当前用户：靠 access_token cookie
 */
export async function me(req, res) {
  const { userId } = req.user;
  const user = [...db.users.values()].find((u) => u.id === userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  return res.json({ id: user.id, email: user.email, role: user.role });
}

/**
 * 登出：撤销当前 refresh，并清 cookies
 */
export async function logout(req, res) {
  const refreshToken = req.cookies?.refresh_token;
  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      if (payload.jti && db.refreshTokens.has(payload.jti)) {
        const r = db.refreshTokens.get(payload.jti);
        db.refreshTokens.set(payload.jti, { ...r, revoked: true });
      }
    } catch {
      // ignore
    }
  }

  clearAuthCookies(res);
  return res.json({ message: "logged out" });
}
```

---

## 1.9 server/src/auth/auth.routes.js（轻微调整：refresh/logout 都不再需要 body）

`server/src/auth/auth.routes.js`

```js
import { Router } from "express";
import { register, login, refresh, me, logout } from "./auth.controller.js";
import { requireAuth } from "./auth.middleware.js";

export const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/refresh", refresh);
authRouter.post("/logout", logout);
authRouter.get("/me", requireAuth, me);
```

---

## 1.10 server/src/app.js（重点：cookieParser + cors credentials）

`server/src/app.js`

```js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { config } from "./config.js";
import { authRouter } from "./auth/auth.routes.js";

const app = express();

app.use(helmet());
app.use(express.json());
app.use(cookieParser());

// Cookie 跨域必须：credentials: true + 明确 origin（不能用 "*")
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);

app.listen(config.port, () => {
  console.log(`API running on http://localhost:${config.port}`);
});
```

启动：

```bash
cd server
npm run dev
```

---

# 2) 前端 React（不存 token，全靠 cookie）

## 2.1 client/src/api/http.js（替换）

**要点：所有请求都带 `credentials: "include"`；401 时调用 `/refresh` 后重试。**

`client/src/api/http.js`

```js
const API_BASE = "http://localhost:4000";

let refreshingPromise = null;

async function refreshSession() {
  if (refreshingPromise) return refreshingPromise;

  refreshingPromise = (async () => {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error("Refresh failed");
    return true;
  })();

  try {
    return await refreshingPromise;
  } finally {
    refreshingPromise = null;
  }
}

export async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;

  const headers = new Headers(options.headers || {});
  // 非文件上传时默认 JSON
  if (
    !headers.has("Content-Type") &&
    options.body &&
    !(options.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  // access 过期：尝试 refresh 一次再重放
  if (res.status === 401) {
    try {
      await refreshSession();
      return await fetch(url, { ...options, headers, credentials: "include" });
    } catch {
      return res;
    }
  }

  return res;
}
```

---

## 2.2 client/src/api/auth.js（替换）

**登录不再保存 token；logout 不再传 refresh token。**

`client/src/api/auth.js`

```js
import { apiFetch } from "./http";

export async function registerApi(email, password) {
  const res = await apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error((await res.json()).message || "Register failed");
  return res.json();
}

export async function loginApi(email, password) {
  const res = await apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error((await res.json()).message || "Login failed");
  const data = await res.json();
  return data.user;
}

export async function meApi() {
  const res = await apiFetch("/api/auth/me");
  if (!res.ok)
    throw new Error((await res.json()).message || "Not authenticated");
  return res.json();
}

export async function logoutApi() {
  const res = await apiFetch("/api/auth/logout", { method: "POST" });
  // 无论 ok 与否都当作本地登出成功即可
  return res.ok;
}
```

---

## 2.3 AuthProvider.jsx（基本不变，只是不用 token 了）

你之前那版基本能用，保持即可。这里给一份明确版：

`client/src/auth/AuthProvider.jsx`

```jsx
import React, { createContext, useEffect, useState } from "react";
import { loginApi, logoutApi, meApi } from "../api/auth";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const me = await meApi();
        setUser(me);
      } catch {
        setUser(null);
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  async function login(email, password) {
    await loginApi(email, password);
    const me = await meApi();
    setUser(me);
  }

  async function logout() {
    await logoutApi();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, booting, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

---

# 3) 验证点（你能立刻自检是否成功）

1. 打开 `http://localhost:4000/health` → `{ok:true}`
2. React 注册后登录
3. 登录成功后，打开 DevTools：

   - Application → Cookies → `http://localhost:4000`
   - 应该看到：

     - `access_token`（HttpOnly）
     - `refresh_token`（HttpOnly）

4. 访问 Profile（调用 `/api/auth/me`）应成功
5. 将 `JWT_ACCESS_EXPIRES_IN` 临时改为 `10s`（同时把 access cookie maxAge 也改成 10s），观察：

   - `/me` 401 → 前端自动调用 `/refresh` → 再次 `/me` 成功

---

# 4) CSRF（你必须知道的生产注意事项）

Cookie 方案的核心风险是 **CSRF**（跨站请求伪造）。最低成本的落地策略：

- 若前后端同站点：`SameSite=Lax` 通常足够（你当前 localhost 开发一般 OK）
- 若跨站（不同域名站点）：你需要：

  1. `SameSite=None; Secure`（必须 HTTPS）
  2. 加 CSRF：常用“**双重提交 Cookie（Double Submit Cookie）**”或 `csurf`（已不太推荐）
  3. 对敏感接口（POST/PUT/DELETE）校验 `X-CSRF-Token`

如果你告诉我你的部署形态是：

- 同域（例如 `api.example.com` 和 `www.example.com`）
- 还是不同站点域名（跨站）

我可以把 CSRF 代码直接补齐到这套模板里（不会再问你额外问题，也不会改你现有结构）。

---

如果你现在已经把代码替换了但仍出现 `404` 或 cookie 不落地（看不到 `access_token/refresh_token`），把两段信息贴出来我就能快速定位：

1. 后端启动日志（包含端口）
2. 浏览器 Network 里 `/api/auth/login` 的响应头（看 `Set-Cookie` 是否出现）
