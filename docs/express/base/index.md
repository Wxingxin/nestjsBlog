

## 1) HTTP 请求型（最常用：请求-响应）

### 1.1 URL 路径参数（Path Params）

**形式**：`/api/users/:id`
**适合**：资源定位（REST 风格）

- 前端：`GET /api/users/123`
- 后端：`req.params.id`

特点：语义清晰、可缓存（GET）、常用于“取某个资源”。

---

### 1.2 URL 查询参数（Query Params）

**形式**：`/api/posts?page=1&pageSize=20&keyword=xx`
**适合**：筛选、分页、排序、搜索

- 前端：`GET /api/posts?page=1`
- 后端：`req.query.page`

特点：非常适合列表接口；注意类型转换与默认值。

---

### 1.3 请求体 JSON（Body JSON）

**形式**：`Content-Type: application/json`
**适合**：创建/更新资源、提交结构化数据（最主流）

- 前端：`fetch(url, { method:'POST', body: JSON.stringify(data) })`
- 后端：`req.body`

特点：表达力强；配合 `express.json()`。

---

### 1.4 表单提交（application/x-www-form-urlencoded）

**形式**：传统表单编码
**适合**：简单表单、兼容老系统（现在用得少）

- 后端需要：`express.urlencoded({ extended: true })`
- 数据在：`req.body`

---

### 1.5 multipart/form-data（表单+文件混合）

**形式**：上传文件/图片 + 其他字段
**适合**：头像上传、附件上传、富文本图片

- 前端：`FormData`
- 后端：常用 `multer` 解析
- 字段：`req.body`，文件：`req.file / req.files`

---

### 1.6 自定义 Header 传参

**形式**：`Authorization`, `X-Request-Id`, `X-Tenant-Id` 等
**适合**：鉴权 Token、链路追踪、租户信息、灰度标记

- 前端：`headers: { Authorization: 'Bearer ...' }`
- 后端：`req.headers.authorization`

特点：不污染 URL；适合“元信息”。

---

### 1.7 HTTP Cookie（随请求自动携带）

**形式**：`Cookie: token=...`
**适合**：会话、跨页面状态、SSO（尤其后端会话）

- 前端：浏览器自动带（同域/满足策略）
- 后端读取：`req.cookies`（需 `cookie-parser`）
- 设置：`res.cookie(...)`

特点：对“浏览器端”很自然；涉及 SameSite/跨域配置（见后文）。

---

### 1.8 响应体（Response Body）

**形式**：JSON / 文本 / 二进制
**适合**：后端向前端返回业务数据、错误信息

- Express：`res.json({ ... })`
- React：`await res.json()`

建议：统一返回结构（如 `code/message/data`），利于前端处理。

---

### 1.9 响应头（Response Headers）

**适合**：分页总数、版本号、速率限制、文件下载信息等

例如：

- `X-Total-Count`：列表总数
- `ETag / Last-Modified`：缓存
- `Content-Disposition`：下载文件名

前端可通过 `response.headers.get(...)` 获取（注意 CORS 暴露头）。

---

## 2) 实时连接型（持续传输/双向）

### 2.1 WebSocket（全双工）

**适合**：聊天室、实时通知、游戏状态、协同编辑、实时仪表盘
特点：**双向**、低延迟、长连接。

常见方案：原生 WebSocket、`socket.io`（带房间/重连/降级）。

---

### 2.2 SSE（Server-Sent Events，服务端单向推送）

**适合**：后端持续推送（日志流、进度条、通知流）
特点：**服务端 → 客户端单向**、基于 HTTP、实现简单、穿透代理更友好。

---

### 2.3 Long Polling（长轮询）

**适合**：无法用 WS/SSE 的环境，或极简实时需求
特点：实现简单但效率较差，延迟与资源占用更高。

---

### 2.4 Polling（短轮询）

**适合**：低频状态刷新（比如每 10s 刷新一次列表）
特点：最简单，但最“粗暴”。

---

## 3) 文件与二进制数据传递

### 3.1 直接下载（Blob/stream）

**适合**：导出 Excel、下载 PDF、下载图片/压缩包
Express 侧：`res.download()` / `res.sendFile()` / 流式 `pipe`

前端：`response.blob()` + `URL.createObjectURL(...)`

---

### 3.2 Base64（不推荐大文件）

**适合**：很小的图片/签名、无需额外请求的内嵌场景
缺点：体积膨胀（约 33%），不适合大文件。

---

## 4) 身份、状态与安全（数据“如何可信/可用”）

这类不是“传参的字段形式”，但它决定了前后端数据传递能否成立。

### 4.1 Session（服务端会话）+ Cookie（会话标识）

**适合**：传统 Web、后台管理、同域场景
流程：后端存 session，浏览器用 cookie 自动带 session id。

常用：`express-session` + store（Redis 等）

---

### 4.2 JWT（无状态 Token）

**适合**：前后端分离、移动端、多服务
传递位置通常两种：

- `Authorization: Bearer <token>`（最常见）
- Cookie（httpOnly）（更接近“会话体验”）

---

### 4.3 CSRF 防护（Cookie 场景重点）

如果你用 **Cookie 携带登录态**（尤其跨站），必须关注 CSRF。
常见做法：

- SameSite 策略（Lax/Strict/None）
- CSRF Token（双重提交、csrf 中间件）

---

### 4.4 CORS（跨域传递能否成功）

React 开发常见：`localhost:5173` → `localhost:3000`
如果你要带 Cookie，还要：

- 前端：`fetch(..., { credentials: 'include' })`
- 后端：`cors({ origin: '...', credentials: true })`

否则 Cookie 不会带过去，前端也读不到某些响应头。

---

## 5) 你在项目里最常见的“组合方案”

### 方案 A：REST + JSON（最主流）

- GET：`params/query`
- POST/PUT/PATCH：`JSON body`
- 鉴权：`Authorization Bearer JWT`
- 返回：统一 JSON 结构

适合 90% 前后端分离项目。

---

### 方案 B：Session + Cookie（偏传统但很好用）

- 登录后 Set-Cookie
- 之后请求自动带 Cookie
- 适合后台管理、同域部署、SSR 场景

---

### 方案 C：实时需求（通知/聊天）

- 普通业务：REST
- 实时：WebSocket 或 SSE
- 上传下载：multipart + stream

---

## 6) 一页速查表（按“传什么”选方式）

| 需求                     | 推荐方式                                  |
| ------------------------ | ----------------------------------------- |
| 获取某个资源             | Path Params + GET                         |
| 列表分页/筛选            | Query + GET                               |
| 提交复杂数据             | JSON Body + POST/PUT/PATCH                |
| 上传文件                 | multipart/form-data                       |
| 登录态（前后端分离）     | JWT（Authorization）或 Cookie（httpOnly） |
| 实时双向                 | WebSocket / socket.io                     |
| 服务端持续推送           | SSE                                       |
| 导出下载大文件           | stream/download                           |
| 传元信息（trace/tenant） | Header                                    |

---

如果你告诉我你现在的架构更像哪一种（例如：**开发环境 Vite + React，后端 Express，是否跨域，登录态想用 JWT 还是 Cookie**），我可以直接给你一套“项目级最佳实践模板”：

- 统一返回结构 + 错误处理中间件
- Axios/Fetch 封装（带 Token/自动刷新）
- CORS + Cookie/JWT 的正确配置组合（避免踩坑）
