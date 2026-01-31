下面我按你给的目录，把 **每个文件写什么内容、起什么作用、要被谁 import 才会生效** 一次讲透。你照这个做，项目会非常“可维护 + 可扩展”。

---

## 总体调用链（你先记住这个）

**server.js → app.js → routes/index.js → 各业务 routes → controllers → services → models**
同时：

* `middlewares/*` 在 `app.js` 或具体 route 上挂载
* `config/*` 被 `app.js / server.js / services / models` 等引用
* `utils/*` 被 `services/controllers/middlewares` 引用
* `validators/*` 通常在 `routes` 层引用（作为中间件）

---

# 1) 顶层入口

## `src/server.js`（启动入口）

**写什么：**

* `import app from './app.js'`
* 读取端口，`app.listen`
* 监听未捕获异常/Promise rejection（可选）
* 如果需要：在启动前确保 DB 已连接

**作用：**唯一入口文件，负责“启动服务”。

**谁 import 它：**

* **没人 import**（由 `node src/server.js` 或 `npm start` 直接运行）

---

## `src/app.js`（Express 实例 & 中间件注册）

**写什么：**

* `const app = express()`
* 全局中间件：`express.json() / cookieParser / cors / helmet / rateLimit`
* 日志：`morgan` 或 `logger` 的 request log
* 挂载路由：`app.use('/api', routes)`
* swagger：`app.use('/docs', swaggerUi...)`
* 错误处理中间件：`app.use(errorMiddleware)`（必须放最后）

**作用：**组装应用（中间件 + 路由 + 错误处理）。

**被谁 import：**

* `server.js` import 它并 listen

---

# 2) config/（配置层）

## `config/env.js`

**写什么：**

* 统一读取 `.env`：`PORT, DB_URL, JWT_SECRET, JWT_EXPIRES...`
* 校验缺失必填项（启动就报错）
* 导出一个 `env` 对象

**作用：**让全项目使用同一份配置来源，避免到处 `process.env.xxx`。

**被谁 import：**

* `server.js / app.js / db.js / jwt.js / logger.js / token.js ...`

---

## `config/db.js`

**写什么：**

* `connectDB()`：连接 Mongo / Postgres
* 连接成功日志
* 连接失败退出进程

**作用：**集中管理 DB 连接逻辑。

**被谁 import：**

* 常见做法：`server.js` 在 listen 前 `await connectDB()`
* 或 `app.js` 启动时连接（不推荐但也行）

---

## `config/jwt.js`

**写什么：**

* `JWT_SECRET`
* `ACCESS_TOKEN_EXPIRES_IN`
* （可选）`REFRESH_TOKEN_EXPIRES_IN`

**作用：**JWT 策略集中化。

**被谁 import：**

* `utils/token.js`
* `services/auth.service.js`
* `middlewares/auth.middleware.js`

---

## `config/logger.js`（winston）

**写什么：**

* 创建 `logger` 实例（console + file）
* format、level、timestamp

**作用：**统一日志接口：`logger.info/error`.

**被谁 import：**

* 几乎所有层都可能用：`db.js / server.js / services / error.middleware.js`

---

# 3) routes/（路由层：URL → controller）

## `routes/index.js`（路由聚合）

**写什么：**

* `router = express.Router()`
* `router.use('/auth', authRoutes)`
* `router.use('/users', userRoutes)` 等
* 导出 router

**作用：**把所有业务路由合并成一个入口。

**被谁 import：**

* `app.js`：`app.use('/api', routesIndex)`

---

## `routes/auth.routes.js / user.routes.js / post.routes.js / comment.routes.js`

**写什么：**

* 定义每个 endpoint：`router.post('/login', ...)`
* 串联中间件：`validate(...) → authMiddleware → controller`
* 不写业务逻辑

**作用：**“路由编排层”，决定请求走向 + 权限 + 校验。

**被谁 import：**

* `routes/index.js` 聚合它们

---

# 4) controllers/（控制器层：req/res）

## `controllers/*.controller.js`

**写什么：**

* 从 `req` 取参数（body/query/params/user）
* 调用 `service` 完成业务
* 返回统一响应：`res.json(ok(data))`
* **不写数据库操作**，不写复杂业务

**作用：**HTTP 适配层：把 HTTP 世界转换为业务调用。

**被谁 import：**

* 对应的 `routes/*.routes.js`

---

# 5) services/（业务逻辑层：最重要）

## `services/*.service.js`

**写什么：**

* 真正业务：注册、登录、发帖、评论、权限判断
* 调用 model（DB）
* 调用 utils（hash/token/pagination）
* 抛业务错误（交给 error middleware 统一处理）

**作用：**可测试、可复用的核心业务层。

**被谁 import：**

* `controllers/*.controller.js`

---

# 6) models/（数据层）

## `models/*.model.js`

**写什么：**

* Mongoose：schema + model
* Prisma：不在这里写 schema（schema.prisma），但可以写“repository wrapper”（可选）
* 定义关系/索引/默认值
* 不写业务逻辑

**作用：**定义数据结构 + DB 访问接口。

**被谁 import：**

* `services/*.service.js`

---

# 7) middlewares/（中间件）

## `middlewares/auth.middleware.js`（鉴权）

**写什么：**

* 从 `Authorization: Bearer` 或 cookie 取 token
* 校验 token（verify）
* 把 `userId/role/orgId` 注入 `req.user`
* 失败返回 401

**作用：**保护接口，提供当前登录用户上下文。

**被谁 import：**

* 主要在 `routes/*.routes.js` 里挂：`router.get('/me', auth, ...)`

---

## `middlewares/error.middleware.js`（错误处理，最后挂）

**写什么：**

* 统一捕获 `next(err)`
* 区分：

  * 校验错误（400）
  * 鉴权错误（401/403）
  * 业务错误（409/404）
  * 未知错误（500）
* 记录日志 + 输出统一 error 格式（带 `errorCodes`）

**作用：**全局错误出口。

**被谁 import：**

* `app.js` 最后 `app.use(errorMiddleware)`

---

## `middlewares/rateLimit.js`

**写什么：**

* 登录/注册等接口限流策略
* 可按路由拆分：`authLimiter`、`generalLimiter`

**作用：**防刷、防爆破。

**被谁 import：**

* `app.js`（全局）
* 或 `auth.routes.js`（只限制 auth）

---

## `middlewares/upload.js`

**写什么：**

* `multer` 配置（本地存储/内存存储）
* 文件大小、类型限制
* 导出 `upload.single('file')` / `upload.array(...)`

**作用：**上传处理。

**被谁 import：**

* 需要上传的 `routes`（例如 `post.routes.js`）

---

# 8) validators/（请求参数校验）

## `validators/*.validator.js`

**写什么：**

* zod/joi schema：login/register/createPost...
* 导出 `validate(schema)` 或直接导出 schema

**作用：**把“脏数据”挡在 controller/service 之前。

**被谁 import：**

* `routes/*.routes.js`：`router.post('/', validate(createPostSchema), controller)`

---

# 9) utils/（工具函数）

## `utils/hash.js`

**写什么：**

* `hashPassword(plain)`
* `verifyPassword(plain, hash)`（bcrypt/argon2）

**作用：**密码安全逻辑集中化。

**被谁 import：**

* `services/auth.service.js`

---

## `utils/token.js`

**写什么：**

* `signAccessToken(payload)`
* `verifyAccessToken(token)`
* （可选）refresh token 生成/校验

**作用：**token 处理集中化。

**被谁 import：**

* `auth.middleware.js`
* `auth.service.js`

---

## `utils/response.js`

**写什么：**

* `ok(data, message?)`
* `fail(code, message, details?)`

**作用：**统一响应结构，前端更好处理。

**被谁 import：**

* `controllers/*`
* `error.middleware.js`

---

## `utils/pagination.js`

**写什么：**

* `parsePagination(query)` -> `{page, pageSize, skip, limit}`
* 生成分页 meta

**作用：**列表查询一致化。

**被谁 import：**

* `services/post.service.js` 等列表业务

---

# 10) constants/（常量）

## `constants/roles.js / permissions.js`

**写什么：**

* `ROLES = { ADMIN, USER }`
* `PERMISSIONS = { POST_WRITE, POST_DELETE... }`

**作用：**权限体系的“源”。

**被谁 import：**

* `auth.middleware.js`（或 `middlewares/authorize.js` 如果你扩展）
* `services`（做业务授权判断）

---

## `constants/errorCodes.js`

**写什么：**

* 统一错误码：`AUTH_INVALID_TOKEN`, `USER_NOT_FOUND`, `VALIDATION_ERROR`...

**作用：**前后端约定的错误规范。

**被谁 import：**

* `error.middleware.js`
* `services` 抛错时引用

---

# 11) jobs/（定时/异步）

## `jobs/cleanup.job.js`

**写什么：**

* 清理过期 session/token、过期验证码、过期草稿等
* 用 `node-cron` 或队列（bullmq）

**作用：**后台维护任务。

**被谁 import：**

* 最常见：`server.js` 启动时 `startCleanupJob()`
* 或独立进程运行（更专业）

---

# 12) docs/（Swagger）

## `docs/swagger.js`

**写什么：**

* swagger 配置：title/version/servers
* 扫描路由注释或导入 openapi json
* 导出 `swaggerSpec`

**作用：**API 文档入口。

**被谁 import：**

* `app.js`：挂 `/docs`

---

# 13) tests/（测试）

## `tests/*.test.js`

**写什么：**

* supertest 调接口（注册、登录、发帖）
* mock DB 或测试库
* 断言状态码/响应结构

**作用：**保证鉴权和核心业务不被改坏。

**被谁 import：**

* 测试 runner（jest/vitest）执行，不被业务代码 import

---

# 你最关心的：哪些“必须引入”才会生效？

**必须引入链：**

1. `server.js` **必须 import** `app.js`
2. `app.js` **必须 import** `routes/index.js` 并 `app.use('/api', routes)`
3. `app.js` **必须挂** `error.middleware.js` 在最后
4. 如果你要 DB：`server.js`（或 `app.js`）**必须调用** `connectDB()`
5. `routes/*.routes.js` **必须 import** controller
6. controller **必须 import** service
7. service **必须 import** model

中间件/校验器属于“按需挂载”：你在 route 上不 `use`，就不会生效。

---

如果你想，我可以直接按你这个结构，给你一套 **最小可用 Auth（register/login/me/logout）+ JWT + bcrypt + zod + error handler** 的“文件内容模板”，每个文件都给出可直接复制的代码。你用的是 Mongo(Mongoose) 还是 Prisma(Postgres/MySQL)？
