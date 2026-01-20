下面给你一份在 **Express 项目中 Nginx 配置（nginx.conf / site.conf）常见写法大全**，以及每一段配置对应的**核心知识点**。我按“最常见生产形态”组织：Nginx 负责反向代理、TLS、静态资源、压缩与缓存，Express 作为上游服务。

---

## 0）典型部署拓扑与文件位置

### 常见拓扑

* 客户端 → **Nginx(80/443)** → **Express(3000/4000/… 内网端口)**

### 常见配置文件位置

* **Ubuntu/Debian**

  * `/etc/nginx/nginx.conf`（全局）
  * `/etc/nginx/sites-available/xxx.conf`（站点）
  * `/etc/nginx/sites-enabled/xxx.conf`（启用软链）
* **Docker**

  * 通常把站点配置挂载到 `/etc/nginx/conf.d/default.conf` 或 `/etc/nginx/conf.d/app.conf`

---

## 1）最常用：反向代理 Express（HTTP）

> 适用：还没上 HTTPS，或 HTTPS 由上层 LB 做了。

```nginx
server {
  listen 80;
  server_name example.com;

  # 1) 反向代理到 Express
  location / {
    proxy_pass http://127.0.0.1:4000;

    # 2) 把客户端真实信息转发给上游
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # 3) 连接与超时（按业务调整）
    proxy_connect_timeout 5s;
    proxy_read_timeout 60s;
    proxy_send_timeout 60s;
  }
}
```

### 知识点

* **proxy_pass**：Nginx 将请求转发到上游（Express）。
* **X-Forwarded-***：让 Express 知道真实客户端 IP/协议，日志、鉴权（例如生成回调 URL）常用。
* **超时**：接口慢或大文件下载时，需要更长 `proxy_read_timeout`。

---

## 2）上生产必备：HTTP → HTTPS 强制跳转 + HTTPS 反代

```nginx
# 80 端口只负责跳转
server {
  listen 80;
  server_name example.com;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name example.com;

  ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

  location / {
    proxy_pass http://127.0.0.1:4000;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

### 知识点

* **HTTP 强制跳 HTTPS**：`301` 永久重定向，利于 SEO 与安全一致性。
* **http2**：通常能提升并发请求性能（浏览器多资源加载更明显）。
* **证书路径**：Let’s Encrypt 常见路径如上；容器环境通常用挂载卷。

---

## 3）前后端同域：/api 给 Express，/ 给前端静态文件（最常见）

> 适用：React/Vue 打包后由 Nginx 托管，Express 只负责 API。

```nginx
server {
  listen 80;
  server_name example.com;

  # 前端静态站点根目录
  root /var/www/app;
  index index.html;

  # 1) API 反向代理
  location /api/ {
    proxy_pass http://127.0.0.1:4000;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # 2) SPA 路由回退（React Router / Vue Router history 模式）
  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

### 知识点

* **try_files**：SPA 必备。比如访问 `/profile`，磁盘没有该文件时回退到 `index.html` 交给前端路由处理。
* **/api/ 分流**：避免前端路由与后端路由冲突，并保证同域免 CORS。

---

## 4）WebSocket / Socket.io（很常见，必须加 Upgrade 头）

```nginx
map $http_upgrade $connection_upgrade {
  default upgrade;
  '' close;
}

server {
  listen 80;
  server_name example.com;

  location /socket.io/ {
    proxy_pass http://127.0.0.1:4000;

    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;

    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

### 知识点

* WebSocket 需要 `Upgrade` / `Connection` 头，以及 `proxy_http_version 1.1`。
* `map` 用于兼容没有 Upgrade 的普通请求。

---

## 5）上传大文件：client_max_body_size（非常常见）

```nginx
server {
  listen 80;
  server_name example.com;

  client_max_body_size 50m;

  location /api/ {
    proxy_pass http://127.0.0.1:4000;
  }
}
```

### 知识点

* 默认大小可能导致上传直接 `413 Request Entity Too Large`。
* 该限制发生在 **Nginx 层**，请求还没到 Express。

---

## 6）Gzip 压缩（文本资源强烈建议开）

一般放在 `http {}` 块里（全局）：

```nginx
gzip on;
gzip_min_length 1024;
gzip_comp_level 5;
gzip_types
  text/plain
  text/css
  application/json
  application/javascript
  application/xml
  image/svg+xml;
gzip_vary on;
```

### 知识点

* 压缩主要对 **HTML/CSS/JS/JSON** 收益大。
* 图片/视频通常无需 gzip（收益小甚至无效）。

---

## 7）静态资源强缓存（前端打包 assets 通常带 hash）

```nginx
location /assets/ {
  root /var/www/app;
  expires 30d;
  add_header Cache-Control "public, max-age=2592000, immutable";
}
```

### 知识点

* 带 hash 的文件（如 `app.8f3a1.js`）可以放心长缓存。
* `immutable` 提示浏览器不要二次验证，减少请求。

---

## 8）安全响应头（常用基础版）

```nginx
add_header X-Content-Type-Options nosniff always;
add_header X-Frame-Options DENY always;
add_header Referrer-Policy strict-origin-when-cross-origin always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
```

### 知识点

* 这些是“低风险高收益”的基础安全头。
* **HSTS**（Strict-Transport-Security）只在 HTTPS 稳定后再开，避免误配导致无法回退到 HTTP。

---

## 9）限流与基础防护（可选但常见）

放在 `http {}` 块中：

```nginx
limit_req_zone $binary_remote_addr zone=api_rate:10m rate=10r/s;
```

站点内：

```nginx
location /api/ {
  limit_req zone=api_rate burst=20 nodelay;
  proxy_pass http://127.0.0.1:4000;
}
```

### 知识点

* `rate=10r/s`：每个 IP 每秒 10 个请求。
* `burst`：允许短时间突发；`nodelay` 表示超过速率直接快速处理突发直到 burst 用完（再限）。

---

## 10）负载均衡（多实例 Express）

```nginx
upstream express_upstream {
  least_conn;
  server 127.0.0.1:4000;
  server 127.0.0.1:4001;
}

server {
  listen 80;
  server_name example.com;

  location /api/ {
    proxy_pass http://express_upstream;
  }
}
```

### 知识点

* `upstream` 定义上游池，Nginx 在多个 Express 实例间分发请求。
* `least_conn`：倾向转给当前连接数更少的实例。

---

## 11）日志（定位线上问题很重要）

```nginx
access_log /var/log/nginx/access.log;
error_log  /var/log/nginx/error.log warn;
```

### 知识点

* 访问日志用于分析 QPS、来源、耗时（可自定义 log_format）。
* 错误日志用于定位 502/504、上游连接失败等问题。

---

## 12）最常见故障与对应配置点（你一定会遇到）

* **502 Bad Gateway**：Nginx 连不上上游（Express 没起、端口不对、容器网络不通）。
* **504 Gateway Timeout**：上游处理太慢 → 调 `proxy_read_timeout` 或优化接口/异步任务化。
* **413 Request Entity Too Large**：上传太大 → `client_max_body_size`。
* **SPA 刷新 404**：没配 `try_files ... /index.html`。
* **WebSocket 断开**：没配 Upgrade/Connection 头。

---

## 你可以直接复制的“通用生产模板”（前端静态 + /api 反代 + WebSocket + 上传限制）

```nginx
map $http_upgrade $connection_upgrade {
  default upgrade;
  '' close;
}

server {
  listen 80;
  server_name example.com;

  client_max_body_size 50m;

  root /var/www/app;
  index index.html;

  location /api/ {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 60s;
  }

  location /socket.io/ {
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_set_header Host $host;
  }

  location /assets/ {
    expires 30d;
    add_header Cache-Control "public, max-age=2592000, immutable";
  }

  location / {
    try_files $uri $uri/ /index.html;
  }

  add_header X-Content-Type-Options nosniff always;
  add_header X-Frame-Options DENY always;
  add_header Referrer-Policy strict-origin-when-cross-origin always;
}
```

---

如果你告诉我你当前的真实情况（不用很长，给我 4 条信息就行）：
1）Express 监听端口（比如 4000）
2）是否有前端静态站点（React/Vue 打包）
3）是否需要 WebSocket（socket.io）
4）是否要 HTTPS（域名是否已解析）

我可以按你的场景给你一份**最终可直接部署的 Nginx 配置**，并配套你 Docker + Nginx 的目录结构应该怎么放。
