这是一个**后端面试 + 实际项目里都会被反复问的问题**。我直接按 **「是什么 → 各自适用场景 → 是否常用 → 如何在 Express 项目中选型」** 给你讲清楚，不绕。

---

## 一、先给结论（你可以先记）

> **JWT 和 Cookie 不是对立关系，而是“可以组合使用”的两种机制**
> 在 Express 项目中：
>
> * **JWT：用于“身份凭证内容”**
> * **Cookie：用于“存储和自动携带凭证”**
>
> 👉 **最常见的生产方案：JWT + HttpOnly Cookie**

---

## 二、JWT 是什么？适合什么场景？

### 1️⃣ JWT 的本质

> **JWT = 无状态的身份凭证**

JWT 本身是一个字符串，里面包含：

* 用户身份信息（userId、role）
* 过期时间
* 签名（防篡改）

```text
header.payload.signature
```

---

### 2️⃣ JWT 的典型使用场景

#### ✅ 适合的场景

| 场景              | 是否适合   |
| --------------- | ------ |
| 前后端分离           | ✅ 非常适合 |
| REST API        | ✅      |
| 多端登录（Web / App） | ✅      |
| 微服务             | ✅      |
| 不想用 Session     | ✅      |

#### ❌ 不适合的场景

* 需要**强制下线用户**
* 需要**随时修改权限**
* Token 非常大、频繁请求

---

### 3️⃣ Express 中 JWT 的典型用法

```js
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { userId: 1 },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);
```

校验：

```js
jwt.verify(token, process.env.JWT_SECRET);
```

---

## 三、Cookie 是什么？适合什么场景？

### 1️⃣ Cookie 的本质

> **Cookie 是浏览器自动管理的一种“客户端存储 + 自动携带机制”**

特点：

* 浏览器自动带上
* 支持 `HttpOnly`
* 支持 `Secure`
* 支持 `SameSite`

---

### 2️⃣ Cookie 的典型使用场景

#### ✅ 非常常见的场景

| 场景         | 是否常用 |
| ---------- | ---- |
| 登录态维持      | ✅    |
| SSR / 普通网站 | ✅    |
| 防 XSS      | ✅    |
| 简化前端逻辑     | ✅    |

#### ❌ 不适合

* 非浏览器客户端（CLI）
* 需要完全手动控制请求头

---

### 3️⃣ Express 中 Cookie 用法

```js
res.cookie('token', jwt, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
});
```

读取：

```js
req.cookies.token;
```

---

## 四、JWT vs Cookie：不是二选一

### 常见误区 ❌

> ❌ JWT 和 Cookie 是对立方案

### 正确理解 ✅

| 角色     | 职责        |
| ------ | --------- |
| JWT    | 身份信息      |
| Cookie | 存储 & 传输方式 |

---

## 五、项目中最常见的 4 种方案（重点）

### 方案 1：JWT 放 localStorage（不推荐）

```text
Authorization: Bearer token
```

❌ 问题：

* 易受 XSS 攻击
* 安全性低

📌 **面试中要明确说：不推荐**

---

### 方案 2：JWT 放 Cookie（强烈推荐）

```text
Cookie: token=jwt
```

✔ 优点：

* HttpOnly 防 XSS
* 浏览器自动携带
* 工程上最稳

✔ **生产环境最常用**

---

### 方案 3：Session + Cookie（传统）

```text
Cookie(sessionId)
```

✔ 简单
❌ 不利于分布式

---

### 方案 4：双 Token（高级）

* Access Token（短期）
* Refresh Token（长期，存 Cookie）

✔ 大厂常用
✔ 安全性高

---

## 六、在 Express 项目中「是否经常用？」

### 简短回答（面试版）

> **是的，非常常用，尤其是 JWT + Cookie 方案**

### 实际项目情况

| 项目类型 | 主流方案                |
| ---- | ------------------- |
| 中小项目 | JWT + Cookie        |
| 企业后台 | JWT + Refresh Token |
| 老项目  | Session             |
| 微服务  | JWT                 |

---

## 七、一个 Express 标准登录流程（真实项目）

```text
1. 用户登录
2. 服务端校验账号密码
3. 生成 JWT
4. JWT 写入 HttpOnly Cookie
5. 后续请求自动携带 Cookie
6. 中间件校验 JWT
```

中间件示例：

```js
function auth(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.sendStatus(401);

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.sendStatus(403);
  }
}
```

---

## 八、面试时的「标准说法」（你可以直接用）

> 在 Express 项目中，JWT 通常用于无状态身份认证，
> Cookie 用于安全地存储和自动携带 Token。
> 实际生产中更推荐 JWT + HttpOnly Cookie，
> 而不是把 JWT 放在 localStorage。

---

## 九、一句话终极总结

> **JWT 决定“你是谁”，
> Cookie 决定“凭证怎么安全地传”；
> 在 Express 项目中，它们不仅常用，而且通常一起用。**

---

如果你愿意，我可以继续帮你：

1. **手写一个完整的 Express JWT 登录模块**
2. **JWT + Refresh Token 的完整实现**
3. **JWT 常见安全坑（面试高频）**
4. **Express 鉴权中间件最佳实践**

你选一个，我直接给你代码级别的。
