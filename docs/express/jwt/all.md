下面给你一份面向 **Express 项目落地**的 `jsonwebtoken`（JWT）“属性与方法的配置和使用大全”。我按你最需要的方式组织：**方法清单 → 核心配置项（属性）→ 常见用法与坑 → 直接可抄的代码片段**。

> 说明：你在 Express 里通常用的 JWT 库是 `jsonwebtoken`（npm 包名：`jsonwebtoken`）。

---

## 1) `jsonwebtoken` 的核心方法（你会频繁用的）

### 1.1 `jwt.sign(payload, secretOrPrivateKey, [options])`

**作用**：签发 token（登录/刷新 token 时用）

* `payload`：要写入 token 的数据（不加密，明文可解码）
* `secretOrPrivateKey`：对称密钥（HS*）或私钥（RS*/ES*）
* `options`：签名配置（过期时间、issuer、audience 等）

返回：JWT 字符串。

---

### 1.2 `jwt.verify(token, secretOrPublicKey, [options])`

**作用**：验证 token 是否有效 + 解码 payload（鉴权中间件最核心）

* 验证签名、过期、issuer、audience、算法是否匹配
* 成功返回 decoded（payload + 标准字段）
* 失败抛异常（你要 try/catch）

---

### 1.3 `jwt.decode(token, [options])`

**作用**：仅解码，不验证（调试/读取 header/payload）

* ⚠️不校验签名、不校验过期、不安全
* 常用场景：读取 header 的 `kid`（密钥轮换）、或快速查看 payload

---

### 1.4 异步回调形式

`sign` / `verify` 都支持 callback 形式，适用于你想用异步风格：

```js
jwt.verify(token, secret, (err, decoded) => {
  if (err) return ...
  // decoded
});
```

---

## 2) JWT “属性/配置项（options）大全”——签发与验证最重要

下面这些就是你问的“属性与配置”的核心。

---

## 2.1 `sign` 的 options（签发配置）

### `expiresIn`

**过期时间**（强烈建议必须配置）

* 类型：数字秒数 或 字符串（如 `"15m"`, `"2h"`, `"7d"`）
* 示例：`expiresIn: "2h"`

### `notBefore`（nbf）

**多久之后才生效**

* 类型：数字秒数 或 字符串
* 示例：`notBefore: "10s"`

### `issuer`（iss）

**签发者**

* 用于多服务/多环境区分
* 示例：`issuer: "my-api"`

### `audience`（aud）

**受众**

* 用于限定 token 给谁用（Web、Mobile 等）
* 示例：`audience: "my-frontend"`

### `subject`（sub）

**主体（通常是 userId）**

* 示例：`subject: user.id`

### `jwtid`（jti）

**JWT 唯一 ID**

* 方便做“黑名单/撤销 token”
* 示例：`jwtid: crypto.randomUUID()`

### `algorithm`

**签名算法**

* HS256（对称密钥）最常见
* 示例：`algorithm: "HS256"`
* ⚠️实际项目里建议**显式指定**，避免算法被误用

### `keyid`（kid）

**密钥 ID（轮换密钥时用）**

* 配合 header 的 `kid`
* 示例：`keyid: "key-2026-01"`

### `header`

**自定义 JWT header**

* 示例：`header: { typ: "JWT" }`

### `mutatePayload`

**是否允许库修改 payload**

* 一般不需要，默认即可

---

## 2.2 `verify` 的 options（验证配置）

### `algorithms`

**允许的算法白名单（非常重要）**

* 示例：`algorithms: ["HS256"]`
* 强烈建议配置，防止算法混淆类问题

### `ignoreExpiration`

**忽略过期**

* 默认 false
* 只建议用于特殊迁移/调试
* 示例：`ignoreExpiration: false`

### `clockTolerance`

**时间容忍（秒）**

* 解决服务器时间轻微偏差
* 示例：`clockTolerance: 5`

### `clockTimestamp`

**自定义当前时间戳**

* 测试用，生产基本不用

### `issuer` / `audience` / `subject` / `jwtid`

**约束校验**

* 示例：

  * `issuer: "my-api"`
  * `audience: "my-frontend"`

### `maxAge`

**最大允许 token 年龄**

* 即使 exp 没到，也限制 iat 到现在的时间
* 示例：`maxAge: "2h"`

### `complete`

**返回完整对象（header + payload + signature）**

* `complete: true` → 返回 `{ header, payload, signature }`

---

## 3) JWT 标准字段（你会在 payload 里看到的“属性”）

这些不是 jsonwebtoken 的 options，而是 JWT 标准 claim：

* `iat`：Issued At（签发时间）
* `exp`：Expiration Time（过期时间）
* `nbf`：Not Before（生效时间）
* `iss`：Issuer（签发者）
* `aud`：Audience（受众）
* `sub`：Subject（主体）
* `jti`：JWT ID（唯一标识）

你可以把业务字段放在 payload，比如：

* `userId`
* `role`
* `scope`

⚠️注意：payload **明文可读**，不要放敏感信息（密码、手机号全量等）。

---

## 4) Express 项目中的“最推荐配置模板”（可直接用）

### 4.1 `utils/jwt.js`（签发 + 验证工具）

```js
// utils/jwt.js
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const JWT_ISSUER = process.env.JWT_ISSUER || "my-api";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "my-client";

function signAccessToken({ userId, role }) {
  return jwt.sign(
    { userId, role }, // payload（业务字段）
    JWT_SECRET,
    {
      algorithm: "HS256",
      expiresIn: "15m",
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      subject: String(userId),
    }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET, {
    algorithms: ["HS256"],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    // clockTolerance: 5, // 可选：时间偏差容忍
  });
}

function decodeToken(token) {
  // 不验证，仅解码（调试用）
  return jwt.decode(token, { complete: true });
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  decodeToken,
};
```

---

### 4.2 `middleware/auth.js`（鉴权中间件）

```js
// middleware/auth.js
const { verifyAccessToken } = require("../utils/jwt");

function auth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [type, token] = authHeader.split(" ");

  if (type !== "Bearer" || !token) {
    return res.status(401).json({ message: "Missing or invalid Authorization header" });
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded; // { userId, role, iat, exp, iss, aud, sub ... }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = auth;
```

---

## 5) 常见“配置组合”场景与用法

### 场景 A：Access Token + Refresh Token（经典）

* Access：短（15m）
* Refresh：长（7d/30d）
* Refresh 通常要“可撤销”（存数据库/Redis 或 rotate）

`sign` 时分别配置 `expiresIn`，并把 `type` 写入 payload：

```js
jwt.sign({ userId, type: "access" }, secret, { expiresIn: "15m" })
jwt.sign({ userId, type: "refresh" }, secret, { expiresIn: "7d" })
```

验证时检查 `type`：

```js
if (decoded.type !== "access") throw new Error("wrong token type");
```

---

### 场景 B：限制 token 只能给某个客户端使用（audience）

* Web / Mobile 用不同 `aud`
* verify 强制校验 `audience`

---

### 场景 C：密钥轮换（kid）

* sign：`keyid`
* verify：读取 header.kid → 选择对应密钥验证
  （这块比较进阶，你要的话我可以给一套可用的 key store 示例）

---

## 6) 你必须掌握的安全要点（避免踩坑）

1. **verify 时一定要限制 algorithms**
   `algorithms: ["HS256"]`
2. **payload 不要放敏感信息**（JWT 可被解码）
3. **expiresIn 必须设置**（短 token 更安全）
4. **不要用 decode 当鉴权**
   decode 不验证签名，任何人都能伪造
5. **Cookie 模式要考虑 CSRF**（如果你用 HttpOnly Cookie 存 token）
6. **想“退出登录/撤销 token”**：需要 jti + 黑名单/刷新 token 轮换策略（JWT 本身无状态，不能天然撤销）

---

## 7) 速查表（你要记住的最常用项）

* 方法：

  * `sign`：签发
  * `verify`：验证并解码
  * `decode`：只解码（不安全）
* sign 常用 options：

  * `expiresIn`, `issuer`, `audience`, `subject`, `algorithm`
* verify 常用 options：

  * `algorithms`, `issuer`, `audience`, `clockTolerance`

---

如果你告诉我你目前用的是：

1. **Authorization Header** 还是 **HttpOnly Cookie**
2. 你要做 **单端** 还是 **多端（Web + RN/Flutter）**
   我可以把这套“配置大全”进一步落到你项目的**最终代码结构**（Access/Refresh、刷新接口、撤销策略、以及和你现有的 Express 路由组织方式一致）。
