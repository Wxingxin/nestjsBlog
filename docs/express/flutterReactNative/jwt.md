在 **React Native（RN）/Flutter + Express** 这种“独立 App 客户端 + 自建 API 服务”的架构里，**JWT 不是必须**，但它是最常见、工程成本最低的方案之一。你完全可以不用 JWT，取决于你要的安全级别、开发复杂度、以及你是否愿意引入第三方身份服务。

下面把“为什么常用 JWT”和“不用 JWT 用什么”给你讲清楚，并给出推荐组合。

---

## 1) 先回答：要不要用 JWT？

**不一定要。**

你需要的其实是两件事：

1. **客户端能证明自己是谁**（认证 authentication）
2. **服务端能判断能不能做某事**（授权 authorization）

JWT 只是“证明身份”的一种令牌格式与传递方式（更准确是“自包含 token”）。

---

## 2) 不用 JWT，可以用什么？（按常见度与实用度排序）

### A. Session（服务端会话）+ Cookie（或 App 内“Cookie Jar”）

**核心思路：** 登录后服务端创建 session（存 Redis/数据库/内存），给客户端一个 session id（通常通过 Set-Cookie），后续请求带 cookie 即可。

**优点**

* Token 不暴露用户信息（不像 JWT 自包含）
* 服务器可随时强制下线（删 session 即可）
* 权限变更立即生效（不需要等 token 过期）

**缺点**

* 移动端对 Cookie 支持需要处理（RN/Flutter 需要 Cookie 管理库或手动注入）
* 分布式部署要共享 session（通常 Redis）
* 跨域、SameSite、CSRF 等要理解清楚（App 端一般比 Web 好处理一些，但如果你还做 H5/网页端就要更谨慎）

**适合**

* 你有 Web + App 多端统一，并且愿意用 Redis 做会话存储
* 你想要“强制下线”“随时撤销”更直观的控制

---

### B. Opaque Token（不透明 Token）+ 服务端存储（类似“API Key/Session Token”）

**核心思路：** 登录后服务端生成一个随机字符串（opaque token），存到数据库/Redis（映射到 userId、过期时间、设备信息等），客户端只保存这个随机字符串，每次请求带 `Authorization: Bearer <token>`。

它本质上是“把 JWT 的自包含内容，改成在服务端查表”。

**优点**

* 撤销简单：删掉或标记 token 即可
* 更容易做到“一个设备一个 token”“风控/设备管理”
* token 泄露风险可控（可绑定设备指纹/刷新策略）

**缺点**

* 每次请求需要查一次 token（Redis 解决性能）
* 你要自己实现 token 生命周期、刷新、轮换等

**适合**

* 你不想用 JWT，但又想要 Bearer Token 这种移动端最顺手的调用方式
* 你想要更强的“token 管理能力”（设备列表、踢下线、风控）

> 实务上，这个方案在很多大型系统里很常见：**Access Token 只是随机串，服务端查 Redis**。

---

### C. OAuth2 / OpenID Connect（第三方身份：Google/Apple/微信等）+ 你自己的会话

**核心思路：** 你把“用户登录”交给第三方（OIDC），App 端拿到第三方的 id_token/access_token 后，把它发给你的 Express，Express 验证后给你自己的 session 或你自己的 token。

**优点**

* 大幅降低“密码体系”的风险与开发成本
* 支持 SSO、社交登录、合规性更好
* 用户体验好（Apple/Google 一键登录）

**缺点**

* 接入和配置比 JWT/Session 更复杂
* 需要理解 OIDC/OAuth 的 token 验证、回调、密钥轮换等

**适合**

* 你不想维护账号密码体系
* 你要快速上线，且愿意用第三方登录

---

### D. mTLS（客户端证书）或设备级强认证（企业/高安全）

**核心思路：** 给每台设备发证书，TLS 层完成强身份校验。

**优点**

* 安全强度高

**缺点**

* 证书分发、吊销、更新很麻烦
* 一般互联网 App 很少用

**适合**

* 企业内网、金融级或极高安全场景

---

## 3) RN/Flutter + Express 的推荐结论（务实版）

### 你是个人项目 / 中小项目（最推荐）

**JWT（短期） + Refresh Token（长期）** 或者 **Opaque Token + Refresh（服务端存储）**

* RN/Flutter 处理 `Authorization: Bearer ...` 最顺手
* 不依赖 Cookie 跨域策略
* 你可以做“刷新、轮换、设备管理”

如果你不想用 JWT，但想要类似体验：

* 选 **Opaque Access Token（随机串）+ Refresh Token（随机串）**，都存在 Redis/DB

### 你有 Web 端 + App 端都要统一登录（常见）

**Session + Redis + Cookie**

* Web 端天然适配
* App 端配合 Cookie 管理也可用
* 可控性强（踢下线、权限立即生效）

---

## 4) “不用 JWT”时，最推荐你用哪一个？

如果你的目标是“移动端调用方便、撤销方便、安全可控、实现难度适中”，我建议：

**Opaque Token（随机串）+ Refresh Token（随机串）+ Redis（或数据库）存储**

这是“JWT 的工程替代品”，很多时候比 JWT 更好管。

---

## 5) 你可以怎么选（快速决策表）

* 只做 App，想简单：**JWT + Refresh**
* 不想 JWT，但要 Bearer：**Opaque Token + Refresh（服务端存）**
* App + Web 都做，且希望踢人/撤销立即生效：**Session + Redis**
* 想省掉账号密码体系：**OIDC（Google/Apple）+ 你自己的 session/token**

---

如果你告诉我两点，我可以直接给你定一个最合适的方案并给出 Express 的最小可运行代码结构（中间件、路由、存储）：

1. 你的 App 是否还会有 Web 端？
2. 你愿不愿意上 Redis（哪怕是本地开发用 Docker 起一个）？
