下面给你一份“项目中最常见的 React（前端）↔ Express（后端）数据传递使用大全”，覆盖你点名的 5 种方式：**路径参数、查询参数、请求体 JSON、表单提交（urlencoded）、multipart/form-data（含文件上传）**，并配套“经典可直接抄用”的代码案例（React 用 Fetch，Express 用标准中间件 + multer）。

---

# 0. 统一约定：接口前缀与返回结构（强烈建议）

**返回结构建议统一：**

```js
{ code: 0, message: "ok", data: ... }
```

这样前端好做统一错误处理与提示。

---

# 1) 路径参数 Path Params（资源定位）

## 1.1 Express 后端

```js
import express from "express";
const app = express();

app.get("/api/users/:id", (req, res) => {
  const { id } = req.params; // string
  // 业务：查库
  res.json({ code: 0, message: "ok", data: { id, name: "Alice" } });
});
```

## 1.2 React 前端（Fetch）

```js
async function fetchUser(id) {
  const resp = await fetch(`/api/users/${encodeURIComponent(id)}`);
  const json = await resp.json();
  return json.data;
}
```

**典型场景**：`GET /users/:id`、`GET /posts/:postId/comments`

---

# 2) 查询参数 Query Params（分页/筛选/搜索）

## 2.1 Express 后端

```js
app.get("/api/posts", (req, res) => {
  // req.query 里都是 string 或 string[]
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 10);
  const keyword = String(req.query.keyword ?? "");

  res.json({
    code: 0,
    message: "ok",
    data: {
      page,
      pageSize,
      keyword,
      list: [],
      total: 0,
    },
  });
});
```

## 2.2 React 前端（URLSearchParams 推荐）

```js
async function fetchPosts({ page = 1, pageSize = 10, keyword = "" }) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    keyword,
  });

  const resp = await fetch(`/api/posts?${params.toString()}`);
  const json = await resp.json();
  return json.data;
}
```

**典型场景**：分页列表、筛选、排序、搜索关键词。

---

# 3) 请求体 JSON（主流：创建/更新）

> Express 解析 JSON 的前提：`app.use(express.json())`

## 3.1 Express 后端

```js
app.use(express.json());

app.post("/api/login", (req, res) => {
  const { username, password } = req.body; // JSON body
  if (!username || !password) {
    return res.status(400).json({ code: 40001, message: "缺少参数" });
  }

  // 业务：校验账号密码
  res.json({ code: 0, message: "ok", data: { token: "fake-jwt-token" } });
});
```

## 3.2 React 前端（注意 Content-Type）

```js
async function login(username, password) {
  const resp = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const json = await resp.json();
  if (!resp.ok) throw new Error(json.message || "登录失败");
  return json.data.token;
}
```

**典型场景**：登录、创建资源（POST）、更新资源（PUT/PATCH）。

---

# 4) 表单提交 application/x-www-form-urlencoded（兼容传统表单）

> Express 解析 urlencoded 的前提：`app.use(express.urlencoded({ extended: true }))`

## 4.1 Express 后端

```js
app.use(express.urlencoded({ extended: true }));

app.post("/api/profile", (req, res) => {
  // x-www-form-urlencoded 会落到 req.body
  const { nickname, bio } = req.body;
  res.json({ code: 0, message: "ok", data: { nickname, bio } });
});
```

## 4.2 React 前端（URLSearchParams 作为 body）

```js
async function updateProfile(nickname, bio) {
  const body = new URLSearchParams({ nickname, bio });

  const resp = await fetch("/api/profile", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: body.toString(),
  });

  const json = await resp.json();
  if (!resp.ok) throw new Error(json.message || "更新失败");
  return json.data;
}
```

**典型场景**：后端只接受表单编码、老系统对接、简单表单。

---

# 5) multipart/form-data（文件上传 + 字段）

> Express 解析 multipart 的常用方案：`multer`

## 5.1 Express 后端（multer 经典配置）

```js
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    // 简化：用时间戳 + 原始名（生产建议再做白名单/去路径等处理）
    const safeName = file.originalname.replace(/[^\w.\-()]/g, "_");
    cb(null, `${Date.now()}_${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

app.post("/api/upload/avatar", upload.single("avatar"), (req, res) => {
  // 文本字段：req.body；文件：req.file
  const { userId } = req.body;
  if (!req.file) {
    return res.status(400).json({ code: 40002, message: "缺少文件 avatar" });
  }

  res.json({
    code: 0,
    message: "ok",
    data: {
      userId,
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      path: `/uploads/${req.file.filename}`,
    },
  });
});
```

> 若你希望前端可直接访问上传后的文件，通常还会加静态托管：

```js
app.use("/uploads", express.static(uploadDir));
```

## 5.2 React 前端（FormData 经典写法）

```js
async function uploadAvatar({ userId, file }) {
  const form = new FormData();
  form.append("userId", String(userId));
  form.append("avatar", file); // 这个 key 必须和 upload.single("avatar") 对应

  const resp = await fetch("/api/upload/avatar", {
    method: "POST",
    body: form, // 注意：不要手动设置 Content-Type，浏览器会自动带 boundary
  });

  const json = await resp.json();
  if (!resp.ok) throw new Error(json.message || "上传失败");
  return json.data;
}
```

**典型场景**：头像、附件、图片上传、富文本图片。

---

# 6) 一个小型“综合示例”：同一项目里最常见组合

* `GET /api/users/:id`：路径参数
* `GET /api/posts?page=1&pageSize=10`：查询参数
* `POST /api/login`：JSON body
* `POST /api/profile`：urlencoded
* `POST /api/upload/avatar`：multipart

你可以把上面片段组合到一个 Express server + React services 里，基本就是多数前后端分离项目的“数据传递骨架”。

---

# 7) 项目落地要点（避免踩坑）

1. **类型问题**：`req.params`、`req.query` 默认是字符串，分页等必须 `Number()`。
2. **JSON 必开中间件**：`app.use(express.json())`，否则 `req.body` 是 `undefined`。
3. **urlencoded 必开中间件**：`app.use(express.urlencoded({ extended: true }))`。
4. **multipart 必用解析器**：`multer`/`busboy`；同时限制大小、校验文件类型。
5. **FormData 不要手动设置 Content-Type**：否则 boundary 丢失导致后端解析失败。

---

如果你希望我“更贴近你真实项目”，我可以在不问你太多问题的前提下，直接给你一套可复制的工程骨架（含目录结构、统一 `fetch` 封装、统一错误处理中间件、以及一个可运行的上传示例）。你更偏向：

* Vite + React（纯前端） + Express 单独起服务
  还是
* Express 同时托管 React 静态资源（同域部署）？
