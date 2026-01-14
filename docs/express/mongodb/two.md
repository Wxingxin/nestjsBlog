下面把 **`mongoose.Schema`** 和 **`mongoose.model`** 讲清楚：它们各自做什么、为什么要分成两层、以及在真实项目里怎么配置与组织。

---

## 1) `mongoose.Schema` 是什么

### 它做什么

`Schema` 是 **“集合中文档的结构/规则（约束）说明书”**。你可以把它理解为：

* 定义字段有哪些、每个字段的类型是什么
* 校验规则（required、min/max、enum、match 等）
* 默认值（default）
* 字段的行为（trim、lowercase、select、immutable 等）
* 索引（index / unique）
* 虚拟字段（virtual）
* 中间件（middleware：pre/post hooks）
* 实例方法 / 静态方法（methods/statics）
* 配置项（timestamps、collection、toJSON 等）

**注意：Schema 本身不会去操作数据库。它只是规则。**

---

## 2) `mongoose.model` 是什么

### 它做什么

`model` 是由 Schema “编译”出来的 **可操作数据库的类（构造函数）**。

你拿到一个 `User` model 后，就能：

* `User.create()` 新增
* `User.find()` 查询
* `User.findByIdAndUpdate()` 更新
* `User.deleteOne()` 删除
* `new User()` 创建实例再 `save()`

**一句话：Schema 定义规则，Model 提供 CRUD 能力。**

---

## 3) 典型写法（最常见）

```js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    age: { type: Number, min: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
```

---

## 4) `new mongoose.Schema(definition, options)` 详解

### 4.1 definition（字段定义对象）怎么配

#### (1) 最简写法：类型快捷写法

```js
const schema = new mongoose.Schema({
  name: String,
  age: Number,
  isActive: Boolean,
  tags: [String],
});
```

这适合 demo，但真实项目不推荐，因为你少了校验、默认值等重要约束。

#### (2) 标准写法：对象形式（推荐）

```js
name: {
  type: String,
  required: true,
  trim: true,
  minlength: 2,
  maxlength: 30
}
```

### 4.2 常用字段配置项（非常实用）

#### required

```js
email: { type: String, required: true }
```

#### default

```js
isActive: { type: Boolean, default: true }
```

#### unique（本质是索引约束）

```js
email: { type: String, unique: true }
```

注意：`unique` 是创建索引，不是“验证器”。也就是说重复 email 最终会抛 MongoDB 的重复键错误。

#### select（控制默认返回）

```js
password: { type: String, select: false }
```

默认查询不会带 `password`，需要时手动：

```js
User.findOne({ email }).select("+password");
```

#### trim / lowercase / uppercase

```js
username: { type: String, trim: true }
email: { type: String, lowercase: true }
```

#### enum（枚举）

```js
role: { type: String, enum: ["user", "admin"], default: "user" }
```

#### match（正则校验）

```js
email: { type: String, match: /.+@.+\..+/ }
```

#### min / max（数字范围）

```js
age: { type: Number, min: 0, max: 120 }
```

---

## 5) Schema options（第二个参数 options）常用配置

### timestamps（最常用）

```js
{ timestamps: true }
```

自动生成：

* `createdAt`
* `updatedAt`

### collection（指定集合名）

默认集合名规则：`model('User')` → `users`
你也可以强制指定：

```js
{ collection: "user_collection" }
```

### versionKey（关闭 __v）

```js
{ versionKey: false }
```

### toJSON / toObject（序列化控制）

你经常会想在返回 JSON 时隐藏字段、开启 virtual：

```js
{
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
}
```

---

## 6) `mongoose.model(name, schema)` 详解

### name 有什么影响？

`mongoose.model("User", userSchema)`：

* Model 名字是 `User`
* MongoDB 集合默认会变成 `users`（复数、lowercase）
* 你用 `User` 来做 CRUD

### model 的返回值是什么？

返回一个**类**（构造函数），可 new：

```js
const user = new User({ username: "wjx", email: "a@b.com", password: "123" });
await user.save();
```

也可以直接静态方法：

```js
await User.create({ username: "wjx", email: "a@b.com", password: "123" });
```

---

## 7) Schema 上的 methods / statics（项目里很常用）

### 7.1 实例方法 methods

适用于“单条文档对象的行为”：

```js
userSchema.methods.checkPassword = function (plain) {
  // this 指向当前 user 文档
  return plain === this.password; // 实战会用 bcrypt 比对
};
```

调用：

```js
const user = await User.findById(id).select("+password");
user.checkPassword("123");
```

### 7.2 静态方法 statics

适用于“整个模型的行为”：

```js
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email });
};
```

调用：

```js
const user = await User.findByEmail("a@b.com");
```

---

## 8) Schema middleware（pre/post hooks）

常见场景：存库前加密密码

```js
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  // this.password = await bcrypt.hash(this.password, 10);
  next();
});
```

---

## 9) 常见坑（非常关键）

1. **`unique` 不是校验器**：它是索引约束，错误要捕获 MongoDB duplicate key error。
2. **`select:false` 会导致查不到 password**：登录时需要 `.select('+password')`。
3. **Schema 不等于数据库结构强制**：MongoDB 本身是无 schema 的，强约束来自你的应用层（Mongoose）。
4. **索引需要创建**：生产环境常要确保索引建立（部署脚本、启动期处理）。

---

## 10) 推荐的项目组织方式（你做真实项目很重要）

```text
src/
  models/
    User.js
    Post.js
  config/
    db.js
  controllers/
    auth.controller.js
  routes/
    auth.routes.js
```

* `models/` 只放 Schema + model 导出
* `controllers/` 只处理业务逻辑
* `routes/` 只做路由映射
* `config/db.js` 只做连接

---

如果你愿意，我可以基于你现在正在做的“JWT + Cookie + Refresh Token”的方向，直接给你一套**User Schema 的最佳实践版本**（带：`select:false`、索引、校验、password hash middleware、toJSON 隐藏敏感字段、常用静态方法），并配套登录注册的 controller 与路由结构。你只要告诉我：你现在的 User 表打算有哪些字段（username/email/avatar/role 等）。
