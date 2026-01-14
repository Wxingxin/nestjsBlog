下面我从 **Express 中 `response`（即 `res`）对象的定位 → 核心属性 → 常用方法 → 响应控制细节 → 易错点与最佳实践** 五个层面，系统性地给你一份 **`res` 属性与知识点大全**。内容以 **Express 4/5 主流用法** 为准，适合面试与实际项目使用。

---

## 一、`response (res)` 是什么

在 Express 中：

```js
(req, res) => {}
```

* `req`：请求对象（Request）
* `res`：响应对象（Response）

### 本质

* `res` **继承自 Node.js 的 `http.ServerResponse`**
* Express 在其基础上 **封装了大量更友好的方法**

👉 所有 Express 响应，最终都会通过 `res` 发给客户端。

---

## 二、`res` 的核心属性（不常直接修改，但必须理解）

### 1️⃣ `res.statusCode`

* 当前 HTTP 状态码
* 默认：`200`

```js
res.statusCode = 404;
res.end();
```

⚠️ 实际项目 **不推荐直接改**，而是用 `res.status()`

---

### 2️⃣ `res.headersSent`

* 是否已经发送响应头
* 常用于 **防止重复响应**

```js
if (res.headersSent) return;
```

📌 在错误处理中非常重要

---

### 3️⃣ `res.socket`

* 底层 TCP Socket
* 极少直接使用（偏底层）

---

## 三、最重要：`res` 的方法大全（🔥重点）

### 🔹 1. 状态码相关

#### `res.status(code)`

设置 HTTP 状态码（可链式）

```js
res.status(404).send('Not Found');
```

---

### 🔹 2. 响应体发送（最常用）

#### ✅ `res.send(body)`（万能）

| 类型             | 行为      |
| -------------- | ------- |
| string         | 发送字符串   |
| object / array | 自动 JSON |
| Buffer         | 二进制     |
| number         | 作为字符串   |

```js
res.send('hello');
res.send({ name: 'wjx' });
res.send([1, 2, 3]);
```

📌 **自动设置 `Content-Type`**

---

#### ✅ `res.json(data)`（推荐 API 使用）

```js
res.json({
  code: 0,
  msg: 'success',
  data: {}
});
```

* 等价于：

```js
res.set('Content-Type', 'application/json');
res.send(JSON.stringify(data));
```

✔️ API 项目首选

---

#### ⚠️ `res.end()`

* Node 原生方法
* 直接结束响应

```js
res.end('ok');
```

❌ Express 中 **几乎不用**

---

### 🔹 3. Header 相关

#### `res.set(field, value)`

#### `res.set(object)`

```js
res.set('X-Powered-By', 'Express');
res.set({
  'Cache-Control': 'no-cache',
  'X-Test': '123'
});
```

---

#### `res.get(field)`

获取响应头（较少用）

```js
res.get('Content-Type');
```

---

#### `res.type(type)`

设置 `Content-Type`

```js
res.type('json');   // application/json
res.type('html');   // text/html
```

---

### 🔹 4. 重定向

#### `res.redirect([status], path)`

```js
res.redirect('/login');
res.redirect(301, '/new-url');
```

常见场景：

* 登录态失效
* 页面跳转

---

### 🔹 5. 文件与流

#### `res.sendFile(path, options)`

发送文件（**绝对路径**）

```js
res.sendFile('/Users/wjx/test/a.png');
```

📌 常用于：

* 下载
* 图片 / PDF

---

#### `res.download(path, filename)`

强制下载

```js
res.download('./file.zip', 'myfile.zip');
```

---

### 🔹 6. 模板渲染（SSR）

#### `res.render(view, locals)`

```js
res.render('index', { title: 'Home' });
```

前提：

```js
app.set('view engine', 'ejs');
```

---

### 🔹 7. Cookie 相关（⚠️重要）

#### `res.cookie(name, value, options)`

```js
res.cookie('token', 'abc123', {
  httpOnly: true,
  maxAge: 1000 * 60 * 60,
  sameSite: 'lax'
});
```

---

#### `res.clearCookie(name)`

```js
res.clearCookie('token');
```

📌 与 JWT / 登录态强相关

---

### 🔹 8. 响应头快捷方法

#### `res.append(field, value)`

追加响应头

```js
res.append('Set-Cookie', 'a=1');
```

---

#### `res.location(path)`

设置 `Location` 响应头

```js
res.location('/login');
```

---

### 🔹 9. 内容协商（进阶）

#### `res.format(object)`

```js
res.format({
  'application/json': () => res.json({}),
  'text/html': () => res.send('<h1>Hello</h1>'),
  default: () => res.status(406).send('Not Acceptable')
});
```

---

## 四、响应流程与关键知识点（面试高频）

### 1️⃣ 一个请求只能响应一次

❌ 错误示例：

```js
res.send('ok');
res.send('again'); // 报错
```

✔️ 解决：

```js
return res.send('ok');
```

---

### 2️⃣ `res.send()` 内部做了什么

* 设置状态码（若未设置）
* 自动设置 Content-Type
* 调用 `res.end()`

👉 所以 **send = 完整响应**

---

### 3️⃣ 中间件中对 `res` 的影响

```js
app.use((req, res, next) => {
  res.set('X-App', 'demo');
  next();
});
```

* 响应头会传递到后续

---

### 4️⃣ 错误处理中使用 `res`

```js
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  res.status(500).json({
    msg: err.message
  });
});
```

---

## 五、常见错误 & 最佳实践

### ❌ 常见错误

1. 忘记 `return`
2. 多次 `res.send`
3. `sendFile` 使用相对路径
4. headers 已发送仍修改状态码
5. API 返回格式不统一

---

### ✅ 最佳实践（API 项目）

```js
res.status(200).json({
  code: 0,
  message: 'success',
  data
});
```

错误统一：

```js
res.status(400).json({
  code: 40001,
  message: '参数错误'
});
```

---

## 六、`res` 方法速查表（总结）

| 分类     | 方法                       |
| ------ | ------------------------ |
| 状态     | `status`                 |
| 数据     | `send` / `json`          |
| Header | `set` / `get` / `type`   |
| 跳转     | `redirect`               |
| 文件     | `sendFile` / `download`  |
| Cookie | `cookie` / `clearCookie` |
| 模板     | `render`                 |
| 进阶     | `format`                 |

---

如果你愿意，下一步我可以直接给你：

* **Express `res` 面试题 20 题（含答案）**
* **`res.send` vs `res.json` 深度对比**
* **`res` + JWT / Cookie 的完整实战示例**
* **结合你现在在用的 NestJS，对比 Express Response**

你选一个方向即可。
