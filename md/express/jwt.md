下面给你一份**Express 中 JWT 的「知识点大全 + 数据传递全流程详解」**。
我会按 **概念 → 结构 → 生成 → 传递 → 校验 → 常见坑 → 最佳实践** 的顺序来讲，这是你真正写**登录 / 鉴权 / 权限系统**时需要的完整认知。

---

## 一、JWT 是什么？（一句话讲清）

> **JWT（JSON Web Token）是一种“无状态”的身份凭证，用来证明：你是谁、你是否已登录。**

核心目标：

* 服务端 **不保存登录状态**
* 客户端 **每次请求都带 token**
* 服务端 **只负责验证 token 是否可信**

📌 JWT ≠ 加密
👉 JWT 是 **签名（防篡改）**，不是加密（内容可读）

---

## 二、JWT 的典型使用场景

* 登录 / 注册
* 接口鉴权（是否登录）
* 权限控制（role / scope）
* 前后端分离项目（Web / App）

不适合：

* 超高安全（银行核心系统）
* 需要频繁“踢人下线”的场景（JWT 无状态）

---

## 三、JWT 的数据结构（非常重要）

JWT 长这样：

```
xxxxx.yyyyy.zzzzz
```

分三段，用 `.` 分隔：

```
Header.Payload.Signature
```

### 1️⃣ Header（头部）

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

* alg：签名算法
* typ：类型

---

### 2️⃣ Payload（载荷，核心数据）

```json
{
  "userId": 1,
  "username": "tom",
  "role": "admin",
  "iat": 1710000000,
  "exp": 1710003600
}
```

📌 **payload 是明文的（base64）**

* 不要放密码
* 不要放敏感隐私

---

### 3️⃣ Signature（签名）

```
HMACSHA256(
  base64(header) + "." + base64(payload),
  secret
)
```

作用：

* 防篡改
* 验证 token 是否服务端签发

---

## 四、JWT 在 Express 中的完整流程（重点）

![Image](https://media2.dev.to/dynamic/image/width%3D1600%2Cheight%3D900%2Cfit%3Dcover%2Cgravity%3Dauto%2Cformat%3Dauto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2F8wiw2dbjerzq6br66qv8.png)

![Image](https://www.researchgate.net/publication/380295281/figure/fig5/AS%3A11431281240309448%401714714007925/Sequence-Diagram-for-JWT-Authorization.jpg)

![Image](https://bezkoder.com/wp-content/uploads/2020/01/node-js-jwt-authentication-mysql-architecture.png)

### 全流程一句话版：

```
登录成功 → 生成 JWT → 返回给客户端
客户端存 JWT → 请求时携带 JWT
服务端校验 JWT → 放行 or 拦截
```

---

## 五、在 Express 中生成 JWT（登录阶段）

### 1️⃣ 安装依赖

```bash
npm i jsonwebtoken
```

---

### 2️⃣ 登录成功后生成 token

```js
import jwt from 'jsonwebtoken';

const SECRET = 'my_secret_key';

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // 1. 校验用户（略）
  const user = { id: 1, username, role: 'user' };

  // 2. 生成 token
  const token = jwt.sign(
    {
      userId: user.id,
      role: user.role
    },
    SECRET,
    {
      expiresIn: '2h' // 过期时间
    }
  );

  // 3. 返回 token
  res.json({
    token
  });
});
```

📌 **payload 放什么？**

* userId（必放）
* role / scope（权限）
* 不放密码、不放敏感信息

---

## 六、JWT 的数据“怎么传”？（详细讲解）

### ✅ 方式一（最推荐）：Authorization Header

```
Authorization: Bearer <token>
```

前端请求示例：

```js
fetch('/api/user', {
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

Express 中读取：

```js
const auth = req.get('Authorization');
```

---

### ⚠️ 方式二：Cookie（次优）

```js
res.cookie('token', token, {
  httpOnly: true
});
```

问题：

* CSRF 风险
* 跨域复杂

---

### ❌ 方式三：query 参数（不推荐）

```
GET /api/user?token=xxx
```

风险：

* URL 泄露
* 日志泄露

---

## 七、JWT 校验（鉴权中间件，核心）

### 1️⃣ 写一个 JWT 中间件（必会）

```js
function authMiddleware(req, res, next) {
  const auth = req.get('Authorization');

  if (!auth) {
    return res.status(401).json({ message: 'No token' });
  }

  const token = auth.split(' ')[1];

  try {
    const payload = jwt.verify(token, SECRET);

    // 把用户信息挂到 req 上
    req.user = payload;

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}
```

---

### 2️⃣ 使用中间件保护接口

```js
app.get('/api/profile', authMiddleware, (req, res) => {
  res.json({
    userId: req.user.userId,
    role: req.user.role
  });
});
```

📌 核心思想：

> **JWT 校验通过 → 把 payload 注入 req → 后面随便用**

---

## 八、JWT 中的时间字段（面试必问）

| 字段  | 含义   |
| --- | ---- |
| iat | 签发时间 |
| exp | 过期时间 |
| nbf | 生效时间 |

```js
jwt.sign(payload, secret, {
  expiresIn: '1h'
});
```

---

## 九、常见错误 & 坑（重点）

### ❌ 1. JWT 当加密用

```js
payload: { password: '123456' } // ❌
```

JWT **任何人都能解码 payload**

---

### ❌ 2. secret 写死在代码里

```js
const SECRET = '123'; // ❌
```

✅ 正确：

```js
process.env.JWT_SECRET
```

---

### ❌ 3. token 过期后不处理

```js
jwt.verify(token); // 直接崩
```

一定要 try/catch。

---

### ❌ 4. 每个接口都自己写校验

👉 **一定用中间件**

---

## 十、JWT + 权限控制（进阶）

```js
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
}

app.delete('/api/user/:id',
  authMiddleware,
  requireAdmin,
  controller
);
```

---

## 十一、JWT vs Session（你该怎么选）

| 对比   | JWT | Session |
| ---- | --- | ------- |
| 状态   | 无状态 | 有状态     |
| 分布式  | 友好  | 需要共享    |
| 踢人下线 | 困难  | 简单      |
| 安全控制 | 中   | 高       |

📌 前后端分离 → **JWT**
📌 传统后台 → **Session**

---

## 十二、你现在的最佳实践模板（总结）

**推荐方案：**

```
登录成功 → JWT（2h）
Authorization: Bearer
中间件统一校验
payload 只放 userId / role
```

---

如果你愿意，下一步我可以直接带你做更真实的东西，比如：

* ✅ **JWT + Refresh Token 双 token 方案**
* ✅ **JWT 黑名单 / 踢人下线实现**
* ✅ **Express 完整登录鉴权模板**
* ✅ **JWT vs OAuth2 实战对比**

你选一个，我直接继续往实战带你 🔥
