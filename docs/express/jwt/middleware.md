**结论先给：**

> **只要你在 Express 项目里使用 JWT 来“保护接口”，
> 就“必然”要有一个「JWT 校验入口」——
> 不管你叫不叫它“JWT 鉴权中间件”。**

区别只是：

* **你自己写**
* **用 passport-jwt 帮你写**
* **框架帮你写（如 NestJS Guard）**

---

## 一、先把问题说清楚：什么是“必需要”

你现在问的不是：

> “JWT 能不能不用中间件？”

而是：

> **“使用 JWT 的前提下，是否可以不写任何‘校验 token 的逻辑’？”**

答案是：
**❌ 不可以。**

---

## 二、为什么「一定要有」JWT 校验逻辑

### JWT 的本质不是“登录态”，而是“自证凭证”

```txt
客户端：我是谁
↓（JWT）
服务端：我验证你说的是不是真的
```

👉 **如果你不校验 JWT，它就没有任何意义。**

---

### 那校验逻辑放哪？

无非三种地方：

| 放哪                     | 本质      |
| ---------------------- | ------- |
| 每个路由里                  | ❌ 最差做法  |
| 一个公共函数                 | ⚠️ 不够标准 |
| **Express middleware** | ✅ 正确    |

所以工程上自然演化出：

> **JWT 鉴权中间件**

---

## 三、不同使用方式下，“是不是必须写中间件”

### 情况 1：JWT + Authorization Header（最常见）

```http
GET /api/me
Authorization: Bearer eyJhbGciOi...
```

你**必须**做：

```js
jwt.verify(token)
```

否则：

* 谁都能访问 `/api/me`
* JWT 就是摆设

👉 **必须有鉴权逻辑 ⇒ 必须有中间件（形式上）**

---

### 情况 2：JWT + HttpOnly Cookie

```http
Cookie: access_token=eyJhbGciOi...
```

即使 token 在 cookie：

* 浏览器自动带
* 服务端 **仍然要 verify**

你依然需要：

```js
const token = req.cookies.access_token;
jwt.verify(token);
```

👉 **只是“取 token 的方式不同”，中间件依然存在**

---

### 情况 3：只有登录 / 注册接口

如果你的项目 **只有**：

* `/login`
* `/register`

**没有任何需要登录才能访问的接口**

✅ 那你可以暂时不写 JWT 鉴权中间件
❌ 但这几乎不算“使用 JWT 做项目”

---

## 四、那 passport-jwt 算不算“你写了中间件”？

算，而且**本质一模一样**。

```js
passport.authenticate("jwt", { session: false })
```

内部做的事情仍然是：

1. 取 token
2. verify
3. 挂 `req.user`
4. 决定是否放行

👉 只是你把“怎么写”交给了库。

---

## 五、什么时候你“感觉自己没写中间件”

### 常见误解 1：我只在一个地方校验了 JWT

```js
app.use((req, res, next) => {
  jwt.verify(...)
});
```

这 **依然是中间件**。

---

### 常见误解 2：我用 NextAuth / Clerk

* 是的，你没写
* 但**它们替你写了**

👉 **鉴权逻辑不会消失，只会被封装**

---

## 六、工程上推荐的“最小正确姿势”

你不一定要写得复杂，但至少要有这个结构：

```js
export function auth(req, res, next) {
  // 1. 拿 token
  // 2. verify
  // 3. req.user
  // 4. next()
}
```

然后在需要保护的地方用：

```js
router.get("/me", auth, controller);
```

---

## 七、总结一句话（非常重要）

> **使用 JWT ≠ 自动安全
> JWT 只有在“每次请求都被校验”时才有意义**

所以：

* **是的，逻辑上“必须有” JWT 校验**
* **不一定你亲手写，但一定“存在”**
* **Express 里最自然的载体就是中间件**

---

## 八、结合你当前学习阶段的建议

以你现在在学：

* Express
* JWT
* Cookie / Header

### 最优路线是：

1️⃣ **先手写一个最简单的 JWT 鉴权中间件**
2️⃣ 再理解 passport-jwt
3️⃣ 再理解更高级的 auth 框架

---

如果你愿意，下一步我可以直接：

* 给你一个 **“最小但生产可用”的 JWT 鉴权中间件（支持 Header + Cookie）**
* 或帮你判断 **你当前项目是否真的需要 passport-jwt**
* 或把你现在的 JWT 使用方式**帮你“工程化整理”一遍**

你直接选一个就行。


下面我**从工程角度、不是从“教程角度”**，把你问的这四个问题一次讲清楚：

> **什么叫「先会手写 JWT 鉴权中间件」？
> 它的作用是什么？
> 在项目中到底有什么用？
> 难不难学？值不值得先学？**

---

# 一、什么是「手写 JWT 鉴权中间件」

一句话定义：

> **手写 JWT 鉴权中间件 = 你不用 passport-jwt，自己写一个 Express middleware，完成「校验 token → 解析用户 → 挂到 req」这件事。**

### Express 中间件的本质

```txt
请求进来
→ 中间件
→ 决定：放行 / 拒绝 / 挂数据
→ 路由处理
```

### JWT 鉴权中间件要做的事只有 4 步

1. **从请求中拿 token**
2. **验证 token 是否合法 / 是否过期**
3. **解析用户信息**
4. **决定是否放行，并把用户挂到 `req.user`**

---

# 二、最小可用版：手写 JWT 鉴权中间件

这是一个**真实项目级、但足够简单**的版本。

```js
// middlewares/auth.js
import jwt from "jsonwebtoken";

export function auth(req, res, next) {
  try {
    // 1️⃣ 从 Authorization Header 取 token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const token = authHeader.split(" ")[1];

    // 2️⃣ 校验 token
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // 3️⃣ 挂载用户信息
    // payload 通常是 { sub: userId, iat, exp }
    req.user = {
      id: payload.sub,
    };

    // 4️⃣ 放行
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
```

### 路由中使用

```js
app.get("/api/me", auth, (req, res) => {
  res.json({ userId: req.user.id });
});
```

👉 这就是「手写 JWT 鉴权中间件」。

---

# 三、它的作用是什么（工程意义）

## 1️⃣ 把“鉴权逻辑”从业务代码中抽离

❌ 错误示例（不抽离）：

```js
app.get("/me", (req, res) => {
  // 每个路由都写 token 校验
});
```

✅ 正确做法：

```js
app.get("/me", auth, controller);
```

👉 **关注点分离**（Separation of Concerns）

---

## 2️⃣ 所有受保护路由，统一安全边界

```txt
auth middleware = 安全门禁
```

* 不通过 → 请求进不来
* 通过 → 保证 `req.user` 一定存在

业务代码可以**假设用户已登录**。

---

## 3️⃣ 是 passport-jwt 的“底层原理”

passport-jwt 内部做的事情，**和你这个中间件本质一模一样**：

* Extract token
* Verify token
* Attach user

👉 会手写 ≈ 懂 passport-jwt 在干什么
👉 不会手写 ≈ 把 passport 当黑盒

---

## 4️⃣ 为后续高级能力打基础

一旦你会手写，就可以自然演进到：

* JWT + Cookie
* Refresh Token
* Token 版本号（踢下线）
* RBAC 权限控制
* optionalAuth（登录可选）

---

# 四、它在项目中有什么用（真实场景）

### 场景 1：API 鉴权（最常见）

```js
GET /api/posts
→ auth
→ 返回用户可见内容
```

---

### 场景 2：角色 / 权限判断

```js
export function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}
```

---

### 场景 3：可选登录（游客 / 登录用户）

```js
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next();

  try {
    const token = authHeader.split(" ")[1];
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {}

  next();
}
```

---

### 场景 4：和 Refresh Token 体系配合

* auth middleware 只校验 **access token**
* refresh route 专门负责续期
* 职责清晰

---

# 五、难不难学？

### 真实评价（非常重要）

> **不难，且是后端必会基础。**

### 为什么不难？

* 核心 API 只有一个：`jwt.verify`
* Express middleware 你已经在用
* 逻辑是线性的，没有复杂抽象

### 学习成本

| 项目                 | 时间    |
| ------------------ | ----- |
| 看懂 JWT 结构          | 30 分钟 |
| 写出 auth middleware | 30 分钟 |
| 在项目中跑通             | 30 分钟 |

👉 **1～2 小时即可掌握**

---

# 六、那为什么还要 passport-jwt？

一句话总结：

> **手写是“原理”，passport-jwt 是“工程化封装”。**

当你遇到：

* 多种登录方式（JWT / Google / GitHub）
* 团队多人协作
* 统一鉴权规范

passport 的策略模式会更优雅。

---

# 七、面试官最爱听的回答（直接背）

> “我一般会先手写 JWT 鉴权中间件，确保自己完全理解 token 的校验流程；
> 在中大型项目中，我会用 passport-jwt 来统一鉴权策略，小项目则直接用自定义中间件，减少复杂度。”

---

# 八、最终结论

* **是什么**：一个你自己写的 JWT 校验中间件
* **作用**：统一安全入口，解耦业务逻辑
* **有什么用**：几乎所有 API 项目都离不开
* **难不难**：不难，是后端基础能力

---

如果你愿意，下一步我可以：

* 帮你把这个中间件 **升级成支持 Cookie + Header 双模式**
* 或直接 **加上 refresh token + 自动续期**
* 或写一个 **对标 passport-jwt 的完整自定义实现**

你可以直接说你想往哪一步走。
