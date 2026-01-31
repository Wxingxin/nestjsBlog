下面我按**工程实践而不是教学示例**的方式，给你一套**Express 后端（类似 X / Twitter 的社交平台）**中**常见、合理、可扩展**的目录结构，并把**每一层存在的意义、命名规则、职责边界**讲清楚。
这套结构适合：**RN / Flutter / React / Web 前端 + Express API**。

---

# 一、整体设计思想（先立规矩）

在真实项目里，Express 后端通常遵循这几个原则：

1. **分层清晰**

   * 路由只管“路径”
   * 控制器只管“请求 / 响应”
   * Service 只管“业务逻辑”
   * Model 只管“数据结构 & DB 操作”

2. **职责单一**

   * 一个文件做一类事情
   * 不写“上帝文件”

3. **面向扩展**

   * 后期加点赞 / 转发 / 推荐，不推翻结构

---

# 二、推荐目录结构（类似 X 项目）

```text
src/
├── app.js                 # Express 实例 & 中间件注册
├── server.js              # 启动入口（listen）
│
├── config/                # 配置相关
│   ├── env.js             # 环境变量封装
│   ├── db.js              # 数据库连接
│   ├── jwt.js             # JWT 配置（secret/expire）
│   └── logger.js          # winston 配置
│
├── routes/                # 路由层（URL → Controller）
│   ├── index.js           # 路由聚合
│   ├── auth.routes.js
│   ├── user.routes.js
│   ├── post.routes.js
│   └── comment.routes.js
│
├── controllers/           # 控制器层（req/res）
│   ├── auth.controller.js
│   ├── user.controller.js
│   ├── post.controller.js
│   └── comment.controller.js
│
├── services/              # 业务逻辑层（最重要）
│   ├── auth.service.js
│   ├── user.service.js
│   ├── post.service.js
│   └── comment.service.js
│
├── models/                # 数据模型（Mongoose / Prisma）
│   ├── user.model.js
│   ├── post.model.js
│   ├── comment.model.js
│   └── like.model.js
│
├── middlewares/            # 中间件
│   ├── auth.middleware.js # JWT / Token 校验
│   ├── error.middleware.js
│   ├── rateLimit.js
│   └── upload.js
│
├── validators/             # 请求参数校验
│   ├── auth.validator.js
│   ├── post.validator.js
│   └── user.validator.js
│
├── utils/                  # 工具函数
│   ├── hash.js            # bcrypt
│   ├── token.js           # jwt / token 工具
│   ├── response.js        # 统一响应格式
│   └── pagination.js
│
├── constants/              # 常量
│   ├── roles.js
│   ├── permissions.js
│   └── errorCodes.js
│
├── jobs/                   # 定时/异步任务
│   └── cleanup.job.js
│
├── docs/                   # API 文档
│   └── swagger.js
│
└── tests/                  # 测试
    ├── auth.test.js
    └── post.test.js
```

---

# 三、每一层到底“干什么”（重点）

## 1️⃣ `app.js` vs `server.js`（非常重要）

**为什么要拆？**

```js
// app.js
const express = require('express');
const routes = require('./routes');
const errorHandler = require('./middlewares/error.middleware');

const app = express();

app.use(express.json());
app.use('/api', routes);
app.use(errorHandler);

module.exports = app;
```

```js
// server.js
const app = require('./app');
const { connectDB } = require('./config/db');

connectDB();

app.listen(4000, () => {
  console.log('Server running');
});
```

**好处**

* 测试时可以直接 import app
* 部署 / cluster / serverless 更灵活

---

## 2️⃣ `routes/`（只做一件事：映射 URL）

```js
// post.routes.js
const router = require('express').Router();
const controller = require('../controllers/post.controller');
const auth = require('../middlewares/auth.middleware');

router.post('/', auth, controller.createPost);
router.get('/:id', controller.getPost);

module.exports = router;
```

**规则**

* 不写业务逻辑
* 不访问数据库
* 文件名：`xxx.routes.js`

---

## 3️⃣ `controllers/`（HTTP 世界的翻译官）

```js
exports.createPost = async (req, res, next) => {
  try {
    const post = await postService.create(req.user.id, req.body);
    res.json(post);
  } catch (err) {
    next(err);
  }
};
```

**只关心**

* req / res
* 状态码
* 调用哪个 service

---

## 4️⃣ `services/`（核心业务逻辑层）

```js
exports.create = async (userId, data) => {
  if (!data.content) {
    throw new Error('Content required');
  }

  return Post.create({
    author: userId,
    content: data.content
  });
};
```

**这里才是项目的“大脑”**

* 权限判断
* 规则判断
* 组合多个 model
* 事务（如果有）

---

## 5️⃣ `models/`（数据结构）

```js
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: String,
  likesCount: Number
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);
```

**规则**

* 不写业务
* 只写 schema + DB 方法

---

## 6️⃣ `middlewares/`（请求生命周期中的“关卡”）

常见中间件：

* `auth.middleware.js`：鉴权
* `error.middleware.js`：统一错误
* `rateLimit.js`：防刷
* `upload.js`：头像/图片

---

## 7️⃣ `validators/`（参数校验）

```js
const { body } = require('express-validator');

exports.createPost = [
  body('content').isLength({ min: 1, max: 280 })
];
```

**目的**

* controller 之前就拦住非法请求
* 减少 service 判断

---

## 8️⃣ `utils/` vs `constants/`

**utils**

* 函数
* 可复用逻辑

**constants**

* 不变的值
* 枚举 / 错误码 / 权限表

---

# 四、类似 X 的项目“至少需要哪些模块？”

### 核心功能模块

* auth（登录 / 注册 / 刷新）
* user（个人资料 / 关注）
* post（发帖）
* comment（评论）
* like（点赞）

### 常见附加模块

* notification（通知）
* upload（头像 / 图片）
* search（搜索）
* feed（时间线）

---

# 五、命名规则总结（非常重要）

| 类型  | 命名                  |
| --- | ------------------- |
| 路由  | `xxx.routes.js`     |
| 控制器 | `xxx.controller.js` |
| 服务  | `xxx.service.js`    |
| 模型  | `xxx.model.js`      |
| 中间件 | `xxx.middleware.js` |
| 校验  | `xxx.validator.js`  |

---

# 六、给你一句非常实用的经验结论

> **Express 项目是否“高级”，不是看用了多少库，而是看：**
>
> * 路由干不干净
> * 业务是不是都在 service
> * controller 是不是足够薄

---

如果你愿意，下一步我可以直接帮你：

* 按这个结构 **生成一个最小可运行的 X 后端骨架**
* 或者专门拆解 **auth / post / like 三个模块的完整实现**（带 JWT 或非 JWT）

你想从哪一块开始落地？
你弄不清楚的根因通常不是“概念没背熟”，而是没有一条明确的工程规则：**每一层允许写什么、禁止写什么、写到什么程度就该下沉/上浮**。下面我给你一套在 Express 项目里非常实用的“分层契约”，并用类似 X 的典型接口贯穿说明。

---

## 一、三者在请求链路里的位置（先建立直觉）

一次请求从进入 Express 到返回，大致是：

1. **Middleware（中间件）**：像安检口、流水线工位

* 做“通用、横切、可复用”的事情
* 比如：鉴权、限流、解析上传、统一错误处理、日志、CORS

2. **Controller（控制器）**：像前台接待/翻译

* 接收 HTTP 请求（req），把它翻译成业务需要的输入
* 调用 Service
* 把 Service 的结果翻译成 HTTP 响应（res）

3. **Service（服务）**：像业务部门/大脑

* 写业务规则、业务流程、权限逻辑、组合多个数据模型
* 产出“业务结果”或抛出“业务错误”

> 最重要的一条：**Controller 不写业务；Service 不处理 HTTP；Middleware 不写具体业务流程。**

---

## 二、每一层“写什么/不写什么”（分层契约）

### 1) Controller：写“HTTP 适配层”

**写什么**

* 从 `req` 里取数据：params / query / body / headers / user（由鉴权中间件注入）
* 调用对应 service：`await xxxService.doSomething(...)`
* 返回 `res.status(...).json(...)`
* 把错误交给 `next(err)`（统一错误处理中间件处理）

**不写什么（强约束）**

* 不写数据库操作（不要在 controller 里 `User.find()`）
* 不写复杂业务判断（比如“是否能点赞”“是否能删除”这种规则）
* 不组织过多流程（比如发帖后还要发通知、更新计数，这些都应放 service）

**Controller 的“薄”长什么样**

* 20~40 行以内很常见
* 只负责“进来什么、出去什么”

---

### 2) Service：写“业务逻辑 + 流程编排”

**写什么**

* 业务规则：是否允许、边界条件、权限判断
* 业务流程：发帖 -> 更新统计 -> 生成通知（多个动作组合）
* 调用 model / repository 做数据读写
* 处理一致性：计数、事务（如果使用）
* 抛出业务错误（例如 `Forbidden`, `NotFound`, `BadRequest`）

**不写什么**

* 不直接操作 `req` / `res`
* 不关心 HTTP 状态码
* 不做 Express 的 next()

**Service 的“厚”长什么样**

* 这里是你项目的核心
* 允许复杂，但要可测试（能单测、不依赖 Express）

---

### 3) Middleware：写“横切关注点（Cross-cutting concerns）”

**写什么**

* 鉴权：解析 token/session，拿到 user，挂到 `req.user`
* 权限门禁：例如 `requireRole('admin')`
* 统一错误处理：把错误变成统一 JSON
* 参数校验：拦截非法请求（也可用 validators 单独层）
* rate limit：防刷
* 日志：记录 request/response
* 文件上传：multer 解析 multipart

**不写什么**

* 不要写具体业务（例如“点赞逻辑”“发帖逻辑”）
* 不访问业务表并做复杂决策（除非是非常通用的，比如 auth 需要查用户也可以接受，但要克制）

---

## 三、用一个完整例子贯穿（“点赞”接口最典型）

目标接口：
`POST /api/posts/:postId/like`

### 1) 路由层（routes）只负责“接线”

```js
router.post('/posts/:postId/like', authMiddleware, postController.likePost);
```

### 2) 中间件 authMiddleware（只负责把用户解析出来）

它做的事：

* 从 header/cookie 里拿 token
* 验证 token
* 查出 user（可选）
* `req.user = { id, roles... }`
* 放行 or 拒绝

> 关键点：它**不管**“这个用户能不能点赞这个帖子”，它只管“你是谁”。

### 3) 控制器 likePost（只负责 HTTP 翻译）

它做的事：

* `postId = req.params.postId`
* `userId = req.user.id`
* 调 service
* res 返回结果

它不做的事：

* 不写 `Like.create(...)`
* 不写“如果已经点过赞则取消”这种规则（这属于业务）

### 4) service：postService.toggleLike（业务核心）

它做的事：

* 检查帖子是否存在
* 检查是否已点赞
* 点赞：写 like 表 + post.likesCount +1
* 取消：删 like 表 + post.likesCount -1
* 返回最终状态（liked: true/false, likesCount）

> 注意：这会涉及多个写操作，所以 service 才是正确位置。

---

## 四、你最容易混乱的“判断标准”（直接给你可执行规则）

你写代码时只需要问自己 4 个问题：

### 问题 1：这段代码是否在读写 `req` / `res`？

* 是 → 放 **Controller** 或 **Middleware**
* 否 → 继续问

### 问题 2：这段代码是否在表达业务规则（能不能、应不应该、流程怎么走）？

* 是 → 放 **Service**
* 否 → 继续问

### 问题 3：这段代码是否“所有接口都可能需要”（通用能力）？

* 是 → 放 **Middleware** / **Utils**
* 否 → 继续问

### 问题 4：这段代码是否是数据库结构/访问逻辑？

* 是 → 放 **Model**（或 Repository 层）
* 否 → 放 **Utils**

---

## 五、再给你几个常见“放错位置”的例子（你一看就懂）

### 错误 1：在 controller 里写数据库逻辑

* 症状：controller 很长，掺杂 find/create/update
* 修正：抽到 service

### 错误 2：在 middleware 里写具体业务（比如点赞）

* 症状：middleware 里出现 `Post.findById()` 并更新点赞计数
* 修正：middleware 只做鉴权/校验/通用拦截

### 错误 3：service 里返回 HTTP 状态码或 res.json

* 症状：service 里写 `return res.status(401)...`
* 修正：service 抛业务错误，由 error middleware 统一转 HTTP

---

## 六、你可以按这个“最小模板”写（你照着就不会乱）

### Controller 模板（固定套路）

* 取输入
* 调 service
* 返回输出
* try/catch next(err)

### Service 模板（固定套路）

* 校验业务前置条件
* 查数据
* 做业务判断
* 写数据
* 返回业务结果（纯 JSON/对象）

### Middleware 模板（固定套路）

* 读取请求信息（header/cookie/body）
* 做通用拦截（鉴权/校验/限流/日志）
* 写 `req.xxx`
* `next()` 或 `res.status(...).json(...)`

---

如果你愿意，我下一条可以直接给你一套“可复制到项目”的骨架代码（按你现在做的 X 后端）：

* `auth.middleware.js`
* `error.middleware.js`
* `post.controller.js`
* `post.service.js`
* `like.model.js` + `post.model.js`

并且我会在每个文件顶部写清楚“该文件允许写什么 / 禁止写什么”。你希望用 **JWT** 还是用我前面提到的 **Opaque Token（随机串）** 来做鉴权？
