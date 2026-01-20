下面是一份**「前端专用 · Nginx 学习清单」**，严格以**前端工程实践**为导向，不走运维深水区，不浪费时间学用不到的内容。
目标很明确：**学完就能把前端项目真正上线，并具备生产级思维。**

---

# 一、学习目标（先对齐预期）

学完这份清单，你应该能够：

* 部署 React / Vue / Next.js（静态模式）项目
* 解决 SPA 刷新 404 问题
* 使用 Nginx 代理后端接口（前后端分离）
* 在一台服务器上部署多个前端项目
* 理解线上常见 Nginx 配置，不再“只会复制”

---

# 二、Nginx 学习分层清单（前端视角）

## 第 1 层：Nginx 是什么（了解即可）

**目标：知道自己在用什么**

* Nginx 是什么

  * 高性能 Web Server
  * 反向代理服务器
* Nginx 在前端中的角色

  * 托管打包后的静态资源
  * 转发 API 请求到后端
  * 统一域名入口

不需要学：

* 源码
* 事件模型
* epoll 细节

---

## 第 2 层：基础结构（必须掌握）

### 1️⃣ 核心配置文件结构

```nginx
http {
  server {
    listen 80;
    server_name example.com;

    location / {
      root /usr/share/nginx/html;
      index index.html;
    }
  }
}
```

**你必须理解：**

* `http`：全局 HTTP 配置
* `server`：一个站点（≈ 一个项目）
* `location`：路由匹配规则

---

### 2️⃣ 静态资源部署（前端最核心）

```nginx
location / {
  root /var/www/web;
  index index.html;
}
```

理解要点：

* `root` 指向的是 **打包后的目录**
* Nginx 不跑 React / Vue
* Nginx 只负责“发文件”

---

## 第 3 层：SPA 刷新 404（必会）

### 问题本质

* 前端路由在浏览器
* Nginx 不认识 `/user/123`

### 标准解决方案

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

**这是前端 Nginx 的灵魂配置。**

适用场景：

* React Router
* Vue Router（history 模式）
* Next.js export

---

## 第 4 层：反向代理（前后端分离核心）

### 典型场景

```txt
前端：http://example.com
后端：http://localhost:4000
```

### Nginx 配置

```nginx
location /api/ {
  proxy_pass http://localhost:4000;
}
```

### 必须理解的点

* `/api` 是**前端约定**
* 浏览器只请求 Nginx
* Nginx 再请求后端

---

### 常见补充配置（建议掌握）

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
```

---

## 第 5 层：多前端项目部署（高频实战）

### 场景 1：同域名多项目

```nginx
location /admin/ {
  root /var/www;
  try_files $uri $uri/ /admin/index.html;
}
```

访问：

```
example.com/admin
```

---

### 场景 2：多端口多项目

```nginx
server {
  listen 3000;
  root /var/www/web;
}

server {
  listen 3001;
  root /var/www/admin;
}
```

---

## 第 6 层：常见线上必备配置（前端够用）

### 1️⃣ gzip 压缩（必开）

```nginx
gzip on;
gzip_types text/css application/javascript application/json;
```

---

### 2️⃣ 静态资源缓存

```nginx
location ~* \.(js|css|png|jpg|jpeg|svg)$ {
  expires 7d;
}
```

理解：

* 提升首屏加载速度
* 配合 hash 文件名效果最佳

---

### 3️⃣ 禁止访问敏感文件

```nginx
location ~ /\. {
  deny all;
}
```

---

## 第 7 层：你可以暂时不学的内容（前端）

明确告诉你哪些**不用现在学**：

* rewrite 正则深度用法
* upstream 负载均衡
* SSL 证书细节（Let’s Encrypt）
* Nginx 模块开发
* 高可用、灰度发布

---

# 三、前端常见 Nginx 错误清单（非常重要）

### ❌ 把 `root` 指到源码目录

> 必须是 build / dist 目录

### ❌ 忘了 `try_files`

> SPA 刷新必 404

### ❌ proxy_pass 多写 /

```nginx
location /api/ {
  proxy_pass http://localhost:4000/; # ❌
}
```

### ✅ 正确

```nginx
proxy_pass http://localhost:4000;
```

---

# 四、前端实战训练任务（建议照做）

### 任务 1（必做）

* 本地安装 Nginx
* 部署一个 React/Vue 项目
* 支持路由刷新

### 任务 2

* 用 Nginx 代理一个 Express 接口
* 前端通过 `/api` 访问

### 任务 3

* 同一台服务器部署 2 个前端项目
* 使用不同路径或端口

---

# 五、学习完成标志（自检）

你如果能不查资料完成下面问题，说明已达标：

* SPA 刷新为什么 404？如何解决？
* proxy_pass 的作用是什么？
* root 和 alias 有什么区别？
* Nginx 和 Node 的职责边界？

---

## 最后一句话

> **前端学 Nginx，不是为了当运维，而是为了把项目真正送到线上。**

如果你愿意，下一步我可以：

* 给你一套 **「前端 Nginx 最小配置模板」**
* 或直接 **Nginx + Docker + 前端 一条线实战**

你选一个，我直接展开。
