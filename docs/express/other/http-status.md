
## 一、http-status 是什么？解决什么问题

一句话：

> 👉 **`http-status` 是一个“HTTP 状态码语义化工具”，让你用“名字”而不是“魔法数字”。**

### 不用它时（痛点）

```js
res.status(401).json({ message: "Unauthorized" });
res.status(403).json({ message: "Forbidden" });
res.status(500).json({ message: "Server Error" });
```

问题：

* 401 / 403 / 409 / 422 容易写错
* 团队协作可读性差
* 错误码含义记不住

### 用它之后（好处）

```js
res.status(StatusCodes.UNAUTHORIZED)
res.status(StatusCodes.FORBIDDEN)
res.status(StatusCodes.INTERNAL_SERVER_ERROR)
```

✔ 可读性强
✔ 语义明确
✔ 减少状态码错误

---

## 二、安装与最基础使用

```bash
npm install http-status
```

```js
import { StatusCodes, ReasonPhrases } from "http-status";
```

---

## 三、http-status 提供了什么（核心 API）

### 1️⃣ `StatusCodes`（最常用）

```js
StatusCodes.OK                    // 200
StatusCodes.CREATED               // 201
StatusCodes.BAD_REQUEST           // 400
StatusCodes.UNAUTHORIZED           // 401
StatusCodes.FORBIDDEN              // 403
StatusCodes.NOT_FOUND              // 404
StatusCodes.CONFLICT               // 409
StatusCodes.UNPROCESSABLE_ENTITY   // 422
StatusCodes.INTERNAL_SERVER_ERROR  // 500
```

👉 **你 99% 的时间只用这个**

---

### 2️⃣ `ReasonPhrases`（可选）

```js
ReasonPhrases.OK                  // "OK"
ReasonPhrases.BAD_REQUEST         // "Bad Request"
ReasonPhrases.UNAUTHORIZED        // "Unauthorized"
```

用于：

* 统一错误 message
* 日志 / 调试

---

## 四、在 Express 中的标准用法（高频）

### 1️⃣ 成功响应

```js
res.status(StatusCodes.OK).json({
  data: user,
});
```

```js
res.status(StatusCodes.CREATED).json({
  message: "User created",
});
```

---

### 2️⃣ 参数错误（400 / 422）

```js
res.status(StatusCodes.BAD_REQUEST).json({
  message: "Invalid parameters",
});
```

```js
res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
  message: "Validation failed",
  errors,
});
```

> 工程中：
>
> * **格式错** → 400
> * **格式对但业务不通过** → 422

---

### 3️⃣ 鉴权 / 权限错误（面试高频）

```js
// 没登录 / token 无效
res.status(StatusCodes.UNAUTHORIZED).json({
  message: "Please login",
});
```

```js
// 登录了但没权限
res.status(StatusCodes.FORBIDDEN).json({
  message: "No permission",
});
```

---

### 4️⃣ 资源不存在

```js
res.status(StatusCodes.NOT_FOUND).json({
  message: "User not found",
});
```

---

### 5️⃣ 冲突（唯一性校验）

```js
res.status(StatusCodes.CONFLICT).json({
  message: "Email already exists",
});
```

---

### 6️⃣ 服务器错误（统一兜底）

```js
res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
  message: "Server error",
});
```

---

## 五、与 validator / bcrypt / jwt 的“组合用法”（实战）

### 登录接口示例（完整风格）

```js
import { StatusCodes } from "http-status";

app.post("/login", async (req, res) => {
  const user = await db.user.findByEmail(req.body.email);

  if (!user) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      message: "Invalid credentials",
    });
  }

  const ok = await bcrypt.compare(req.body.password, user.passwordHash);
  if (!ok) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      message: "Invalid credentials",
    });
  }

  res.status(StatusCodes.OK).json({ token });
});
```

✔ 状态码一眼就懂
✔ 不用记数字

---

## 六、统一响应封装（工程级推荐）

### 1️⃣ 封装 response 工具

```js
// utils/response.js
import { StatusCodes } from "http-status";

export function success(res, data, status = StatusCodes.OK) {
  return res.status(status).json({ data });
}

export function error(res, message, status) {
  return res.status(status).json({ message });
}
```

---

### 2️⃣ 使用方式

```js
return success(res, user, StatusCodes.CREATED);
```

```js
return error(res, "Unauthorized", StatusCodes.UNAUTHORIZED);
```

---

## 七、统一错误处理中间件（必会）

```js
import { StatusCodes } from "http-status";

app.use((err, req, res, next) => {
  console.error(err);

  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    message: "Internal Server Error",
  });
});
```

---

## 八、http-status vs 直接写数字（真实结论）

| 方式                                     | 是否推荐      |
| -------------------------------------- | --------- |
| `res.status(401)`                      | ❌ 不推荐     |
| `res.sendStatus(401)`                  | ⚠️ 可用但不灵活 |
| `res.status(StatusCodes.UNAUTHORIZED)` | ✅ **最佳**  |

---

## 九、常见坑 & 误区

### ❌ 以为 http-status 会“自动处理错误”

> 它只是常量工具，不是中间件

---

### ❌ 状态码和业务语义乱用

```js
// ❌ 登录失败用 404
res.status(404)
```

✔ 正确：

```js
res.status(StatusCodes.UNAUTHORIZED)
```

---

### ❌ 成功请求返回 201 / 204 乱用

* `200 OK`：查询 / 普通成功
* `201 Created`：新资源创建
* `204 No Content`：成功但无 body

---

## 十、面试高频：你该怎么回答？

**Q：为什么用 http-status？**

> A：为了避免魔法数字，提高代码可读性和可维护性，让 HTTP 状态码的语义更加明确，减少团队协作中的错误。

---

## 十一、常用状态码速记表（你应该熟）

| 场景    | 状态码 |
| ----- | --- |
| 成功    | 200 |
| 创建成功  | 201 |
| 参数错误  | 400 |
| 未登录   | 401 |
| 无权限   | 403 |
| 不存在   | 404 |
| 冲突    | 409 |
| 校验失败  | 422 |
| 服务器错误 | 500 |

---

## 十二、最佳实践总结（记住这 7 条）

1. **永远不要写魔法数字**
2. 使用 `StatusCodes`
3. 鉴权错误区分 401 / 403
4. 参数校验失败优先 422
5. 统一错误出口
6. 状态码 + message 语义一致
7. http-status 是“工具”，不是“框架”

---

### 你现在已经把 Express 的“地基层”学完了：

* dotenv（配置）
* body-parser（请求体）
* validator（参数校验）
* http-status（响应语义）
* bcrypt（密码安全）

👉 **下一步就该“把它们串起来”了。**

如果你愿意，我可以下一条直接带你**从 0 手写一个“企业级 Express 登录 / 注册模块”**，目录结构、错误处理、状态码、校验一次性成体系。你只需要说一句：**“直接上完整实战”**。
