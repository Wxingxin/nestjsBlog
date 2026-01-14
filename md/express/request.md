

## 一、`req` 是什么？（先把概念钉死）

```js
app.get('/api/user', (req, res) => {
  // req = request
});
```

* `req` = **客户端发给服务器的请求对象**
* 基于 **Node.js 原生 `http.IncomingMessage`**
* Express 在其基础上做了大量封装

一句话：

> **req = “客户端带过来的所有信息的集合”**

## 二、最重要的整体分类（先记住）

| 分类       | 对应属性                                  |
| -------- | ------------------------------------- |
| URL 参数   | `req.params`                          |
| Query 参数 | `req.query`                           |
| Body 数据  | `req.body`                            |
| 请求头      | `req.headers` / `req.get()`           |
| Cookie   | `req.cookies`                         |
| Session  | `req.session`                         |
| 请求信息     | `req.method` / `req.url` / `req.path` |
| 客户端信息    | `req.ip` / `req.ips`                  |

---

## 三、最常用（接口 80% 都靠它）

### 1️⃣ `req.params`（路径参数）

```js
app.get('/user/:id', (req, res) => {
  console.log(req.params);
});
```

请求：

```
GET /user/123
```

结果：

```js
{ id: '123' }
```

📌 特点：

* **来自 URL 路径**
* 永远是 **字符串**

---

### 2️⃣ `req.query`（查询参数）

```js
// GET /search?keyword=js&page=2
req.query
```

结果：

```js
{
  keyword: 'js',
  page: '2'
}
```

📌 知识点：

* 也是 **字符串**
* 需要你手动转类型

```js
const page = Number(req.query.page);
```

---

### 3️⃣ `req.body`（请求体）

⚠️ **必须先有中间件**

```js
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
```

使用：

```js
req.body
```

常见来源：

* POST / PUT / PATCH
* JSON / form 表单

📌 示例：

```js
POST /login
{
  "username": "tom",
  "password": "123"
}
```

```js
req.body = {
  username: 'tom',
  password: '123'
}
```

---

## 四、请求头相关（进阶但很重要）

### 4️⃣ `req.headers`

```js
req.headers
```

示例：

```js
{
  host: 'localhost:3000',
  'user-agent': 'Mozilla/5.0',
  authorization: 'Bearer xxx'
}
```

📌 注意：

* **全部是小写**
* 不推荐直接访问

---

### 5️⃣ `req.get()` / `req.header()`

**推荐方式**

```js
req.get('Authorization');
req.get('User-Agent');
```

---

## 五、请求方法 & 路径信息

### 6️⃣ `req.method`

```js
req.method; // GET / POST / PUT / DELETE
```

---

### 7️⃣ `req.url` vs `req.path` vs `req.originalUrl`

```js
req.url         // /api/user?id=1
req.path        // /api/user
req.originalUrl // 路由前的完整路径
```

📌 区别重点在 **中间件/路由拆分** 时才明显。

---

### 8️⃣ `req.baseUrl`

```js
app.use('/api', router);

router.get('/user', (req, res) => {
  req.baseUrl; // /api
});
```

---

## 六、Cookie & Session（认证必学）

### 9️⃣ `req.cookies`

⚠️ 需要中间件：

```js
import cookieParser from 'cookie-parser';
app.use(cookieParser());
```

使用：

```js
req.cookies.token;
```

---

### 🔟 `req.signedCookies`

```js
req.signedCookies.token;
```

用于 **防篡改 Cookie**

---

### 1️⃣1️⃣ `req.session`

⚠️ 需要 `express-session`

```js
req.session.user = { id: 1 };
```

---

## 七、客户端 & 网络信息

### 1️⃣2️⃣ `req.ip`

```js
req.ip;
```

📌 真实项目中：

* 需要 `trust proxy` 才准确

```js
app.set('trust proxy', true);
```

---

### 1️⃣3️⃣ `req.ips`

```js
req.ips; // 代理链 IP 数组
```

---

### 1️⃣4️⃣ `req.hostname`

```js
req.hostname;
```

---

### 1️⃣5️⃣ `req.protocol`

```js
req.protocol; // http / https
```

---

## 八、内容类型 & 请求判断

### 1️⃣6️⃣ `req.is()`

**判断请求体类型**

```js
req.is('json'); // true / false
req.is('html');
req.is('multipart/form-data');
```

---

### 1️⃣7️⃣ `req.xhr`

```js
req.xhr; // 是否 AJAX 请求
```

---

## 九、原生 Node 能力（底层）

`req` 仍然是 `IncomingMessage`：

```js
req.on('data', chunk => {});
req.on('end', () => {});
```

📌 Express 项目 **几乎不用**，了解即可。

---

## 十、典型接口使用范式（强烈推荐）

```js
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username) {
    return res.status(400).json({ msg: 'username required' });
  }

  res.json({ ok: true });
});
```

---

## 十一、最容易踩的坑（重点）

### ❌ 1. `req.body` 是 undefined

👉 **没加中间件**

```js
app.use(express.json());
```

---

### ❌ 2. 以为 query / params 是数字

```js
req.query.page + 1 // ❌ 字符串拼接
```

必须：

```js
Number(req.query.page) + 1
```

---

### ❌ 3. Header 大小写问题

```js
req.headers.Authorization // ❌
req.get('Authorization')  // ✅
```

---

## 十二、学习顺序建议（给你一个路线）

你现在这个阶段，**优先精通这 7 个**：

```
req.params
req.query
req.body
req.method
req.get
req.cookies
req.ip
```

下一步再进阶：

* 登录鉴权
* 中间件
* API 规范
* NestJS Request 对比

---

如果你愿意，我可以下一步直接给你：

* ✅ **req + res 全流程图（一次请求发生了什么）**
* ✅ **Express 中间件执行顺序详解**
* ✅ **接口参数校验最佳实践（zod / joi）**
* ✅ **Express vs Koa vs NestJS 对比**

你选一个，我继续往深处带你 💪
