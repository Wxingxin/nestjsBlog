下面我按**最基础、最标准、最适合初学到中级 Express 项目**的方式，分两步说明 **Express + 本地 MongoDB 的结合使用**。示例基于 **mongoose**（这是 Express 项目中事实标准方案）。

---

## 一、第一步：Express 项目中连接本地 MongoDB

### 1. 安装依赖

```bash
npm init -y
npm install express mongoose
```

如果你习惯使用环境变量（强烈推荐）：

```bash
npm install dotenv
```

---

### 2. 本地 MongoDB 前置条件

确保你已经：

* 安装 MongoDB Community Server
* 启动了 MongoDB 服务
* 默认监听端口：`27017`

本地连接地址通常是：

```
mongodb://127.0.0.1:27017/数据库名
```

---

### 3. 项目基础结构（推荐）

```text
project/
├─ src/
│  ├─ app.js
│  ├─ server.js
│  ├─ config/
│  │  └─ db.js
│  ├─ models/
│  └─ routes/
├─ .env
└─ package.json
```

---

### 4. 配置 MongoDB 连接（src/config/db.js）

```js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: 'test_db'
    });

    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
```

---

### 5. 环境变量（.env）

```env
PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017
```

---

### 6. Express 初始化（src/app.js）

```js
const express = require('express');

const app = express();

// 解析 JSON
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Express + MongoDB is running');
});

module.exports = app;
```

---

### 7. 启动入口（src/server.js）

```js
require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 4000;

(async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
})();
```

到这里为止，你已经完成了：

* Express 项目初始化
* 本地 MongoDB 成功连接
* 服务启动时自动连接数据库

---

## 二、第二步：在 Express 中定义需要的数据（Schema / Model）

> **核心概念**
>
> * MongoDB：文档型数据库
> * Mongoose：用 Schema 约束 MongoDB 的“结构”

---

### 1. 定义一个数据模型（User 示例）

**src/models/User.js**

```js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true,
      select: false
    },
    age: {
      type: Number,
      min: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('User', userSchema);
```

### Schema 常用字段说明

| 字段              | 作用                           |
| --------------- | ---------------------------- |
| `type`          | 字段类型                         |
| `required`      | 必填                           |
| `unique`        | 唯一索引                         |
| `default`       | 默认值                          |
| `select: false` | 查询时默认不返回                     |
| `timestamps`    | 自动生成 `createdAt / updatedAt` |

---

### 2. 在路由中使用 Model（CRUD 示例）

**src/routes/user.routes.js**

```js
const express = require('express');
const User = require('../models/User');

const router = express.Router();

// 创建用户
router.post('/', async (req, res) => {
  const user = await User.create(req.body);
  res.status(201).json(user);
});

// 获取用户列表
router.get('/', async (req, res) => {
  const users = await User.find();
  res.json(users);
});

// 获取单个用户
router.get('/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  res.json(user);
});

// 更新用户
router.put('/:id', async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );
  res.json(user);
});

// 删除用户
router.delete('/:id', async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

module.exports = router;
```

---

### 3. 注册路由（src/app.js）

```js
const userRoutes = require('./routes/user.routes');

app.use('/api/users', userRoutes);
```

---

## 三、Express + MongoDB 的核心认知（很重要）

### 1. Express 不“操作数据库”

Express 只做三件事：

* 接收请求
* 调用 Model
* 返回响应

真正操作 MongoDB 的是 **Mongoose Model**。

---

### 2. Model = 数据层核心

```text
Route → Controller → Model → MongoDB
```

你后面做的所有功能（登录、JWT、权限、后台系统）都会围绕 Model 展开。

---

### 3. 实际项目必然进阶到

后续你一定会继续用到：

* bcrypt（密码加密）
* JWT（鉴权）
* mongoose middleware（`pre / post`）
* mongoose populate（关联查询）
* 索引优化
* 事务（session）

---

## 四、下一步你可以继续做什么

如果你愿意，我可以**直接接着你现在的进度继续**：

1. Express + MongoDB **用户注册 / 登录完整流程**
2. User Schema + bcrypt + JWT 实战
3. Model 拆 Controller（企业级结构）
4. mongoose 常见坑和性能问题
5. 结合你现在的 React / Next 前端做完整对接

你可以直接告诉我：
👉「下一步我想做登录鉴权」或「我想结构写得像真实项目」
