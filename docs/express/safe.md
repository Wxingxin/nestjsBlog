## express-mongo-sanitize

`npm i express-mongo-sanitize`

```js
const mongoSanitize = require("express-mongo-sanitize");

app.use(mongoSanitize());
```

## express-xss-sanitizer

`npm i express-xss-sanitizer`

```js
const { xss } = require("express-xss-sanitizer");

app.use(xss());
```

## cors

`npm i cors`

```js
const cors = require("cors");

app.use(cors());
```

## helmet

`npm i helmet`

```js
import helmet from "helmet";

const app = express();

app.use(helmet());
```

# 一、express-rate-limit 是什么（一句话）

> **express-rate-limit = 基于请求频率的限流中间件**

它解决的是：

- ❌ 暴力请求
- ❌ 刷接口
- ❌ 简单 DoS
- ❌ 登录撞库（基础版）

⚠️ 重要定位：

> **它只做“频率控制”，不做智能判断**

---

# 二、什么时候“必须”用？

如果你的 Express 项目满足任意一条：

- 🌐 公网 API
- 🔐 登录 / 注册接口
- 🔍 搜索接口
- 📩 发送短信 / 邮件
- 💳 贵接口（消耗资源）

👉 **一定要用**

---

# 三、安装 & 最小可用（入门）

### 1️⃣ 安装

```bash
npm install express-rate-limit
```

---

### 2️⃣ 最简单用法（全局）

```js
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 每个 IP 100 次
});

app.use(limiter);
```

⚠️ **新手不推荐全局直接用**，继续看下面。

---

# 四、真实项目中的正确用法（重点）

## ✅ 1️⃣ 按「接口类型」拆 limiter（非常重要）

### 登录接口（最严格）

```js
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});
```

```js
app.post("/login", loginLimiter, loginController);
```

---

### 注册接口

```js
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
});
```

---

### 公共 API（搜索 / 列表）

```js
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
});
```

---

## ❌ 反例（常见错误）

```js
app.use(rateLimit({ max: 100 }));
```

问题：

- 登录不够严
- 搜索被误伤
- 内部接口也被限制

---

# 五、生产必开的关键配置项

```js
rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,

  standardHeaders: true, // 返回 RateLimit-* 头
  legacyHeaders: false, // 关闭 X-RateLimit-*
});
```

为什么？

- 兼容标准
- 前端可感知剩余次数

---

# 六、自定义 key（高级但常用）

默认是 **IP**，你可以改。

### 按用户 ID 限流（登录后）

```js
rateLimit({
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
});
```

👉 **登录后比 IP 更准**

---

### 按 IP + 路径

```js
keyGenerator: (req) => `${req.ip}:${req.path}`;
```

---

# 七、自定义超限返回（用户体验）

```js
rateLimit({
  handler: (req, res) => {
    res.status(429).json({
      message: "Too many requests, try again later",
    });
  },
});
```

---

# 八、在代理 / 云服务器下的坑（必看）

如果你在：

- Nginx
- Cloudflare
- Vercel
- Docker

👉 **必须设置：**

```js
app.set("trust proxy", 1);
```

否则：

- 所有用户共享一个 IP
- 限流直接失效

---

# 九、持久化存储（生产必做）

默认内存存储：

- ❌ 重启即失效
- ❌ 多实例不共享

### 用 Redis（推荐）

```bash
npm install rate-limit-redis ioredis
```

```js
import Redis from "ioredis";
import RedisStore from "rate-limit-redis";

const redis = new Redis();

const limiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
  }),
  windowMs: 15 * 60 * 1000,
  max: 100,
});
```

---

# 十、和 JWT / validator 的正确顺序

**顺序很重要：**

```
请求
 ↓
rate-limit     👈 最前
 ↓
validator
 ↓
jwt 校验
 ↓
controller
```

原因：

- 便宜的先执行
- 防刷先挡

---

# 十一、express-rate-limit 的能力边界（必须清醒）

它 **做不到**：

- ❌ Bot 行为分析
- ❌ 设备指纹
- ❌ 智能风控
- ❌ 分布式攻击判断

👉 这正是 Arcjet / Cloudflare 的领域。

---

# 十二、真实项目推荐组合（黄金搭配）

```txt
helmet
cors
express-rate-limit
validator
bcrypt
jsonwebtoken
```

👉 **80% 项目已经足够安全**

---

# 十三、一句话总结（你记住这个）

> **express-rate-limit 是“地基级安全”，
> 不是高级智能防护，但一定要有。**

---

## 下一步我可以继续带你：

1️⃣ **给你一份「生产级 Express 安全中间件完整模板」**
2️⃣ **模拟一次 API 被刷，调参数看效果**
3️⃣ **把 express-rate-limit + Redis + JWT 整合成完整架构**

你选一个，我继续。
