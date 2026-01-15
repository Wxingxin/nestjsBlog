下面给你一套**可直接复制进 Express 项目**的 morgan + winston 组合方案，包含清晰的**目录放置位置**、**每个文件的完整代码**、以及如何在入口文件里接入。

我给的是 **CommonJS（require）版本**，在 Node/Express 项目里兼容性最好；如果你项目是 ESM（import）或 TypeScript，后面我也给了极简改法。

---

## 目录结构（建议放置位置）

假设你的项目结构如下（没有 `src/` 也可以，把 `src/` 去掉即可）：

```
your-project/
  package.json
  logs/                     # 运行后自动创建（无需手动建）
  src/
    app.js                  # Express app（中间件、路由）
    server.js               # 启动监听端口
    config/
      logger.js             # winston 配置（统一出口）
    middleware/
      requestId.js          # 给每个请求注入 requestId
      httpLogger.js         # morgan + winston 的组合中间件
    routes/
      index.js              # 示例路由（可选）
```

---

## 1) `src/config/logger.js`（Winston 统一配置）

```js
// src/config/logger.js
const fs = require("node:fs");
const path = require("node:path");
const winston = require("winston");

const isProd = process.env.NODE_ENV === "production";

// 确保 logs 目录存在（生产写文件时用）
const logDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const transports = [
  new winston.transports.Console({
    level: isProd ? "info" : "debug",
  }),
];

// 生产环境写文件（你也可以在开发环境也写文件）
if (isProd) {
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, "app.log"),
      level: "info",
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    })
  );

  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    })
  );
}

const logger = winston.createLogger({
  level: isProd ? "info" : "debug",
  format: logFormat,
  defaultMeta: { service: process.env.SERVICE_NAME || "express-app" },
  transports,
});

module.exports = logger;
```

---

## 2) `src/middleware/requestId.js`（请求 ID 中间件）

用于把 `requestId` 写到 `req.requestId` 和响应头 `X-Request-Id`，方便链路追踪。

```js
// src/middleware/requestId.js
const crypto = require("node:crypto");

function requestId(req, res, next) {
  const rid =
    (crypto.randomUUID && crypto.randomUUID()) ||
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  req.requestId = rid;
  res.setHeader("X-Request-Id", rid);
  next();
}

module.exports = requestId;
```

---

## 3) `src/middleware/httpLogger.js`（Morgan + Winston 组合核心）

- Morgan 负责提取 HTTP 访问日志字段
- Winston 负责统一输出（控制台 / 文件 / 日志系统）
- 默认：**400+ 记 warn，500+ 记 error，其余 info**
- 支持 `trust proxy` 后记录真实 IP

```js
// src/middleware/httpLogger.js
const morgan = require("morgan");
const logger = require("../config/logger");

function buildHttpLogger() {
  // 自定义 token：requestId
  morgan.token("rid", (req) => req.requestId || "-");

  // 自定义 token：客户端 IP（配合 app.set('trust proxy', true)）
  morgan.token(
    "client-ip",
    (req) => req.ip || req.connection?.remoteAddress || "-"
  );

  // 自定义 token：安全 URL（可在这里做脱敏）
  morgan.token("safe-url", (req) => {
    // 这里做一个简单示例：把 token=xxx 脱敏
    // 你也可以按需扩展更多参数脱敏
    const original = req.originalUrl || req.url || "";
    try {
      const u = new URL(original, "http://localhost");
      const sensitiveKeys = ["token", "access_token", "password"];
      for (const k of sensitiveKeys) {
        if (u.searchParams.has(k)) u.searchParams.set(k, "[REDACTED]");
      }
      return u.pathname + (u.search ? u.search : "");
    } catch {
      return original;
    }
  });

  // 采用 function 形式，方便按状态码分级写入 winston
  const formatFn = (tokens, req, res) => {
    const status = Number(tokens.status(req, res));
    const payload = {
      type: "http_access",
      rid: tokens.rid(req, res),
      ip: tokens["client-ip"](req, res),
      method: tokens.method(req, res),
      url: tokens["safe-url"](req, res),
      status,
      contentLength: tokens.res(req, res, "content-length"),
      responseTimeMs: Number(tokens["response-time"](req, res)),
      referrer: tokens.referrer(req, res),
      userAgent: tokens["user-agent"](req, res),
    };

    // Winston 写入 JSON：把 payload 序列化为字符串，写入 message
    // 同时把 payload 也作为 meta（便于某些 transport 结构化处理）
    return JSON.stringify(payload);
  };

  return morgan(formatFn, {
    stream: {
      write: (message) => {
        // message 是一行字符串（包含 JSON），我们这里 parse 后按状态码分级写
        const line = message.trim();
        if (!line) return;

        let obj;
        try {
          obj = JSON.parse(line);
        } catch {
          // 解析失败则按普通字符串写
          logger.info(line);
          return;
        }

        const status = Number(obj.status || 0);
        if (status >= 500)
          logger.error("HTTP %s %s %s", obj.method, obj.url, obj.status, obj);
        else if (status >= 400)
          logger.warn("HTTP %s %s %s", obj.method, obj.url, obj.status, obj);
        else logger.info("HTTP %s %s %s", obj.method, obj.url, obj.status, obj);
      },
    },

    // 跳过一些噪音接口（按需改）
    skip: (req, res) => {
      if (req.path === "/health") return true;
      return false;
    },
  });
}

module.exports = buildHttpLogger;
```

---

## 4) `src/routes/index.js`（示例路由，可选）

```js
// src/routes/index.js
const express = require("express");
const router = express.Router();

router.get("/health", (req, res) => res.send("ok"));

router.get("/ping", (req, res) => {
  res.json({ ok: true, requestId: req.requestId });
});

router.get("/error", (req, res) => {
  // 测试 500 日志
  throw new Error("boom");
});

module.exports = router;
```

---

## 5) `src/app.js`（把中间件放到正确顺序）

注意顺序：`trust proxy`（如需要）→ `requestId` → `httpLogger` → 路由 → error handler

```js
// src/app.js
const express = require("express");
const requestId = require("./middleware/requestId");
const buildHttpLogger = require("./middleware/httpLogger");
const logger = require("./config/logger");
const routes = require("./routes");

const app = express();

// 如果你有 Nginx/Cloudflare/反向代理，建议开启
app.set("trust proxy", true);

app.use(express.json());

// requestId 要在 httpLogger 之前
app.use(requestId);

// morgan + winston 组合访问日志
app.use(buildHttpLogger());

// 路由
app.use("/", routes);

// 统一错误处理（错误日志走 winston）
app.use((err, req, res, next) => {
  logger.error("Unhandled error", {
    rid: req.requestId,
    path: req.path,
    message: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    message: "Internal Server Error",
    requestId: req.requestId,
  });
});

module.exports = app;
```

---

## 6) `src/server.js`（启动入口）

```js
// src/server.js
const app = require("./app");
const logger = require("./config/logger");

const port = process.env.PORT || 3000;

app.listen(port, () => {
  logger.info("Server started on port %s", port);
});
```

---

## 7) `package.json` 启动脚本（建议）

```json
{
  "scripts": {
    "dev": "NODE_ENV=development node src/server.js",
    "start": "NODE_ENV=production node src/server.js"
  }
}
```

Windows（PowerShell）可用 cross-env：

```bash
npm i -D cross-env
```

```json
{
  "scripts": {
    "dev": "cross-env NODE_ENV=development node src/server.js",
    "start": "cross-env NODE_ENV=production node src/server.js"
  }
}
```

---

## 8) 运行与验证

1. 安装依赖：

```bash
npm i express morgan winston
```

2. 启动：

```bash
npm run dev
```

3. 打请求：

- `GET /ping` 应该输出 info
- `GET /error` 应该输出 error，并返回 500 JSON（带 requestId）
- `GET /health` 默认被 skip（可改）

---

## ESM（import）项目怎么改（最少修改点）

如果你项目是 `"type":"module"`：

- `require` 改 `import`
- `module.exports` 改 `export default`
- `__dirname`/路径处理要用 `import.meta.url`（本方案里我用了 `process.cwd()`，所以问题不大）

如果你告诉我你项目是：

1. CommonJS 还是 ESM
2. 是否 TypeScript
3. 你想访问日志写到 `access.log`（单独文件）还是都进 `app.log`

我可以把这套代码进一步“对齐你的栈”，给你最终版本（不需要你再手动改任何 import/export）。
