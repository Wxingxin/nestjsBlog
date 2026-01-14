下面给你一套 **Mongoose 常用方法清单 + 经典代码案例**，按真实 Express 项目里最常用的场景组织（CRUD、查询、更新、分页、Populate、聚合、事务、索引、性能）。示例默认你已有 `User`、`Post` 两个模型。

---

## 0) 示例 Schema（用于后续案例）

```js
// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["user", "admin"], default: "user" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
```

```js
// models/Post.js
const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, index: true },
    content: { type: String, default: "" },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    tags: [{ type: String, index: true }],
    likes: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

postSchema.index({ title: "text", content: "text" }); // 文本索引示例

module.exports = mongoose.model("Post", postSchema);
```

---

# 1) 新增：`create()` / `insertMany()` / `save()`

### 1.1 `Model.create()`（最常用）

```js
const user = await User.create({
  username: "wjx",
  email: "wjx@test.com",
  password: "hashed_password",
});
```

### 1.2 `insertMany()`（批量导入/seed）

```js
await Post.insertMany([
  { title: "Hello", author: user._id, tags: ["intro"] },
  { title: "Mongoose", author: user._id, tags: ["db"] },
]);
```

### 1.3 `new Model()` + `save()`（需要逐步构建时）

```js
const post = new Post({ title: "Draft", author: user._id });
post.content = "content...";
await post.save();
```

---

# 2) 查询：`find()` / `findOne()` / `findById()` / `select()` / `sort()` / `limit()`

### 2.1 基础查询

```js
const users = await User.find({ role: "user" });
const one = await User.findOne({ email: "wjx@test.com" });
const byId = await User.findById("65f...abc");
```

### 2.2 `select()`：选择/隐藏字段（登录常用）

```js
const user = await User.findOne({ email }).select("+password"); // 因为 password: select:false
```

### 2.3 排序分页（经典组合）

```js
const page = 1;
const pageSize = 10;

const list = await Post.find({ isPublished: true })
  .sort({ createdAt: -1 })
  .skip((page - 1) * pageSize)
  .limit(pageSize)
  .select("title author tags createdAt");
```

---

# 3) 更新：`updateOne()` / `updateMany()` / `findByIdAndUpdate()` / `$set` `$inc` `$push` `$pull`

### 3.1 `findByIdAndUpdate()`（最常用）

```js
const updated = await User.findByIdAndUpdate(
  userId,
  { $set: { username: "newName" } },
  { new: true, runValidators: true }
);
```

* `new: true`：返回更新后的文档
* `runValidators: true`：更新也走 schema 校验（强烈建议）

### 3.2 计数器：`$inc`（点赞/浏览量）

```js
await Post.updateOne({ _id: postId }, { $inc: { likes: 1 } });
```

### 3.3 数组字段：`$push` / `$pull`

```js
await Post.updateOne({ _id: postId }, { $push: { tags: "mongodb" } });
await Post.updateOne({ _id: postId }, { $pull: { tags: "intro" } });
```

---

# 4) 删除：`deleteOne()` / `deleteMany()` / `findByIdAndDelete()`

```js
await Post.deleteOne({ _id: postId });
await Post.deleteMany({ isPublished: false });

const deleted = await User.findByIdAndDelete(userId);
```

---

# 5) 统计与计数：`countDocuments()` / `estimatedDocumentCount()`

### 5.1 精确计数（带条件）

```js
const total = await Post.countDocuments({ isPublished: true });
```

### 5.2 估算计数（更快，不带条件）

```js
const approx = await Post.estimatedDocumentCount();
```

---

# 6) 存在性判断：`exists()`

登录注册、唯一性校验常用：

```js
const exists = await User.exists({ email });
if (exists) throw new Error("Email already exists");
```

---

# 7) 关联查询：`populate()`（非常常用）

### 7.1 Post 查 author 信息

```js
const post = await Post.findById(postId)
  .populate("author", "username email role"); // 只取这些字段
```

### 7.2 列表页 populate

```js
const posts = await Post.find({ isPublished: true })
  .sort({ createdAt: -1 })
  .limit(20)
  .populate("author", "username");
```

---

# 8) 性能关键：`lean()`（高频列表建议用）

> `lean()` 返回普通 JS 对象，**更快更省内存**，但你就拿不到 document 方法（如 `save()`）。

```js
const posts = await Post.find({ isPublished: true })
  .select("title author createdAt")
  .lean();
```

---

# 9) 复杂查询：`$or` / `$in` / 正则 / 时间范围

### 9.1 `$or`（搜索）

```js
const q = "wjx";
const users = await User.find({
  $or: [
    { username: new RegExp(q, "i") },
    { email: new RegExp(q, "i") },
  ],
});
```

### 9.2 `$in`（标签过滤）

```js
const posts = await Post.find({ tags: { $in: ["mongodb", "node"] } });
```

### 9.3 时间范围

```js
const from = new Date("2026-01-01");
const to = new Date("2026-02-01");

const posts = await Post.find({ createdAt: { $gte: from, $lt: to } });
```

---

# 10) 聚合：`aggregate()`（排行榜/报表/分组）

### 10.1 按 author 统计发文数

```js
const stats = await Post.aggregate([
  { $match: { isPublished: true } },
  { $group: { _id: "$author", count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 10 },
]);
```

---

# 11) 事务：`session` + `withTransaction()`（资金/库存/强一致场景）

例如：发布文章时同时写入一条“发布记录”（示例简化）

```js
const mongoose = require("mongoose");

const session = await mongoose.startSession();

try {
  await session.withTransaction(async () => {
    const post = await Post.create([{ title, author: userId, isPublished: true }], { session });

    await User.updateOne(
      { _id: userId },
      { $inc: { postCount: 1 } },
      { session }
    );
  });
} finally {
  session.endSession();
}
```

---

# 12) 中间件/钩子：`pre('save')`（密码加密经典位）

```js
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  // this.password = await bcrypt.hash(this.password, 10);
  next();
});
```

---

# 13) 错误处理：重复键 `E11000`（unique 常见）

```js
try {
  await User.create({ email, username, password });
} catch (err) {
  if (err?.code === 11000) {
    // E11000 duplicate key error
    throw new Error("Email already exists");
  }
  throw err;
}
```

---

## 你最该优先掌握的“项目级组合”（建议顺序）

1. `create` / `findOne` / `findById`
2. `findByIdAndUpdate`（带 `runValidators`）
3. `populate`
4. `countDocuments + skip + limit`（分页）
5. `lean`（性能）
6. `aggregate`（统计）
7. `session`（事务）

---

如果你告诉我你现在做的是哪种项目（例如：X 社交平台后端、博客系统、后台管理），以及你有哪些实体（User/Post/Comment/Like/Follow），我可以把上面这些方法**直接组装成一个真实的模块**：包含 model、controller、route、分页、搜索、populate、统一错误处理，贴近你要做的项目结构。
