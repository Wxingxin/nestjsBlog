是的，**必须二选一（至少选一个）**。
在 **React + Express + JWT** 的体系中，JWT **不可能“凭空”生效**，它**一定要通过某种方式从前端传到后端**。

> **JWT 必须依附在一次 HTTP 请求上**
> 👉 而现实中只有两条正路：
>
> 1. **Authorization Header**
> 2. **HttpOnly Cookie**

不存在第三种“正规且可持续”的方案。

---

## 一、为什么“必须选一个”？（底层原因）

HTTP 请求本身是**无状态的**：

```text
请求 A 和 请求 B 之间，服务器不知道你是不是同一个人
```

JWT 的作用就是：

> **在每一次请求中，携带“你是谁”的证明**

如果你：

- 不放在 Header
- 不放在 Cookie

那后端 **根本拿不到 JWT**，就无法 `jwt.verify()`。

---

## 二、React + Express 可用的 2 种“官方级”方案

### 方案 1：JWT + Authorization Header（最通用）

#### 请求形态

```http
Authorization: Bearer eyJhbGciOi...
```

#### React

```js
fetch("/api/me", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

#### Express

```js
const token = req.headers.authorization?.split(" ")[1];
jwt.verify(token, JWT_SECRET);
```

#### 特点

- 前后端彻底解耦
- 移动端 / RN / Flutter 通用
- 不自动携带（你控制得很清楚）

---

### 方案 2：JWT + HttpOnly Cookie（偏 Web）

#### Cookie

```http
Set-Cookie: access_token=xxx; HttpOnly;
```

#### React

```js
fetch("/api/me", {
  credentials: "include",
});
```

#### Express

```js
const token = req.cookies.access_token;
jwt.verify(token, JWT_SECRET);
```

#### 特点

- 浏览器自动携带
- HttpOnly 防 XSS
- 需要处理 CSRF

---

## 三、你“不能用”的几种方式（重点避坑）

### ❌ 只返回 JWT，但前端不保存、不发送

```js
res.json({ token });
```

👉 **等于没鉴权**

---

### ❌ 只放在 React state（刷新即丢）

```js
const [token, setToken] = useState();
```

👉 页面一刷新就“退出登录”

---

### ❌ 只放在普通 Cookie（非 HttpOnly）

```js
document.cookie = "token=xxx";
```

👉 XSS 一刀带走

---

## 四、为什么“Header 和 Cookie 是唯二正解”

| 方式                 | 是否每次请求自动携带 | 是否安全  | 是否通用 |
| -------------------- | -------------------- | --------- | -------- |
| Authorization Header | ❌（手动）           | 中        | ✅       |
| HttpOnly Cookie      | ✅                   | 高        | ❌       |
| LocalStorage         | ❌                   | 低（XSS） | ⚠️       |
| JS Cookie            | ❌                   | 低        | ❌       |

**真正推荐的，只有前两种。**

---

## 五、给你一个“标准回答”（面试可用）

> 在 React + Express 项目中，JWT 必须通过 HTTP 请求携带到后端，一般有两种方式：
> 一种是放在 Authorization Header 中，适合前后端分离和多端场景；
> 另一种是放在 HttpOnly Cookie 中，安全性更高，但需要额外处理 CSRF。
> 无论哪种，JWT 都不能脱离 Header 或 Cookie 单独使用。

---

## 六、给你的个人建议（结合你目前阶段）

你现在：

- React + Express
- 学习 / 项目 / 面试并重

### 👉 **现在就用：Authorization Header**

原因：

- 概念最清晰
- 面试最好讲
- 配置最少

**等你对 JWT 非常熟了，再学 Cookie 方案。**

---

## 最重要的一句话（一定记住）

> **JWT 是“证件”，Header / Cookie 是“携带方式”** > **证件不带上，就等于没证件**

---

如果你愿意，我可以下一步**只给你一套“React + Express + JWT（Header 方案）完整模板”**，不掺 Cookie，不混概念。

这是一个**非常好的追问**，你的困惑本身是正确的。我们把话一次性说清楚，避免“概念混在一起”。

---

## 一句话先给结论（重点）

> **JWT 不需要 Cookie 才能使用** > **但 JWT 可以选择放在 Cookie 里**

我之前说的 **“不需要 Cookie”是指：不是强制依赖**，
而你看到的代码里 **出现 Cookie，是因为我展示了“另一种可选方案”**。

---

## 把三件事彻底拆开（核心认知）

### 1️⃣ JWT 是什么

JWT = **一段字符串 + 签名机制**

```text
header.payload.signature
```

👉 JWT **只负责“身份凭证”本身**

---

### 2️⃣ Cookie 是什么

Cookie = **浏览器的一种存储 & 自动携带机制**

👉 Cookie **只是存储/传输 JWT 的一种方式**

---

### 3️⃣ 两者关系（重点）

| 项目       | JWT | Cookie |
| ---------- | --- | ------ |
| 身份凭证   | ✅  | ❌     |
| 存储介质   | ❌  | ✅     |
| 是否必须   | ❌  | ❌     |
| 是否可搭配 | ✅  | ✅     |

**JWT ≠ Cookie**
**JWT 可以完全脱离 Cookie 使用**

---

## 为什么我给你的代码里有 Cookie？

因为 **Express + React 项目里 JWT 实际上有两条路线**，而我给你的是**“配置大全”**，不是“单一路线”。

---

## 路线 A（你一开始理解的那条）：❌ 不用 Cookie

### JWT + Authorization Header（完全不需要 Cookie）

#### 登录

```js
res.json({ accessToken });
```

#### 前端

```js
fetch("/api/me", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

#### 后端

```js
const token = req.headers.authorization?.split(" ")[1];
jwt.verify(token, JWT_SECRET);
```

✔ 没有 Cookie
✔ 不用 `cookie-parser`
✔ 不用 `credentials: 'include'`

---

## 路线 B（我后面补充的）：✅ 用 Cookie（更安全）

### JWT + HttpOnly Cookie

```js
res.cookie("access_token", token, {
  httpOnly: true,
});
```

浏览器自动带：

```js
fetch("/api/me", {
  credentials: "include",
});
```

---

## 你为什么会觉得“矛盾”？

因为**大多数新手会把下面两句话混在一起**：

❌「JWT 必须用 Cookie」
❌「不用 Cookie 就不能鉴权」

这两句都是错的。

**正确说法是：**

> JWT 是鉴权方案
> Cookie / Header 是“放 JWT 的地方”

---

## 回到你的问题本身

> **“你不是说不需要 Cookie 吗，为什么上面的代码有 cookie”**

**准确回答：**

- 我说的“不需要 Cookie”是指 **JWT 本身不依赖 Cookie**
- 代码中出现 Cookie，是为了展示 **JWT 的另一种“存放方式”**
- 你完全可以 **删除所有 Cookie 相关代码，JWT 依然正常工作**

---

## 给你一个明确的建议（非常重要）

### 如果你现在：

- 正在学 Express / JWT 原理
- 准备面试
- 前后端完全分离（React）

👉 **请先只用：JWT + Authorization Header**

**不要用 Cookie**

---

### 什么时候再用 Cookie？

当你：

- 已经熟练 JWT
- 想做“更真实的生产项目”
- 想解决 XSS 问题

👉 再上 **JWT + HttpOnly Cookie + Refresh Token**

---

## 最关键的一句话（你一定要记住）

> **JWT 是“身份”，Cookie 是“包”** > **你可以用包，也可以不用包**

---

如果你愿意，我可以下一步**只给你一套“完全不使用 Cookie 的 JWT Express 项目最终模板”**，干净、面试友好。
你只要说一句：**“只要 Header 方案”**。


下面把两套方案放在同一个“评估框架”里做对比：**安全模型、前端实现复杂度、跨域/部署、刷新策略、适用场景**。你可以把它当成选型清单。

---

## 1) 两种方案的定义边界

### A. JWT + HttpOnly Cookie + Refresh Token（典型“会话化 JWT”）

* **Access Token**：短期（例如 5–15 分钟），用于访问受保护 API。
* **Refresh Token**：长期（例如 7–30 天），只用于换取新的 Access Token。
* **存储位置**：

  * Refresh Token **必须**放 **HttpOnly + Secure Cookie**（通常还会 `SameSite`）。
  * Access Token：常见两种：

    1. 也放 Cookie（同样 HttpOnly），每次请求自动携带；
    2. **仅保存在内存**（React state / context），请求时由前端主动带（不落盘），过期就用 Refresh Cookie 去换新。
* **服务端**：一般会做 refresh token 轮换（rotation）、黑名单/版本号（tokenVersion）或数据库会话表。

### B. JWT + Authorization Header（典型“纯 JWT / Bearer”）

* **Access Token**：通常更长一些（例如 15–60 分钟）或也可以很短。
* **Refresh Token**：可选；但只要想“无感续期”，一般也需要 refresh。
* **存储位置**（关键分歧点）：

  * Access Token 常见放 **localStorage / sessionStorage** 或内存。
  * Refresh Token 如果也要持久化，往往也落在 localStorage（风险更高）或 cookie（这时就会混合回到方案A的一部分）。
* **请求方式**：前端显式加 header：`Authorization: Bearer <token>`。
* **服务端**：大多是无状态校验（只验签+claims），可选做黑名单/版本号。

---

## 2) 安全对比（最重要）

### 2.1 XSS 风险

* **Header 方案（token 放 localStorage）**：
  一旦站点存在 XSS，攻击脚本可直接读到 token 并外带，属于**高风险**。
* **Cookie(HttpOnly) 方案**：
  HttpOnly Cookie **无法被 JS 读取**，对“窃取 token”这类攻击有明显优势。
  但注意：XSS 仍可**发起同源请求**（因为浏览器会自动带 cookie），所以 XSS 仍然严重，只是“偷走 token 长期滥用”的风险下降。

结论：**XSS 防护维度上，HttpOnly Cookie 对“token exfiltration”更强。**

### 2.2 CSRF 风险

* **Cookie 自动携带** ⇒ 天然会面临 CSRF。
  解决手段通常是组合拳：

  * `SameSite=Lax/Strict`（多数场景可显著降低风险；跨站点嵌入/第三方登录场景要更谨慎）
  * **CSRF Token（双提交 cookie / header）**
  * 对敏感写操作要求额外校验（Origin/Referer 检查）
* **Authorization Header**：
  不会被跨站自动带上（除非你的 JS 主动加），因此 **天然抗 CSRF**。

结论：**CSRF 维度上，Header 更省心；Cookie 必须认真做 CSRF 防护。**

### 2.3 Token 吊销与“踢下线”

* 两者如果都只做“纯无状态 access token”，都难“立刻踢人”。
* **Cookie+Refresh 的体系**更常配合：

  * refresh token rotation
  * 数据库存储 refresh 会话（可吊销）
  * tokenVersion / sessionVersion
    从工程实践上更容易做到“真正可控的会话”。

结论：如果你需要**强会话控制（风控/后台踢人/多端管理）**，A 更常见也更自然。

---

## 3) 前端工程体验对比（React 视角）

### A. Cookie + Refresh（推荐“Access 在内存，Refresh 在 HttpOnly Cookie”）

* 优点：

  * 前端不需要持久化任何敏感 token（更安全）。
  * 续期流程可做到对业务透明：401 → 调 refresh → 重放请求。
* 难点：

  * 跨域要处理 `credentials: "include"`、CORS 的 `Access-Control-Allow-Credentials`、以及 cookie 的 `SameSite` 与 `Secure`。
  * 需要 CSRF 设计（若 Access/Refresh 都靠 cookie 自动带）。
  * 并发请求下的 refresh “风暴”需要锁（single-flight）。

### B. Authorization Header

* 优点：

  * 请求携带方式清晰；CORS/跨域相对直观（不需要 credentials cookie 这套）。
  * 通常不需要 CSRF token（因为不会自动带 header）。
* 难点：

  * token 存哪儿是核心：

    * localStorage：易实现但 XSS 风险较高；
    * 内存：安全但刷新页面丢登录态，需要配合 refresh cookie 或重新登录。
  * 同样会遇到并发刷新与重放请求的问题。

---

## 4) 跨域与部署差异（非常影响落地）

### Cookie 方案的“坑点”

* 如果前后端不同域名：

  * 需要设置 cookie 的 `Domain`（同站点/子域策略）、`Path`，以及 `SameSite=None; Secure`（当你确实要跨站点携带 cookie 时）。
  * CORS 必须：

    * `Access-Control-Allow-Credentials: true`
    * `Access-Control-Allow-Origin` **不能是 `*`**，必须是明确 origin
  * 前端 fetch/axios 必须 `credentials: "include"` / `withCredentials: true`

### Header 方案

* 主要是普通 CORS：允许 `Authorization` header：

  * `Access-Control-Allow-Headers: Authorization, Content-Type`
* 不用处理 cookie 的 SameSite/Secure/跨站携带规则。

结论：**跨域复杂度：Cookie 明显更高；同域部署时 Cookie 体验最好。**

---

## 5) 刷新策略与“无感续期”能力

### A. Cookie + Refresh（更主流的无感续期）

典型流程：

1. Access 过期返回 401
2. 前端调用 `/auth/refresh`（带 refresh cookie）
3. 服务端验证 refresh，签新 access（可同时轮换 refresh）
4. 前端重放之前失败的请求

更适合：

* SPA 长时间打开
* 移动端/网页都希望“尽量不断登”
* 需要“长期会话 + 可控吊销”

### B. Header + Refresh（如果 refresh 也落 localStorage）

* 续期也能做，但刷新 token 一旦被 XSS 盗走，风险很大。
* 更安全的做法是：**refresh 放 HttpOnly cookie，access 放内存+header**
  这会变成“混合模型”，工程上很常见，也兼具两边优点（抗 token 窃取 + 抗 CSRF 需要看 refresh endpoint 的策略）。

---

## 6) 适用场景建议（直接给结论）

### 更推荐用 **JWT + HttpOnly Cookie + Refresh**

* 你是典型 Web SPA（React）+ 自有后端（Express）。
* 能做到**同站点/同域**部署（或可接受跨域 cookie 的配置复杂度）。
* 你关心安全边界：**不希望 token 暴露给 JS**。
* 你需要“会话管理”：多设备登录、后台踢下线、风险控制、refresh rotation。

### 更推荐用 **JWT + Authorization Header**

* 你做的是 **纯 API**，多客户端（Web/APP/第三方）统一接入，尤其是非浏览器客户端。
* 你更在意实现简单、跨域少坑，且有能力严格做好 CSP、XSS 防护与 token 安全存储策略（例如只放内存，或用更强隔离的环境）。
* 你的 API 也可能被第三方直接调用（更符合 OAuth2 Bearer 的生态习惯）。

---

## 7) 一句话“选型口诀”

* **浏览器 SPA + 自己的站点**：优先 **HttpOnly Cookie + Refresh**（Access 短、Refresh 轮换、加 CSRF 防护）。
* **开放 API / 多端生态 / 非浏览器**：优先 **Authorization: Bearer**（必要时再引入 refresh，但避免 refresh 落 localStorage）。

---

如果你希望我结合你正在做的“React + Express 的 X 社交平台后端”给出**推荐架构**（同域/跨域、cookie 属性、CORS、CSRF、refresh rotation、401 重试拦截器的实现方式），我可以直接按你当前项目形态给出一套可落地的最佳实践方案。
