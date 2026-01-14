

# 一、HTTP Response Status 是什么（一句话）

> **response.status 是服务器告诉客户端：这次请求“结果如何”的标准化信号**

它不是给人看的，是给：

* 前端
* 客户端程序
* 网关 / 代理
* 自动化系统

---

# 二、状态码的五大类（必须秒懂）



👉 **99% 项目用的是 2xx / 4xx / 5xx**

---

# 三、2xx —— 成功类（重点）

## ✅ 200 OK（最常见）

**含义**

* 请求成功
* 返回了“你要的东西”

**常见场景**

* 查询列表
* 获取详情
* 普通接口成功

```http
GET /users/1
→ 200 OK
```

⚠️ **注意**

* 不要滥用 200 包装错误（新手大坑）

---

## ✅ 201 Created（创建成功）

**含义**

* 成功创建了一个资源

**使用场景**

* POST 新增数据

```http
POST /users
→ 201 Created
```

📌 **最佳实践**

* response body 返回新资源
* response header 可带 `Location`

---

## ✅ 204 No Content

**含义**

* 成功了，但**没有返回内容**

**典型场景**

* 删除成功
* 更新成功但不需要返回数据

```http
DELETE /users/1
→ 204 No Content
```

⚠️ **规则**

* 204 **不能有 response body**

---

# 四、3xx —— 重定向（了解即可）

## 🔁 301 / 302

* 301：永久重定向
* 302：临时重定向

后端 API 很少用，主要用于：

* 网站跳转
* OAuth 登录

---

# 五、4xx —— 客户端错误（超级重点）

## ❌ 400 Bad Request

**含义**

* 请求格式不对 / 参数错误

**常见原因**

* 参数缺失
* 参数类型错误
* JSON 解析失败

```http
POST /login
→ 400 Bad Request
```

👉 **不是鉴权问题！**

---

## ❌ 401 Unauthorized

**含义**

* **没登录 / token 无效**

**典型场景**

* token 不存在
* token 过期
* token 校验失败

```http
GET /profile
→ 401 Unauthorized
```

⚠️ **关键区分**

* 401 = 你是谁我不知道

---

## ❌ 403 Forbidden

**含义**

* 登录了，但**没权限**

```http
DELETE /admin/user/1
→ 403 Forbidden
```

⚠️ **区分**

* 401：没登录
* 403：登录了但不能干这个

---

## ❌ 404 Not Found

**含义**

* 资源不存在

**使用场景**

* id 不存在
* 路由不存在

```http
GET /users/999
→ 404 Not Found
```

📌 **工程建议**

* 不要用 200 + “not found”

---

## ❌ 409 Conflict

**含义**

* 资源冲突

**经典场景**

* 用户名已存在
* 重复创建
* 幂等冲突

```http
POST /users
→ 409 Conflict
```

---

## ❌ 422 Unprocessable Entity（非常推荐）

**含义**

* 请求格式对
* 语法对
* **业务校验失败**

**非常适合**

* 表单校验
* 业务规则不满足

```http
POST /register
→ 422 Unprocessable Entity
```

📌 **比 400 更专业**

---

# 六、5xx —— 服务端错误（后端的锅）

## 💥 500 Internal Server Error

**含义**

* 服务器内部异常

**原因**

* 代码 bug
* 未捕获异常
* null pointer

⚠️ **不要把业务错误丢给 500**

---

## 💥 502 Bad Gateway

**含义**

* 上游服务返回异常

**常见**

* 网关 → 后端
* LLM API 调用失败

---

## 💥 503 Service Unavailable

**含义**

* 服务暂时不可用

**场景**

* 服务器维护
* 过载
* LLM 模型未就绪

---

# 七、Express / Nest 中的标准用法

## Express

```js
res.status(200).json({ data })
res.status(201).json({ id })
res.status(204).end()
res.status(401).json({ message: 'Unauthorized' })
```

---

## NestJS（推荐）

```ts
throw new BadRequestException('参数错误');
throw new UnauthorizedException();
throw new ForbiddenException();
throw new NotFoundException();
```

📌 Nest 内置状态码映射，非常优雅

---

# 八、状态码设计的 5 条铁律（必记）

1. **状态码表达“结果”，body 表达“细节”**
2. **不要用 200 包装错误**
3. **401 ≠ 403**
4. **参数问题用 400 / 422**
5. **服务端异常才用 5xx**

---

# 九、和你当前 LLM / API 学习强相关的例子

## LLM API 推荐设计

| 场景          | 状态码 |
| ----------- | --- |
| Prompt 参数错误 | 400 |
| Token 无效    | 401 |
| 超出配额        | 403 |
| 模型不存在       | 404 |
| LLM 超时      | 503 |
| LLM 内部异常    | 502 |

---

如果你愿意，下一步我可以直接帮你做三件事之一（你选）：

1️⃣ **Express / Nest 状态码设计实战（含错误中间件）**
2️⃣ **给你一份“后端状态码速查表（可打印）”**
3️⃣ **结合 LLM API，设计一套标准 REST response 规范**

你回我 **1 / 2 / 3**。
