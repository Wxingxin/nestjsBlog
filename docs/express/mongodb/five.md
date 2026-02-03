这个问题问得**非常关键**，下面我**只讲返回值本身**，不绕弯。

> 结论先给你：
> **Mongoose 返回的不是 JSON，也不是 boolean，而是「对象 / 数组 / 特殊结果对象」**

---

## 1️⃣ `find()` 返回什么？

```js
const users = await User.find();
```

### ✅ 返回值

```ts
Document[]   // 文档数组
```

### 实际表现

```js
[
  { _id, username, email, ... },
  { _id, username, email, ... }
]
```

### 关键点

* **一定是数组**
* 没查到 → `[]`
* ❌ **不是 boolean**
* ❌ **不是纯 JSON**

---

## 2️⃣ `findOne()` 返回什么？

```js
const user = await User.findOne({ email });
```

### ✅ 返回值

```ts
Document | null
```

### 实际表现

```js
{ _id, username, email, ... }
// 或
null
```

### 关键点

* 查到 → 一个对象
* 查不到 → `null`
* ❌ **不是 boolean**

---

## 3️⃣ `findById()` 返回什么？

```js
const user = await User.findById(id);
```

### ✅ 返回值

```ts
Document | null
```

和 `findOne()` 完全一致，只是条件不同。

---

## 4️⃣ `select()` 返回什么？

```js
const user = await User.findOne().select("username email");
```

### ✅ 返回值

```ts
Document | null
```

### 说明

* **不会改变返回类型**
* 只是**字段被裁剪**

---

## 5️⃣ `create()` / `save()` 返回什么？

```js
const user = await User.create({ username: "wjx" });
```

```js
const user = await new User({ username: "wjx" }).save();
```

### ✅ 返回值

```ts
Document
```

👉 **保存后的那条数据**

---

## 6️⃣ `updateOne()` / `deleteOne()` 返回什么？

这两个**是最容易误会的**

### `updateOne()`

```js
const res = await User.updateOne({ _id }, { username: "new" });
```

### ✅ 返回值

```ts
{
  acknowledged: true,
  matchedCount: 1,
  modifiedCount: 1
}
```

❌ **不是 boolean**

---

### `deleteOne()`

```js
const res = await User.deleteOne({ _id });
```

### ✅ 返回值

```ts
{
  acknowledged: true,
  deletedCount: 1
}
```

---

## 7️⃣ 那「JSON」到底是什么？

### Mongoose 返回的是：

```ts
Document（带方法、getter、setter）
```

你看到像 JSON，是因为 **console.log 自动帮你展开了**

### 真正变成 JSON 的方式：

```js
doc.toObject()
doc.toJSON()
```

```js
JSON.stringify(doc)
```

---

## 8️⃣ 一张表直接记住

| 方法            | 返回值                |
| ------------- | ------------------ |
| `find()`      | `Document[]`       |
| `findOne()`   | `Document \| null` |
| `findById()`  | `Document \| null` |
| `create()`    | `Document`         |
| `save()`      | `Document`         |
| `updateOne()` | 结果对象               |
| `deleteOne()` | 结果对象               |

---

## 🔥 面试一句话版本（背这个）

> **Mongoose 查询返回的是 Document 或 Document 数组，而不是 JSON；
> 更新和删除返回的是操作结果对象，不是 boolean。**

---

如果你愿意，下一步我可以直接给你：

* `lean()` 后返回值发生了什么变化（⚠️非常重要）
* `exists()` 为啥才是真 boolean
* 如何优雅地把返回值统一成 API Response

你选一个。
