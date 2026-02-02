你这一步**非常关键，而且你把完整输出贴出来是完全正确的**。
我先给你**精准判断**，再给你**100% 能走通的解决方案**（不折腾、不深挖原理）。

---

# 一、先下结论（你现在遇到的不是你操作问题）

### ❗ 问题本质只有一句话

> **你的服务器当前“无法直连 download.docker.com（443 被重置）”**

证据就是这一行：

```
curl: (35) OpenSSL SSL_connect: Connection reset by peer
```

这不是你命令写错，也不是 Ubuntu 的问题，而是：

* 国内网络 / 云厂商
* 对 `download.docker.com` 的 **TLS 连接被重置**
* 导致 **Docker 官方 GPG Key 根本没下载成功**
* 所以后续全部失败（NO_PUBKEY、包不存在、docker 组不存在）

👉 **你前面的所有操作逻辑都是对的，只是网络不允许**

---

# 二、在你当前目标下，正确选择是什么？

你一开始说得很清楚：

> **“学习 docker 和 nginx 来部署 react mongodb express 项目，不用太深入学习”**

在这个前提下：

## ✅ 结论（非常重要）

> **现在不要死磕 Docker 官方源，直接用 Ubuntu 官方的 `docker.io`**

原因：

* 你不是做 Docker 内核开发
* `docker.io` **完全能满足 React / Express / MongoDB / Nginx**
* 学习阶段 **稳定 > 最新**

⚠️ 之前我不推荐 `docker.io`，是**理想情况**
但你现在的**现实网络条件**，最优解已经变了

---

# 三、你现在应该怎么做（保证 10 分钟内成功）

## Step 1：清理刚才失败的 Docker 官方源（很重要）

```bash
sudo rm -f /etc/apt/sources.list.d/docker.list
sudo rm -f /etc/apt/keyrings/docker.gpg
```

```bash
sudo apt update
```

---

## Step 2：直接安装 Ubuntu 官方 docker.io（稳）

```bash
sudo apt install -y docker.io
```

安装完成后，检查：

```bash
docker --version
```

你会看到类似：

```
Docker version 28.2.2, build xxxx
```

✅ 只要有版本号，就完全 OK

---

## Step 3：启动 Docker + 设置开机启动

```bash
sudo systemctl enable docker
sudo systemctl start docker
```

验证：

```bash
sudo systemctl status docker
```

看到 `active (running)` 即成功。

---

## Step 4：创建 docker 用户组并加入（之前失败是正常的）

```bash
sudo groupadd docker
sudo usermod -aG docker wjx
```

⚠️ 然后 **必须退出 SSH，重新连一次**

重新连上后执行：

```bash
docker run hello-world
```

看到：

```
Hello from Docker!
```

🎉 **Docker 安装完成（可以开始学习了）**

---

# 四、关于 docker-compose（你也需要）

Ubuntu 的 `docker.io` **不自带 compose v2 插件**，但没关系：

### 安装 docker-compose（v1，够用）

```bash
sudo apt install -y docker-compose
```

验证：

```bash
docker-compose --version
```

> 对你现在阶段：

* `docker-compose`（v1）✅ 完全够
* `docker compose`（v2）❌ 不强求

---

# 五、这会不会影响你后面学习 Docker / Nginx？

**不会，几乎没有影响。**

你接下来要学的所有内容：

* Dockerfile
* docker build / run
* docker-compose.yml
* Nginx 反向代理
* React build + Express API

👉 **在 docker.io 上 100% 一样**

等你以后网络条件好、或有需要，再换官方源也不迟。

---

# 六、你现在立刻要做的 3 个动作（按顺序）

👉 **只做这 3 件事，不要加戏**

1️⃣ 执行

```bash
sudo apt install -y docker.io
```

2️⃣ 退出 SSH，重新连接后执行

```bash
docker run hello-world
```

3️⃣ 把输出结果贴给我

---

## 下一步（我已经帮你规划好了）

Docker 一旦成功，我们**下一步马上做**：

> **用 Docker 跑一个最小 Express 服务（5 行代码级别）**

不碰 MongoDB、不碰 Nginx，**先建立信心**。

你先把 **hello-world 跑出来**，我继续带你。
