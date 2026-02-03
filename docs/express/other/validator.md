下面给你一份「**Express 项目中 express-validator 配置大全**」，按真实项目落地方式组织：安装与目录结构、全局中间件、常用校验/消毒 API、可复用的验证器（register/login/分页/对象ID）、统一错误格式、与 TypeScript 配合、常见坑与最佳实践。你可以直接复制到项目里用。

---

## 1) 安装与基础配置

```bash
npm i express-validator
```

在 Express 中需要先启用解析器：

```js
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
```

---

## 2) 推荐的工程化结构（强烈建议）

```
src/
  routes/
  controllers/
  validators/
    auth.validator.js
    common.validator.js
  middlewares/
    validate.js
  utils/
    apiError.js
```

核心思想：

* `validators/*` 只负责“规则”
* `middlewares/validate.js` 只负责“收集并返回错误”
* controller 中只处理业务，不写校验逻辑

---

## 3) 统一校验中间件：validate（配置大全核心）

### 3.1 基础版：返回 422 + 统一结构

`src/middlewares/validate.js`

```js
import { validationResult } from "express-validator";

export function validate(req, res, next) {
  const result = validationResult(req);

  if (result.isEmpty()) return next();

  // 统一错误格式
  const errors = result.array({ onlyFirstError: true }).map((e) => ({
    field: e.path,          // 字段名
    location: e.location,   // body/query/params/headers/cookies
    message: e.msg,         // 错误信息
    value: e.value,         // 原值（可按需去掉）
  }));

  return res.status(422).json({
    message: "Validation failed",
    errors,
  });
}
```

> `onlyFirstError: true` 可以减少噪声；你也可以关掉返回全部错误。

---

## 4) express-validator 常用入口（你会高频用到）

### 4.1 校验来源

* `body("field")`：请求体 JSON / form
* `query("field")`：查询参数
* `param("field")`：路由参数
* `header("field")`：请求头
* `cookie("field")`：cookie（需要 cookie-parser 才能读 cookie）

```js
import { body, query, param, header } from "express-validator";
```

### 4.2 链式校验常用方法（配置清单）

**存在性与空值**

* `.exists()`：字段必须存在（注意与空字符串区别）
* `.notEmpty()`：非空（不允许 `""`）
* `.optional()`：可选字段（不传则跳过后续校验）

**类型与格式**

* `.isEmail()`
* `.isLength({ min, max })`
* `.isInt({ min, max })`
* `.isFloat({ min, max })`
* `.isBoolean()`
* `.isIn([...])`
* `.isUUID()`
* `.isMongoId()`（MongoDB 常用）
* `.isISO8601()`（日期）

**字符串与包含**

* `.contains("x")`
* `.matches(/regex/)`
* `.isStrongPassword({ ... })`（强密码）

**自定义**

* `.custom((value, { req }) => { ... })`
* `.customSanitizer((value, { req }) => { ... })`

**消毒（sanitize）**

* `.trim()`
* `.escape()`（转义 HTML，谨慎：不适合所有场景）
* `.toInt() / .toFloat() / .toBoolean()`
* `.normalizeEmail()`
* `.toLowerCase() / .toUpperCase()`

**错误信息**

* `.withMessage("...")`
* `.bail()`：一旦失败就停止后续链（减少重复错误）

---

## 5) 规则写法大全：推荐用数组导出

### 5.1 Auth：注册 / 登录验证器（经典）

`src/validators/auth.validator.js`

```js
import { body } from "express-validator";

export const registerValidator = [
  body("email")
    .exists().withMessage("email is required")
    .bail()
    .isEmail().withMessage("email is invalid")
    .normalizeEmail(),

  body("password")
    .exists().withMessage("password is required")
    .bail()
    .isLength({ min: 8, max: 64 }).withMessage("password length must be 8-64")
    .bail()
    .isStrongPassword({
      minLength: 8,
      minLowercase: 1,
      minUppercase: 0,
      minNumbers: 1,
      minSymbols: 0,
    }).withMessage("password is too weak"),

  body("username")
    .optional()
    .trim()
    .isLength({ min: 2, max: 20 }).withMessage("username length must be 2-20"),
];

export const loginValidator = [
  body("email")
    .exists().withMessage("email is required")
    .bail()
    .isEmail().withMessage("email is invalid")
    .normalizeEmail(),

  body("password")
    .exists().withMessage("password is required")
    .bail()
    .isLength({ min: 1 }).withMessage("password is required"),
];
```

### 5.2 路由参数：id 校验（Mongo 场景）

`src/validators/common.validator.js`

```js
import { param, query } from "express-validator";

export const mongoIdParam = (name = "id") => [
  param(name)
    .exists().withMessage(`${name} is required`)
    .bail()
    .isMongoId().withMessage(`${name} must be a valid MongoId`),
];
```

### 5.3 分页查询参数：page/limit/sort

```js
export const pagingQueryValidator = [
  query("page")
    .optional()
    .toInt()
    .isInt({ min: 1, max: 100000 }).withMessage("page must be int >= 1"),

  query("limit")
    .optional()
    .toInt()
    .isInt({ min: 1, max: 100 }).withMessage("limit must be 1-100"),

  query("sort")
    .optional()
    .trim()
    .isIn(["createdAt", "updatedAt", "name"]).withMessage("sort is invalid"),

  query("order")
    .optional()
    .trim()
    .toLowerCase()
    .isIn(["asc", "desc"]).withMessage("order must be asc|desc"),
];
```

---

## 6) 在 routes 中组合使用（最佳实践）

`src/routes/auth.route.js`

```js
import { Router } from "express";
import { registerValidator, loginValidator } from "../validators/auth.validator.js";
import { validate } from "../middlewares/validate.js";
import { register, login } from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", registerValidator, validate, register);
router.post("/login", loginValidator, validate, login);

export default router;
```

> 顺序很关键：**规则数组** → **validate 中间件** → controller。

---

## 7) 高级配置：checkSchema（更“配置化”的写法）

当字段很多、规则想写成对象时，用 `checkSchema` 更好维护。

```js
import { checkSchema } from "express-validator";

export const createPostSchema = checkSchema({
  title: {
    in: ["body"],
    exists: { errorMessage: "title is required" },
    isLength: { options: { min: 2, max: 100 }, errorMessage: "title length 2-100" },
    trim: true,
  },
  content: {
    in: ["body"],
    exists: { errorMessage: "content is required" },
    isLength: { options: { min: 1, max: 5000 }, errorMessage: "content length 1-5000" },
  },
  tags: {
    in: ["body"],
    optional: true,
    isArray: { errorMessage: "tags must be an array" },
  },
});
```

routes：

```js
router.post("/posts", createPostSchema, validate, createPost);
```

---

## 8) 自定义校验：查数据库唯一性（非常常用）

例如注册时 email 必须唯一：

```js
import { body } from "express-validator";
import User from "../models/User.js";

export const registerValidator = [
  body("email")
    .isEmail().withMessage("email is invalid")
    .bail()
    .custom(async (email) => {
      const exists = await User.findOne({ email });
      if (exists) throw new Error("email already exists");
      return true;
    }),
  // ...
];
```

---

## 9) 验证后“取干净数据”的做法（避免脏字段）

`matchedData` 用于只拿通过校验的数据，避免用户塞进额外字段（例如 `role=admin`）。

```js
import { matchedData } from "express-validator";

app.post("/register", registerValidator, validate, (req, res) => {
  const data = matchedData(req, { locations: ["body"] });
  // data 只包含校验通过的字段
});
```

---

## 10) 常见坑（一定要避开）

1. **忘记加 validate 中间件**：写了规则但不返回错误，controller 仍会执行
2. `.optional()` 默认只在字段不存在时跳过；如果你想允许 `""` 也跳过，要用：

   * `.optional({ checkFalsy: true })`（会把 `""/0/false` 当作缺失）
3. 使用 `.toInt()` 要注意：如果传 `"abc"` 会变成 `NaN`，后续应 `isInt()` 接住
4. `escape()` 会改变数据（转义 HTML），不要对所有字段无脑使用
5. 错误信息别泄露敏感细节（例如“该邮箱已注册”是否提示取决于产品策略）

---

## 11) TypeScript 项目注意点（简要）

* express-validator 会把 sanitize 后的数据写回 `req.body/query/params`
* 配合 `matchedData` + DTO 类型更稳
* 业务层用 `const data = matchedData(req) as RegisterDTO`（或用 zod 再做类型保护）

---

## 12) 一套可复用“模板”（你可以直接复制）

* `validators/*.js`：只放规则数组或 schema
* `middlewares/validate.js`：统一返回 422
* `controllers/*`：只写业务
* 需要“只取干净字段”就用 `matchedData`

---

如果你告诉我你项目现在是：

* 用 **MongoDB/Mongoose** 还是 **Prisma/MySQL(PostgreSQL)**
* 路由风格是 **REST** 还是更像你说的 “X 社交平台” 的模块化
  我可以把上面这套配置扩展成你项目的完整落地版本：`auth/users/posts` 三大模块的 validator（含分页、上传、对象ID、权限校验），并给你可直接运行的目录结构与示例路由。
