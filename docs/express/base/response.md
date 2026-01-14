## 🤖🤖response

### response 的基础知识

`res` 是什么？（先建立正确认知）

在 Express 中：

```js
app.get("/test", (req, res) => {
  // res 就是 response
});
```

- `res` 是 **HTTP 响应对象**
- 基于 **Node.js 原生的 `http.ServerResponse`**
- Express **在其基础上扩展了大量方法**

👉 本质职责只有一件事：

> **构造并发送 HTTP 响应给客户端**

### response 的特点

> **一次请求，只能响应一次**

也就是说：

- `res.send()`
- `res.json()`
- `res.end()`

**只能调用一次**，否则就会报错：

```
Error: Can't set headers after they are sent
```

### response 的属性大全

| 分类   | 方法                     |
| ------ | ------------------------ |
| 状态   | `status`                 |
| 数据   | `send` / `json`          |
| Header | `set` / `get` / `type`   |
| 跳转   | `redirect`               |
| 文件   | `sendFile` / `download`  |
| Cookie | `cookie` / `clearCookie` |
| 模板   | `render`                 |
| 进阶   | `format`                 |

# 🤖🤖response 的方法

## 🤖🤖response base 做项目够用了

## 状态 response.status() 

| 范围 | 含义       | 一句话理解               |
| ---- | ---------- | ------------------------ |
| 1xx  | 信息       | 请求还在处理（几乎不用） |
| 2xx  | 成功       | 请求成功                 |
| 3xx  | 重定向     | 资源在别处               |
| 4xx  | 客户端错误 | **你请求有问题**         |
| 5xx  | 服务端错误 | **我这边炸了**           |

**设置 HTTP 状态码**

```js
res.status(200).json({ ok: true });
res.status(404).send("Not Found");
res.status(500).json({ error: "server error" });
```

链式调用（很重要）：

```js
res.status(201).json(data);
```



## 数据 
### response.send()

**发送响应体（最通用）**

```js
res.send("hello");
res.send({ a: 1 });
res.send([1, 2, 3]);
```

行为特点：

| 传入内容       | 实际效果           |
| -------------- | ------------------ |
| string         | text/html          |
| object / array | 自动 JSON          |
| Buffer         | 二进制             |
| number         | 被当成 status code |

⚠️ 注意：

```js
res.send(404); // ❌ 不是返回 404 内容
```

等价于：

```js
res.sendStatus(404);
```


## response.json()

**明确返回 JSON（后端接口最常用）**

```js
res.json({
  code: 0,
  message: "ok",
  data: {},
});
```

特点：

- 自动设置 `Content-Type: application/json`
- 自动 `JSON.stringify`

📌 实战建议：

> **接口统一用 `res.json`，不要混用 `res.send`**

## Cookie

### res.cookie()

**设置 Cookie** `res.cookie(name, value, options)`

```js
res.cookie("token", "abc123", {
  httpOnly: true,
  maxAge: 1000 * 60 * 60,
  sameSite: "lax"
});
```

常见配置项：

| 属性     | 作用         |
| -------- | ------------ |
| httpOnly | 防止 JS 读取 |
| secure   | 仅 https     |
| maxAge   | 毫秒         |
| sameSite | CSRF 防护    |


### `res.clearCookie()`

**清除 Cookie**

与 JWT / 登录态强相关

```js
res.clearCookie("token");
```

## 🤖🤖 response pro

## Header（响应头）相关

### 5️⃣ `res.set()` / `res.header()`

**设置响应头**

```js
res.set("X-Powered-By", "Express");
res.set({
  "Cache-Control": "no-cache",
  "X-Test": "123",
});
```

📌 两者等价：

```js
res.set();
res.header();
```


### 6️⃣ `res.get()`

**获取已设置的响应头**

```js
res.get("Content-Type");
```


### 7️⃣ `res.type()`

**快速设置 Content-Type**

```js
res.type("json");
res.type("html");
res.type("text");
```

等价于：

```js
res.set("Content-Type", "application/json");
```

## 重定向 & 下载 & 文件

### 8️⃣ `res.redirect()`

**重定向**

```js
res.redirect("/login");
res.redirect(301, "/new-path");
```

状态码：

- 302（默认）
- 301（永久）

---

### 9️⃣ `res.sendFile()`

**发送文件（静态文件）**

```js
res.sendFile("/absolute/path/index.html");
```

⚠️ 必须是**绝对路径**：

```js
import path from "path";

res.sendFile(path.join(process.cwd(), "public/index.html"));
```

---

### 🔟 `res.download()`

**下载文件**

```js
res.download("/path/report.pdf");
res.download("/path/report.pdf", "账单.pdf");
```

浏览器会触发下载行为。



## 七、响应控制 & 状态判断（进阶）

### 1️⃣3️⃣ `res.end()`

**结束响应（底层）**

```js
res.end();
res.end("done");
```

📌 一般不用，除非：

- 写中间件
- 写底层流式处理

---

### 1️⃣4️⃣ `res.headersSent`

**判断响应是否已经发送**

```js
if (res.headersSent) {
  return;
}
```

📌 错误处理中很有用。





## 九、典型接口写法（标准范式）

```js
app.get("/api/user", (req, res) => {
  try {
    res.status(200).json({
      code: 0,
      data: { name: "Tom" },
    });
  } catch (err) {
    res.status(500).json({
      code: 1,
      message: "Server Error",
    });
  }
});
```

📌 推荐规范：

- **所有接口返回 JSON**
- **统一 code / message / data 结构**
- **状态码 + 业务码同时存在**

---

## 十、最容易踩的坑（重点）

### ❌ 1. 重复响应

```js
res.send("a");
res.send("b"); // 报错
```

---

### ❌ 2. 忘记 return

```js
if (!user) {
  res.status(401).json({ msg: "unauthorized" });
}
// 这里还会继续执行
```

✅ 正确：

```js
if (!user) {
  return res.status(401).json({ msg: "unauthorized" });
}
```

---

### ❌ 3. 状态码写在后面

```js
res.json(data).status(200); // ❌ 无效
```

必须先 `status`：

```js
res.status(200).json(data);
```

---

## 十一、你现在应该怎么用？（学习建议）

你现在这个阶段，**优先掌握这 6 个就够了**：

```
res.status
res.json
res.send
res.redirect
res.set
res.cookie
```

等你开始写：

- 登录
- 权限
- 中间件
- 错误处理

再深入 `headersSent / end / sendFile`

