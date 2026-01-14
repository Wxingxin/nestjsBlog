下面给你一套可直接落地的 **React + Express（JWT + Authorization Header）完整项目代码**。目标是：

* 登录后拿到 `accessToken`（短期）与 `refreshToken`（长期）
* React 将 `accessToken` 放在请求 `Authorization: Bearer ...` 里
* access 过期后自动用 refresh 换新 access（仍走 Header 方案）
* Express 侧提供：注册、登录、刷新、获取当前用户、登出（可选）

> 安全说明（必须讲清楚）：
> 纯 Header 方案下，refresh token 往往需要存在前端（如 localStorage），会有 XSS 风险。生产更推荐 refresh 放 HttpOnly Cookie。但你明确要 Header 方案，我这里给你一套“全 Header”的工程实现。

**在我给你的代码里，存储位置是浏览器的 localStorage。**

# 1) 后端 Express（完整）

## 1.1 目录结构

```
server/
  package.json
  .env
  src/
    app.js
    config.js
    db.js
    auth/
      token.js
      auth.middleware.js
      auth.controller.js
      auth.routes.js
```

## 1.2 package.json

`server/package.json`

```json
{
  "name": "jwt-header-server",
  "type": "module",
  "scripts": {
    "dev": "node --watch src/app.js",
    "start": "node src/app.js"
  },
  "dependencies": {
    "bcrypt": "^5.1.1",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "uuid": "^9.0.1"
  }
}
```

安装：

```bash
cd server
npm i
```

## 1.3 .env

`server/.env`

```env
PORT=4000
NODE_ENV=development

JWT_ACCESS_SECRET=replace_access_secret_long_random
JWT_REFRESH_SECRET=replace_refresh_secret_long_random
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

CORS_ORIGIN=http://localhost:5173
```

## 1.4 config.js

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
    issuer: "jwt-header-demo",
    audience: "jwt-header-demo-users",
  },
  refresh: {
    secret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
    issuer: "jwt-header-demo",
    audience: "jwt-header-demo-users",
  }
};

if (!config.access.secret) throw new Error("Missing JWT_ACCESS_SECRET");
if (!config.refresh.secret) throw new Error("Missing JWT_REFRESH_SECRET");
```

## 1.5 模拟 DB（可替换为你真实数据库）

`server/src/db.js`

```js
// 用内存模拟：便于你先跑通流程
// 真实项目换成 Prisma/Mongoose/MySQL 都可以

export const db = {
  users: new Map(), // key: email -> user
  refreshTokens: new Map(), // key: refreshTokenId (jti) -> { userId, expiresAt, revoked }
};

// user: { id, email, passwordHash, role, tokenVersion }
```

## 1.6 Token 工具（签发/校验）

`server/src/auth/token.js`

```js
import jwt from "jsonwebtoken";
import { config } from "../config.js";

/**
 * 建议 payload 尽量小，放必要字段
 * tv(tokenVersion) 用于强制下线/撤销
 */
export function signAccessToken(payload) {
  return jwt.sign(payload, config.access.secret, {
    expiresIn: config.access.expiresIn,
    issuer: config.access.issuer,
    audience: config.access.audience,
  });
}

export function signRefreshToken(payload, options = {}) {
  // refresh token 加 jti 方便服务端做撤销/轮换
  return jwt.sign(payload, config.refresh.secret, {
    expiresIn: config.refresh.expiresIn,
    issuer: config.refresh.issuer,
    audience: config.refresh.audience,
    jwtid: options.jti, // jti
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

## 1.7 鉴权中间件（Authorization Header）

`server/src/auth/auth.middleware.js`

```js
import { verifyAccessToken } from "./token.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing Authorization Bearer token" });
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = verifyAccessToken(token);
    req.user = payload; // { userId, role, tv }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
```

## 1.8 Auth Controller（注册/登录/刷新/当前用户/登出）

`server/src/auth/auth.controller.js`

```js
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "./token.js";

/**
 * 注册
 * body: { email, password }
 */
export async function register(req, res) {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ message: "email/password required" });

  if (db.users.has(email)) {
    return res.status(409).json({ message: "Email already exists" });
  }

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
 * 登录
 * body: { email, password }
 * return: { accessToken, refreshToken, user }
 */
export async function login(req, res) {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ message: "email/password required" });

  const user = db.users.get(email);
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const payload = { userId: user.id, role: user.role, tv: user.tokenVersion };

  const refreshJti = uuidv4();
  const refreshToken = signRefreshToken(payload, { jti: refreshJti });
  const accessToken = signAccessToken(payload);

  // 服务端保存 refresh 的 jti，用于撤销/轮换（关键）
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  db.refreshTokens.set(refreshJti, { userId: user.id, expiresAt, revoked: false });

  return res.json({
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, role: user.role }
  });
}

/**
 * 刷新 Access Token（refresh rotation：顺便换新 refresh）
 * body: { refreshToken }
 * return: { accessToken, refreshToken }
 */
export async function refresh(req, res) {
  const { refreshToken } = req.body ?? {};
  if (!refreshToken) return res.status(400).json({ message: "refreshToken required" });

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken); // payload + jti 在 payload.jti
  } catch {
    return res.status(401).json({ message: "Invalid refresh token" });
  }

  const jti = payload.jti;
  if (!jti) return res.status(401).json({ message: "Invalid refresh token (missing jti)" });

  const record = db.refreshTokens.get(jti);
  if (!record || record.revoked) return res.status(401).json({ message: "Refresh token revoked" });
  if (record.expiresAt < Date.now()) return res.status(401).json({ message: "Refresh token expired" });

  // 可选：校验 tokenVersion（强制下线）
  // 这里从 users 里反查
  const user = [...db.users.values()].find(u => u.id === payload.userId);
  if (!user) return res.status(401).json({ message: "User not found" });
  if (user.tokenVersion !== payload.tv) return res.status(401).json({ message: "Token version mismatch" });

  // rotation：撤销旧 jti，签发新 jti
  db.refreshTokens.set(jti, { ...record, revoked: true });

  const newPayload = { userId: user.id, role: user.role, tv: user.tokenVersion };
  const newAccessToken = signAccessToken(newPayload);

  const newJti = uuidv4();
  const newRefreshToken = signRefreshToken(newPayload, { jti: newJti });
  db.refreshTokens.set(newJti, {
    userId: user.id,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    revoked: false
  });

  return res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
}

/**
 * 获取当前用户
 * header: Authorization: Bearer <accessToken>
 */
export async function me(req, res) {
  // req.user 来自 requireAuth
  const { userId } = req.user;
  const user = [...db.users.values()].find(u => u.id === userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  return res.json({ id: user.id, email: user.email, role: user.role });
}

/**
 * 登出：撤销 refresh（前端把 refreshToken 发过来）
 * body: { refreshToken }
 */
export async function logout(req, res) {
  const { refreshToken } = req.body ?? {};
  if (!refreshToken) return res.status(400).json({ message: "refreshToken required" });

  try {
    const payload = verifyRefreshToken(refreshToken);
    if (payload.jti && db.refreshTokens.has(payload.jti)) {
      const r = db.refreshTokens.get(payload.jti);
      db.refreshTokens.set(payload.jti, { ...r, revoked: true });
    }
  } catch {
    // 即使 token 无效，也按登出成功返回，避免泄露信息
  }

  return res.json({ message: "logged out" });
}
```

## 1.9 Routes

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

## 1.10 app.js

`server/src/app.js`

```js
import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { authRouter } from "./auth/auth.routes.js";

const app = express();

app.use(express.json());

// Header 方案不需要 credentials/cookie；CORS 只要允许 origin 即可
app.use(cors({
  origin: config.corsOrigin,
}));

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);

app.listen(config.port, () => {
  console.log(`API running on http://localhost:${config.port}`);
});
```

启动：

```bash
npm run dev
```

---

# 2) 前端 React（完整）

## 2.1 目录结构（Vite 例子）

```
client/
  package.json
  src/
    main.jsx
    api/
      http.js
      auth.js
    auth/
      AuthProvider.jsx
      useAuth.js
    pages/
      Login.jsx
      Register.jsx
      Profile.jsx
    App.jsx
```

创建（你也可以用 CRA）：

```bash
npm create vite@latest client -- --template react
cd client
npm i
```

## 2.2 统一 HTTP 封装（fetch + 自动刷新）

`client/src/api/http.js`

```js
const API_BASE = "http://localhost:4000";

function getAccessToken() {
  return localStorage.getItem("accessToken");
}
function setAccessToken(token) {
  localStorage.setItem("accessToken", token);
}
function getRefreshToken() {
  return localStorage.getItem("refreshToken");
}
function setRefreshToken(token) {
  localStorage.setItem("refreshToken", token);
}
function clearTokens() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

// 避免并发刷新：用一个全局 promise 做“单飞”
let refreshingPromise = null;

async function refreshTokens() {
  if (refreshingPromise) return refreshingPromise;

  refreshingPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new Error("No refresh token");

    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) throw new Error("Refresh failed");

    const data = await res.json();
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    return data.accessToken;
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
  headers.set("Content-Type", headers.get("Content-Type") || "application/json");

  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(url, { ...options, headers });

  // 401：尝试 refresh 一次，再重放原请求
  if (res.status === 401) {
    try {
      const newAccess = await refreshTokens();
      const retryHeaders = new Headers(headers);
      retryHeaders.set("Authorization", `Bearer ${newAccess}`);

      const retryRes = await fetch(url, { ...options, headers: retryHeaders });
      if (retryRes.status === 401) {
        clearTokens();
      }
      return retryRes;
    } catch {
      clearTokens();
      return res;
    }
  }

  return res;
}

export const tokenStore = {
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  setRefreshToken,
  clearTokens,
};
```

## 2.3 Auth API

`client/src/api/auth.js`

```js
import { apiFetch, tokenStore } from "./http";

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
  tokenStore.setAccessToken(data.accessToken);
  tokenStore.setRefreshToken(data.refreshToken);
  return data.user;
}

export async function meApi() {
  const res = await apiFetch("/api/auth/me");
  if (!res.ok) throw new Error((await res.json()).message || "Not authenticated");
  return res.json();
}

export async function logoutApi() {
  const refreshToken = tokenStore.getRefreshToken();
  if (refreshToken) {
    await apiFetch("/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  }
  tokenStore.clearTokens();
}
```

## 2.4 AuthProvider（全局登录态）

`client/src/auth/AuthProvider.jsx`

```jsx
import React, { createContext, useEffect, useState } from "react";
import { loginApi, logoutApi, meApi } from "../api/auth";
import { tokenStore } from "../api/http";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    (async () => {
      const hasToken =
        tokenStore.getAccessToken() || tokenStore.getRefreshToken();
      if (!hasToken) {
        setUser(null);
        setBooting(false);
        return;
      }

      try {
        const me = await meApi();
        setUser(me);
      } catch {
        tokenStore.clearTokens();
        setUser(null);
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  async function login(email, password) {
    const u = await loginApi(email, password);
    // 登录接口返回的 user 可能与 /me 格式不同，你可统一为 /me
    const me = await meApi();
    setUser(me);
    return u;
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

`client/src/auth/useAuth.js`

```js
import { useContext } from "react";
import { AuthContext } from "./AuthProvider";

export function useAuth() {
  return useContext(AuthContext);
}
```

## 2.5 页面：注册/登录/个人信息

`client/src/pages/Register.jsx`

```jsx
import React, { useState } from "react";
import { registerApi } from "../api/auth";

export default function Register() {
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("123456");
  const [msg, setMsg] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    try {
      await registerApi(email, password);
      setMsg("registered, now login");
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <div style={{ maxWidth: 420 }}>
      <h2>Register</h2>
      <form onSubmit={onSubmit}>
        <div>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email" />
        </div>
        <div>
          <input value={password} onChange={e => setPassword(e.target.value)} placeholder="password" type="password" />
        </div>
        <button type="submit">Register</button>
      </form>
      {msg && <p>{msg}</p>}
    </div>
  );
}
```

`client/src/pages/Login.jsx`

```jsx
import React, { useState } from "react";
import { useAuth } from "../auth/useAuth";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("123456");
  const [msg, setMsg] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    try {
      await login(email, password);
      setMsg("login success");
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <div style={{ maxWidth: 420 }}>
      <h2>Login</h2>
      <form onSubmit={onSubmit}>
        <div>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email" />
        </div>
        <div>
          <input value={password} onChange={e => setPassword(e.target.value)} placeholder="password" type="password" />
        </div>
        <button type="submit">Login</button>
      </form>
      {msg && <p>{msg}</p>}
    </div>
  );
}
```

`client/src/pages/Profile.jsx`

```jsx
import React, { useEffect, useState } from "react";
import { meApi } from "../api/auth";
import { useAuth } from "../auth/useAuth";

export default function Profile() {
  const { user, logout } = useAuth();
  const [me, setMe] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      setMsg("");
      try {
        const data = await meApi();
        setMe(data);
      } catch (err) {
        setMsg(err.message);
      }
    })();
  }, [user]);

  return (
    <div>
      <h2>Profile</h2>
      <button onClick={logout}>Logout</button>

      {msg && <p>{msg}</p>}
      <pre>{JSON.stringify(me, null, 2)}</pre>
    </div>
  );
}
```

## 2.6 App.jsx + main.jsx

`client/src/App.jsx`

```jsx
import React from "react";
import { useAuth } from "./auth/useAuth";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";

export default function App() {
  const { user, booting } = useAuth();

  if (booting) return <div>Loading...</div>;

  return (
    <div style={{ padding: 24 }}>
      <h1>JWT + Authorization Header Demo</h1>
      <div style={{ display: "flex", gap: 24 }}>
        <Register />
        <Login />
      </div>

      <hr />

      {user ? <Profile /> : <p>Please login to see profile.</p>}
    </div>
  );
}
```

`client/src/main.jsx`

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider } from "./auth/AuthProvider.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
```

启动：

```bash
cd client
npm run dev
```

---

# 3) 如何验证流程（按顺序）

1. 启动 server：`http://localhost:4000/health`
2. 启动 client：`http://localhost:5173`
3. Register 注册
4. Login 登录（localStorage 会有 accessToken/refreshToken）
5. Profile 调用 `/api/auth/me`（Authorization Header 自动带上）
6. 手动等待 access 过期（15m）或你改成 `10s` 观察：

   * `/me` 返回 401
   * 前端自动调用 `/refresh`
   * 拿到新 access，再重放 `/me`

---

# 4) 你后续可直接升级的点（不改变“Header 方案”的前提）

* 把 `db.js` 换成 MongoDB / MySQL / PostgreSQL（你在学 Prisma、MongoDB 都能接）
* 把 refresh token 存库（已提供 jti 机制）
* 加上 role 权限：`requireRole('admin')`
* 登录/注册加 `express-validator`

---

如果你希望我把这套代码进一步“工程化”到你做的社交平台后端风格（例如：`/api/users`、`/api/posts`、分页、RBAC、统一错误处理中间件、请求校验、日志、速率限制），我可以在这套基础上继续扩展一版更贴近真实生产的模板。
下面给你一套可直接落地的 **React + Express（JWT + Authorization Header）完整项目代码**。目标是：

* 登录后拿到 `accessToken`（短期）与 `refreshToken`（长期）
* React 将 `accessToken` 放在请求 `Authorization: Bearer ...` 里
* access 过期后自动用 refresh 换新 access（仍走 Header 方案）
* Express 侧提供：注册、登录、刷新、获取当前用户、登出（可选）

> 安全说明（必须讲清楚）：
> 纯 Header 方案下，refresh token 往往需要存在前端（如 localStorage），会有 XSS 风险。生产更推荐 refresh 放 HttpOnly Cookie。但你明确要 Header 方案，我这里给你一套“全 Header”的工程实现。

---

# 1) 后端 Express（完整）

## 1.1 目录结构

```
server/
  package.json
  .env
  src/
    app.js
    config.js
    db.js
    auth/
      token.js
      auth.middleware.js
      auth.controller.js
      auth.routes.js
```

## 1.2 package.json

`server/package.json`

```json
{
  "name": "jwt-header-server",
  "type": "module",
  "scripts": {
    "dev": "node --watch src/app.js",
    "start": "node src/app.js"
  },
  "dependencies": {
    "bcrypt": "^5.1.1",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "uuid": "^9.0.1"
  }
}
```

安装：

```bash
cd server
npm i
```

## 1.3 .env

`server/.env`

```env
PORT=4000
NODE_ENV=development

JWT_ACCESS_SECRET=replace_access_secret_long_random
JWT_REFRESH_SECRET=replace_refresh_secret_long_random
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

CORS_ORIGIN=http://localhost:5173
```

## 1.4 config.js

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
    issuer: "jwt-header-demo",
    audience: "jwt-header-demo-users",
  },
  refresh: {
    secret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
    issuer: "jwt-header-demo",
    audience: "jwt-header-demo-users",
  }
};

if (!config.access.secret) throw new Error("Missing JWT_ACCESS_SECRET");
if (!config.refresh.secret) throw new Error("Missing JWT_REFRESH_SECRET");
```

## 1.5 模拟 DB（可替换为你真实数据库）

`server/src/db.js`

```js
// 用内存模拟：便于你先跑通流程
// 真实项目换成 Prisma/Mongoose/MySQL 都可以

export const db = {
  users: new Map(), // key: email -> user
  refreshTokens: new Map(), // key: refreshTokenId (jti) -> { userId, expiresAt, revoked }
};

// user: { id, email, passwordHash, role, tokenVersion }
```

## 1.6 Token 工具（签发/校验）

`server/src/auth/token.js`

```js
import jwt from "jsonwebtoken";
import { config } from "../config.js";

/**
 * 建议 payload 尽量小，放必要字段
 * tv(tokenVersion) 用于强制下线/撤销
 */
export function signAccessToken(payload) {
  return jwt.sign(payload, config.access.secret, {
    expiresIn: config.access.expiresIn,
    issuer: config.access.issuer,
    audience: config.access.audience,
  });
}

export function signRefreshToken(payload, options = {}) {
  // refresh token 加 jti 方便服务端做撤销/轮换
  return jwt.sign(payload, config.refresh.secret, {
    expiresIn: config.refresh.expiresIn,
    issuer: config.refresh.issuer,
    audience: config.refresh.audience,
    jwtid: options.jti, // jti
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

## 1.7 鉴权中间件（Authorization Header）

`server/src/auth/auth.middleware.js`

```js
import { verifyAccessToken } from "./token.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing Authorization Bearer token" });
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = verifyAccessToken(token);
    req.user = payload; // { userId, role, tv }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
```

## 1.8 Auth Controller（注册/登录/刷新/当前用户/登出）

`server/src/auth/auth.controller.js`

```js
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "./token.js";

/**
 * 注册
 * body: { email, password }
 */
export async function register(req, res) {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ message: "email/password required" });

  if (db.users.has(email)) {
    return res.status(409).json({ message: "Email already exists" });
  }

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
 * 登录
 * body: { email, password }
 * return: { accessToken, refreshToken, user }
 */
export async function login(req, res) {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ message: "email/password required" });

  const user = db.users.get(email);
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const payload = { userId: user.id, role: user.role, tv: user.tokenVersion };

  const refreshJti = uuidv4();
  const refreshToken = signRefreshToken(payload, { jti: refreshJti });
  const accessToken = signAccessToken(payload);

  // 服务端保存 refresh 的 jti，用于撤销/轮换（关键）
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  db.refreshTokens.set(refreshJti, { userId: user.id, expiresAt, revoked: false });

  return res.json({
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, role: user.role }
  });
}

/**
 * 刷新 Access Token（refresh rotation：顺便换新 refresh）
 * body: { refreshToken }
 * return: { accessToken, refreshToken }
 */
export async function refresh(req, res) {
  const { refreshToken } = req.body ?? {};
  if (!refreshToken) return res.status(400).json({ message: "refreshToken required" });

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken); // payload + jti 在 payload.jti
  } catch {
    return res.status(401).json({ message: "Invalid refresh token" });
  }

  const jti = payload.jti;
  if (!jti) return res.status(401).json({ message: "Invalid refresh token (missing jti)" });

  const record = db.refreshTokens.get(jti);
  if (!record || record.revoked) return res.status(401).json({ message: "Refresh token revoked" });
  if (record.expiresAt < Date.now()) return res.status(401).json({ message: "Refresh token expired" });

  // 可选：校验 tokenVersion（强制下线）
  // 这里从 users 里反查
  const user = [...db.users.values()].find(u => u.id === payload.userId);
  if (!user) return res.status(401).json({ message: "User not found" });
  if (user.tokenVersion !== payload.tv) return res.status(401).json({ message: "Token version mismatch" });

  // rotation：撤销旧 jti，签发新 jti
  db.refreshTokens.set(jti, { ...record, revoked: true });

  const newPayload = { userId: user.id, role: user.role, tv: user.tokenVersion };
  const newAccessToken = signAccessToken(newPayload);

  const newJti = uuidv4();
  const newRefreshToken = signRefreshToken(newPayload, { jti: newJti });
  db.refreshTokens.set(newJti, {
    userId: user.id,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    revoked: false
  });

  return res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
}

/**
 * 获取当前用户
 * header: Authorization: Bearer <accessToken>
 */
export async function me(req, res) {
  // req.user 来自 requireAuth
  const { userId } = req.user;
  const user = [...db.users.values()].find(u => u.id === userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  return res.json({ id: user.id, email: user.email, role: user.role });
}

/**
 * 登出：撤销 refresh（前端把 refreshToken 发过来）
 * body: { refreshToken }
 */
export async function logout(req, res) {
  const { refreshToken } = req.body ?? {};
  if (!refreshToken) return res.status(400).json({ message: "refreshToken required" });

  try {
    const payload = verifyRefreshToken(refreshToken);
    if (payload.jti && db.refreshTokens.has(payload.jti)) {
      const r = db.refreshTokens.get(payload.jti);
      db.refreshTokens.set(payload.jti, { ...r, revoked: true });
    }
  } catch {
    // 即使 token 无效，也按登出成功返回，避免泄露信息
  }

  return res.json({ message: "logged out" });
}
```

## 1.9 Routes

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

## 1.10 app.js

`server/src/app.js`

```js
import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { authRouter } from "./auth/auth.routes.js";

const app = express();

app.use(express.json());

// Header 方案不需要 credentials/cookie；CORS 只要允许 origin 即可
app.use(cors({
  origin: config.corsOrigin,
}));

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);

app.listen(config.port, () => {
  console.log(`API running on http://localhost:${config.port}`);
});
```

启动：

```bash
npm run dev
```

---

# 2) 前端 React（完整）

## 2.1 目录结构（Vite 例子）

```
client/
  package.json
  src/
    main.jsx
    api/
      http.js
      auth.js
    auth/
      AuthProvider.jsx
      useAuth.js
    pages/
      Login.jsx
      Register.jsx
      Profile.jsx
    App.jsx
```

创建（你也可以用 CRA）：

```bash
npm create vite@latest client -- --template react
cd client
npm i
```

## 2.2 统一 HTTP 封装（fetch + 自动刷新）

`client/src/api/http.js`

```js
const API_BASE = "http://localhost:4000";

function getAccessToken() {
  return localStorage.getItem("accessToken");
}
function setAccessToken(token) {
  localStorage.setItem("accessToken", token);
}
function getRefreshToken() {
  return localStorage.getItem("refreshToken");
}
function setRefreshToken(token) {
  localStorage.setItem("refreshToken", token);
}
function clearTokens() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

// 避免并发刷新：用一个全局 promise 做“单飞”
let refreshingPromise = null;

async function refreshTokens() {
  if (refreshingPromise) return refreshingPromise;

  refreshingPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new Error("No refresh token");

    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) throw new Error("Refresh failed");

    const data = await res.json();
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    return data.accessToken;
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
  headers.set("Content-Type", headers.get("Content-Type") || "application/json");

  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(url, { ...options, headers });

  // 401：尝试 refresh 一次，再重放原请求
  if (res.status === 401) {
    try {
      const newAccess = await refreshTokens();
      const retryHeaders = new Headers(headers);
      retryHeaders.set("Authorization", `Bearer ${newAccess}`);

      const retryRes = await fetch(url, { ...options, headers: retryHeaders });
      if (retryRes.status === 401) {
        clearTokens();
      }
      return retryRes;
    } catch {
      clearTokens();
      return res;
    }
  }

  return res;
}

export const tokenStore = {
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  setRefreshToken,
  clearTokens,
};
```

## 2.3 Auth API

`client/src/api/auth.js`

```js
import { apiFetch, tokenStore } from "./http";

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
  tokenStore.setAccessToken(data.accessToken);
  tokenStore.setRefreshToken(data.refreshToken);
  return data.user;
}

export async function meApi() {
  const res = await apiFetch("/api/auth/me");
  if (!res.ok) throw new Error((await res.json()).message || "Not authenticated");
  return res.json();
}

export async function logoutApi() {
  const refreshToken = tokenStore.getRefreshToken();
  if (refreshToken) {
    await apiFetch("/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  }
  tokenStore.clearTokens();
}
```

## 2.4 AuthProvider（全局登录态）

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
    const u = await loginApi(email, password);
    // 登录接口返回的 user 可能与 /me 格式不同，你可统一为 /me
    const me = await meApi();
    setUser(me);
    return u;
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

`client/src/auth/useAuth.js`

```js
import { useContext } from "react";
import { AuthContext } from "./AuthProvider";

export function useAuth() {
  return useContext(AuthContext);
}
```

## 2.5 页面：注册/登录/个人信息

`client/src/pages/Register.jsx`

```jsx
import React, { useState } from "react";
import { registerApi } from "../api/auth";

export default function Register() {
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("123456");
  const [msg, setMsg] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    try {
      await registerApi(email, password);
      setMsg("registered, now login");
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <div style={{ maxWidth: 420 }}>
      <h2>Register</h2>
      <form onSubmit={onSubmit}>
        <div>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email" />
        </div>
        <div>
          <input value={password} onChange={e => setPassword(e.target.value)} placeholder="password" type="password" />
        </div>
        <button type="submit">Register</button>
      </form>
      {msg && <p>{msg}</p>}
    </div>
  );
}
```

`client/src/pages/Login.jsx`

```jsx
import React, { useState } from "react";
import { useAuth } from "../auth/useAuth";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("123456");
  const [msg, setMsg] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    try {
      await login(email, password);
      setMsg("login success");
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <div style={{ maxWidth: 420 }}>
      <h2>Login</h2>
      <form onSubmit={onSubmit}>
        <div>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email" />
        </div>
        <div>
          <input value={password} onChange={e => setPassword(e.target.value)} placeholder="password" type="password" />
        </div>
        <button type="submit">Login</button>
      </form>
      {msg && <p>{msg}</p>}
    </div>
  );
}
```

`client/src/pages/Profile.jsx`

```jsx
import React, { useEffect, useState } from "react";
import { meApi } from "../api/auth";
import { useAuth } from "../auth/useAuth";

export default function Profile() {
  const { user, logout } = useAuth();
  const [me, setMe] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      setMsg("");
      try {
        const data = await meApi();
        setMe(data);
      } catch (err) {
        setMsg(err.message);
      }
    })();
  }, [user]);

  return (
    <div>
      <h2>Profile</h2>
      <button onClick={logout}>Logout</button>

      {msg && <p>{msg}</p>}
      <pre>{JSON.stringify(me, null, 2)}</pre>
    </div>
  );
}
```

## 2.6 App.jsx + main.jsx

`client/src/App.jsx`

```jsx
import React from "react";
import { useAuth } from "./auth/useAuth";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";

export default function App() {
  const { user, booting } = useAuth();

  if (booting) return <div>Loading...</div>;

  return (
    <div style={{ padding: 24 }}>
      <h1>JWT + Authorization Header Demo</h1>
      <div style={{ display: "flex", gap: 24 }}>
        <Register />
        <Login />
      </div>

      <hr />

      {user ? <Profile /> : <p>Please login to see profile.</p>}
    </div>
  );
}
```

`client/src/main.jsx`

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider } from "./auth/AuthProvider.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
```

启动：

```bash
cd client
npm run dev
```

---

# 3) 如何验证流程（按顺序）

1. 启动 server：`http://localhost:4000/health`
2. 启动 client：`http://localhost:5173`
3. Register 注册
4. Login 登录（localStorage 会有 accessToken/refreshToken）
5. Profile 调用 `/api/auth/me`（Authorization Header 自动带上）
6. 手动等待 access 过期（15m）或你改成 `10s` 观察：

   * `/me` 返回 401
   * 前端自动调用 `/refresh`
   * 拿到新 access，再重放 `/me`

---

# 4) 你后续可直接升级的点（不改变“Header 方案”的前提）

* 把 `db.js` 换成 MongoDB / MySQL / PostgreSQL（你在学 Prisma、MongoDB 都能接）
* 把 refresh token 存库（已提供 jti 机制）
* 加上 role 权限：`requireRole('admin')`
* 登录/注册加 `express-validator`

---

如果你希望我把这套代码进一步“工程化”到你做的社交平台后端风格（例如：`/api/users`、`/api/posts`、分页、RBAC、统一错误处理中间件、请求校验、日志、速率限制），我可以在这套基础上继续扩展一版更贴近真实生产的模板。
