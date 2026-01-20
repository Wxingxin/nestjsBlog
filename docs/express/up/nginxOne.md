下面是一份**「前端专用 · Nginx 最小可用配置模板」**，这是**真实线上可直接使用**的版本，并且**每一行都配有前端视角注释**。
适用对象：**React / Vue / Next.js（静态导出）前端项目 + 可选后端 API**。

---

# 一、前端 Nginx 最小配置模板（完整版 + 注释）

> 文件位置（常见）：
> `/etc/nginx/conf.d/default.conf` 或 `/etc/nginx/nginx.conf` 中的 `server` 块

```nginx
server {
    # =========================
    # 1. 基础监听配置
    # =========================

    listen 80;                     # 监听 80 端口（HTTP 默认端口）
    server_name localhost;          # 域名，本地可用 localhost，线上改成你的域名

    # =========================
    # 2. 前端静态资源配置
    # =========================

    root /var/www/web;              # 指向前端打包后的目录（dist / build）
    index index.html;               # 默认入口文件

    location / {
        # =========================
        # SPA 路由支持（核心）
        # =========================

        # 按顺序查找：
        # 1. 是否存在真实文件
        # 2. 是否存在真实目录
        # 3. 否则交给 index.html（前端路由）
        try_files $uri $uri/ /index.html;
    }

    # =========================
    # 3. 后端接口反向代理（可选）
    # =========================

    location /api/ {
        proxy_pass http://localhost:4000;   # 后端服务地址

        # 让后端知道真实请求信息（推荐）
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # =========================
    # 4. 静态资源缓存（前端性能优化）
    # =========================

    location ~* \.(js|css|png|jpg|jpeg|gif|svg|woff|woff2)$ {
        expires 7d;                          # 浏览器缓存 7 天
        add_header Cache-Control "public";
    }

    # =========================
    # 5. gzip 压缩（必开）
    # =========================

    gzip on;                                # 开启 gzip
    gzip_min_length 1k;                     # 超过 1KB 才压缩
    gzip_types
        text/plain
        text/css
        application/json
        application/javascript
        application/xml
        application/xml+rss;
}
```

---

# 二、你在前端项目中需要配合做的事情

### 1️⃣ 构建输出目录要对

| 框架           | 构建命令                        | 输出目录    |
| ------------ | --------------------------- | ------- |
| React (Vite) | `npm run build`             | `dist`  |
| React (CRA)  | `npm run build`             | `build` |
| Vue          | `npm run build`             | `dist`  |
| Next.js      | `next build && next export` | `out`   |

👉 `root` 一定要指向这些目录。

---

### 2️⃣ 前端请求 API 的写法（非常关键）

**前端代码**

```js
fetch('/api/user')
```

而不是：

```js
fetch('http://localhost:4000/api/user') // ❌
```

这样：

* 本地
* 线上
* Docker
  都不用改代码。

---

# 三、前端最常见 5 个坑（你一定会遇到）

### ❌ 1. root 写错路径

```nginx
root /var/www;        # ❌
```

```nginx
root /var/www/web;    # ✅（里面有 index.html）
```

---

### ❌ 2. 忘了 try_files

**表现：**

* 刷新页面 404
* 直接访问子路由 404

---

### ❌ 3. proxy_pass 多写了 /

```nginx
proxy_pass http://localhost:4000/;  # ❌
```

正确：

```nginx
proxy_pass http://localhost:4000;
```

---

### ❌ 4. API 被 try_files 吃掉

错误顺序：

```nginx
location / {
  try_files ...
}
location /api/ {
  proxy_pass ...
}
```

正确：

```nginx
location /api/ {
  proxy_pass ...
}
location / {
  try_files ...
}
```

---

### ❌ 5. 忘了重载 Nginx

```bash
nginx -t      # 检查配置
nginx -s reload
```

---

# 四、这是「最小但完整」的原因

它满足：

* ✔ 前端 SPA
* ✔ 前后端分离
* ✔ 线上缓存
* ✔ 性能优化
* ✔ 可直接进 Docker

但**没有**：

* 复杂 rewrite
* upstream
* SSL
* 运维级配置

---

## 最后一句话（很重要）

> **如果你把这份配置吃透，你已经超过 80% 的前端开发者的部署能力。**

如果你下一步想继续，我可以直接帮你：

* 改成 **Docker + Nginx 版本**
* 或给你一份 **生产环境加强版配置**

你直接选一个，我继续往下讲。
