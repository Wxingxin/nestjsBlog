下面给你一份「Express 项目 Dockerfile 常见配置大全 + 对应知识点」，按真实项目最常见的几类场景来组织。你可以直接复制改路径即可用。

---

## 1）最常见：Node + Express 生产镜像（推荐，多阶段构建）

适用：Express + npm/yarn/pnpm，最终镜像尽量小、只带生产依赖。

```dockerfile
# syntax=docker/dockerfile:1

########## 1) Build stage ##########
FROM node:20-alpine AS builder
WORKDIR /app

# 只拷贝依赖清单，最大化利用缓存
COPY package*.json ./

# 生产建议用 npm ci（更可复现）；如果没有 package-lock.json 就用 npm i
RUN npm ci

# 拷贝源码
COPY . .

# 如果你有构建步骤（TypeScript / Babel），在这里做
# RUN npm run build

########## 2) Runtime stage ##########
FROM node:20-alpine AS runner
WORKDIR /app

# 只复制运行所需内容：node_modules、源码、构建产物（如果有）
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app ./

# 生产常用环境变量
ENV NODE_ENV=production

# 容器对外暴露的端口（只是声明，真正映射在 docker run / compose）
EXPOSE 4000

# 推荐：用 npm script，便于统一管理
CMD ["npm", "run", "start"]
```

### 关键知识点

* **多阶段构建（builder/runner）**：把安装依赖、构建放在 builder，runner 只保留运行所需内容，镜像更小更安全。
* **COPY package*.json -> RUN npm ci -> COPY .**：这是 Docker 缓存的核心套路。依赖没变时不会重复安装。
* **npm ci vs npm install**：有 lock 文件时用 `npm ci` 更稳定、可复现。
* **EXPOSE**：只是“声明端口”，实际映射用 `-p 4000:4000` 或 compose ports。
* **NODE_ENV=production**：影响 Express、日志、依赖安装策略（生产镜像通常只安装生产依赖）。

---

## 2）Express + TypeScript（构建产物 dist/，运行更干净）

适用：TS 项目，生产只运行编译后的 JS。

```dockerfile
# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build   # 输出到 dist/

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# 只装生产依赖（更小）
COPY package*.json ./
RUN npm ci --omit=dev

# 只复制 dist 和必要文件
COPY --from=builder /app/dist ./dist

EXPOSE 4000
CMD ["node", "dist/index.js"]
```

### 关键知识点

* **生产不带 devDependencies**：`npm ci --omit=dev`（等价过去的 `--only=production`，新版本推荐 omit）。
* **只复制 dist**：避免把源码、测试、配置文件全部带进生产镜像。

---

## 3）开发环境 Dockerfile（带热更新，配合 volumes）

适用：本地开发，用 nodemon / ts-node-dev，代码改了自动重启。

```dockerfile
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install

# 开发环境通常会用 volume 覆盖源码，所以这里只放默认
COPY . .

ENV NODE_ENV=development
EXPOSE 4000
CMD ["npm", "run", "dev"]
```

### 关键知识点

* **开发镜像不要追求最小**：追求的是迭代速度。
* **配合 docker-compose volumes**：把宿主机代码挂进去；node_modules 通常留在容器里，避免宿主系统差异导致原生依赖问题。

---

## 4）.dockerignore（强烈建议必须有）

没有它，你的镜像会又大又慢，还可能把敏感信息打进去。

**.dockerignore 常见写法：**

```gitignore
node_modules
npm-debug.log
yarn-error.log
.pnpm-store

.git
.gitignore

Dockerfile
docker-compose.yml

.env
.env.*
dist
coverage
*.md
```

### 关键知识点

* **node_modules 不要 COPY 进去**：应该在镜像里安装依赖，否则容易跨平台/架构问题。
* **.env 不要进镜像**：用运行时环境变量注入（compose 的 env_file / environment，或 docker run -e）。

---

## 5）用户权限与安全（生产建议加）

默认 root 跑 Node 不理想，常见做法：使用 node 用户。

```dockerfile
FROM node:20-alpine
WORKDIR /app

# 先复制并安装
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
ENV NODE_ENV=production
EXPOSE 4000

# 切换为非 root 用户（node 镜像自带 node 用户）
USER node

CMD ["node", "index.js"]
```

### 关键知识点

* **最小权限原则**：降低容器被利用后的风险面。
* 注意：切换用户后要确保文件权限允许读取/执行。

---

## 6）常见的环境变量与端口写法（Express 端要配合）

你的 Express 代码里建议这样写端口：

```js
const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0');
```

### 关键知识点

* **必须监听 0.0.0.0**：容器里如果只监听 127.0.0.1，会导致外部无法访问。
* **PORT 用环境变量**：部署时更灵活（Nginx、平台或 compose 都会用到）。

---

## 7）常见“坑位清单”（你写 Dockerfile 时最容易踩）

* 先 `COPY . .` 再 `npm install`：会导致**任何文件变化都触发重装依赖**，构建慢。
* 忘了 `.dockerignore`：镜像巨大，甚至把 `.env`、密钥打进去。
* Express 监听 127.0.0.1：容器外访问不到。
* 生产镜像还带 nodemon / devDependencies：镜像变大、启动慢、攻击面更大。
* 没有 lock 文件还用 `npm ci`：会失败（ci 依赖 lock）。

---

## 8）你可以直接套用的“最佳实践模板”（建议你默认用这个）

如果你是 **Express + JS**：用第 1 类多阶段即可。
如果你是 **Express + TS**：用第 2 类 dist 方案更清晰。

---

如果你把你的项目结构贴一下（例如是否 TypeScript、入口是 `src/index.ts` 还是 `server.js`、端口是多少、用 npm/yarn/pnpm），我可以按你的结构给你一份“可直接复制到项目根目录”的 Dockerfile + .dockerignore + package.json scripts 的组合。
