下面我给你一份**Express 中 validator（通常指 `express-validator`）的「知识点大全 + 使用大全 + 工程级最佳实践」**。我会直接按**你写真实后端一定会用到的方式**来讲，不绕。

---

## 一、validator 是什么？解决什么问题

在 Express 里，**validator = 参数校验 + 数据清洗**。

更准确地说，你用的是这个库：

```bash
npm install express-validator
```

它解决 4 个核心问题：

1. **防脏数据**（前端不可信）
2. **防类型错误**（字符串 / number / boolean）
3. **防安全风险**（XSS、SQL 注入的第一道防线）
4. **让接口报错统一、可控**

一句话总结：

> 👉 **express-validator 用中间件的方式，在进入业务逻辑前拦住非法请求**

---

## 二、为什么 Express 自己不做校验？

Express 的设计哲学是：

> “我只负责 HTTP，不管业务规则”

所以：

* ❌ Express 不校验参数
* ❌ 不校验类型
* ❌ 不校验必填字段

这就必须靠 **validator 中间件**。

---

## 三、express-validator 的核心设计思想（非常重要）

### 1️⃣ 一切都是「中间件」

```txt
请求 → validator → handler
```

### 2️⃣ 校验规则 = 声明式

```js
body("email").isEmail()
```

不是你自己 `if else`

---

### 3️⃣ 校验和取值是分离的

* **校验阶段**：检查、转换
* **使用阶段**：`req.body`

---

## 四、最基础使用（必会）

### 1️⃣ 引入

```js
import { body, query, param, validationResult } from "express-validator";
```

---

### 2️⃣ 最简单的校验

```js
app.post(
  "/login",
  body("email").isEmail(),
  body("password").isLength({ min: 8 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    res.send("ok");
  }
);
```

---

## 五、validationResult（⚠️ 必须懂）

### 为什么一定要调用它？

因为：

* validator **不会自动返回错误**
* 你必须手动“读取错误”

```js
const errors = validationResult(req);
```

### 常见错误结构

```json
[
  {
    "type": "field",
    "value": "abc",
    "msg": "Invalid value",
    "path": "email",
    "location": "body"
  }
]
```

---

## 六、校验来源大全（非常重要）

| 方法         | 校验位置          |
| ---------- | ------------- |
| `body()`   | `req.body`    |
| `query()`  | `req.query`   |
| `param()`  | `req.params`  |
| `header()` | `req.headers` |
| `cookie()` | `req.cookies` |

### 示例

```js
param("id").isInt()
query("page").optional().isInt({ min: 1 })
```

---

## 七、常用校验方法大全（高频）

### 1️⃣ 必填 & 非空

```js
body("username").notEmpty()
```

---

### 2️⃣ 字符串类

```js
body("email").isEmail()
body("name").isString()
body("password").isLength({ min: 8, max: 20 })
```

---

### 3️⃣ 数字类

```js
body("age").isInt({ min: 0, max: 150 })
body("price").isFloat({ min: 0 })
```

---

### 4️⃣ 布尔 / 枚举

```js
body("isAdmin").isBoolean()
body("role").isIn(["user", "admin"])
```

---

### 5️⃣ 时间 / URL / IP

```js
body("birthday").isISO8601()
body("website").isURL()
body("ip").isIP()
```

---

## 八、optional（非常常用）

```js
body("nickname").optional().isLength({ max: 20 })
```

规则：

* 不传 → 跳过
* 传了 → 必须合法

---

## 九、自定义错误信息（工程必做）

```js
body("email")
  .isEmail()
  .withMessage("邮箱格式不正确");
```

---

## 十、自定义校验（高级必会）

### 1️⃣ 同步自定义校验

```js
body("username").custom(value => {
  if (value.includes("admin")) {
    throw new Error("用户名非法");
  }
  return true;
});
```

---

### 2️⃣ 异步校验（查数据库）

```js
body("email").custom(async email => {
  const exists = await db.user.findByEmail(email);
  if (exists) {
    throw new Error("邮箱已被注册");
  }
});
```

---

## 十一、数据清洗（Sanitization）

validator **不只校验，还能“改数据”**

### 1️⃣ 自动转类型（超级重要）

```js
body("age").toInt()
body("isAdmin").toBoolean()
```

⚠️ 不转的话全是字符串

---

### 2️⃣ 去空格 / 转小写

```js
body("email").trim().normalizeEmail()
body("username").trim().escape()
```

---

## 十二、统一错误处理中间件（工程级写法）

### 1️⃣ 封装 validator middleware

```js
const validate = rules => {
  return async (req, res, next) => {
    await Promise.all(rules.map(rule => rule.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "参数校验失败",
        errors: errors.array(),
      });
    }
    next();
  };
};
```

---

### 2️⃣ 使用方式（推荐）

```js
app.post(
  "/register",
  validate([
    body("email").isEmail(),
    body("password").isLength({ min: 8 }),
    body("age").optional().toInt().isInt({ min: 0 }),
  ]),
  registerController
);
```

✔ 业务逻辑干净
✔ 校验集中
✔ 易维护

---

## 十三、常见坑（非常重要）

### ❌ 忘了 validationResult

→ 校验无效

---

### ❌ 校验顺序错误

```js
isInt().toInt() // ❌
toInt().isInt() // ✅
```

---

### ❌ 认为 validator 会自动挡请求

不会，**你必须手动返回错误**

---

### ❌ GET 用 body 校验

GET → `query` / `param`

---

## 十四、安全角度（面试加分）

validator 能做的：

* 基本防 XSS（`escape`）
* 防明显非法输入
* 参数白名单

validator 不能做的：

* 完整 SQL 注入防御
* 鉴权 / 权限校验

👉 **它是第一道防线，不是唯一防线**

---

## 十五、最佳实践总结（记住这 9 条）

1. 所有外部输入必须校验
2. 校验写在 controller 之前
3. 使用 `optional()` 处理非必填
4. 自定义错误信息
5. 类型一定要转换
6. 校验逻辑与业务逻辑分离
7. 异步校验查重很常见
8. 错误格式统一
9. validator ≠ 安全的全部

---

## 十六、你现在的“正确学习路径”

你已经学过：

* dotenv
* body-parser
* bcrypt
* validator

👉 **下一步就该是：**

1️⃣ **validator + bcrypt + jwt → 登录系统**
2️⃣ **validator + controller + service 分层**
3️⃣ **参数校验 → 统一错误 → 返回规范**

如果你愿意，我可以下一步直接带你**手写一个“企业级 Express 注册 / 登录接口”**，把这几个中间件一次性串起来，你只管敲代码。
