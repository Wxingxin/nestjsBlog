下面给你一份**「Ollama 基本使用大全（工程师版）」**。
我会按 **安装 → 模型 → 运行 → API → 自定义 → 常见问题** 的结构来讲，覆盖 **90% 实际使用场景**，不讲虚的。

---

# 一、Ollama 是怎么工作的（先建立直觉）

一句话模型：

> **Ollama = 本地 LLM 运行时 + 模型管理器 + HTTP API 服务**

你可以把它理解为：

* 类似 **Docker（管理镜像）**
* * **Node 服务（提供接口）**
* * **LLM 推理引擎（llama.cpp）**

---

# 二、安装 Ollama

### Windows / macOS / Linux

官网直接下载安装包即可。

安装完成后，**后台会自动启动服务**：

```
http://localhost:11434
```

你不用手动 `start`。

---

### 验证是否安装成功

```bash
ollama --version
```

---

# 三、模型管理（最核心）

## 1️⃣ 查看可用模型（官方库）

```bash
ollama list
```

如果是第一次，列表可能是空的。

---

## 2️⃣ 拉取模型（pull）

### 常见模型推荐（新手优先）

```bash
ollama pull llama3
ollama pull qwen2.5
ollama pull mistral
```

👉 模型会下载到本地（只下载一次）。

---

## 3️⃣ 查看本地模型

```bash
ollama list
```

输出示例：

```
NAME            SIZE
llama3          4.7 GB
qwen2.5         4.2 GB
```

---

## 4️⃣ 删除模型

```bash
ollama rm llama3
```

---

# 四、运行模型（命令行交互）

## 1️⃣ 直接运行（REPL 模式）

```bash
ollama run llama3
```

你会进入一个 **对话终端**：

```
>>> 你好
>>> 给我写一个 React useEffect 示例
```

---

## 2️⃣ 单次调用（不进入 REPL）

```bash
ollama run llama3 "解释什么是闭包"
```

---

## 3️⃣ 带参数运行（常见）

```bash
ollama run llama3 --temperature 0.7
```

常用参数（理解即可）：

| 参数             | 含义       |
| -------------- | -------- |
| temperature    | 创造性（0~1） |
| top_p          | 采样范围     |
| num_ctx        | 上下文长度    |
| repeat_penalty | 防重复      |

---

# 五、Ollama API 使用（非常重要）

Ollama **默认就是一个本地 API 服务**。

## 1️⃣ 基本接口地址

```
POST http://localhost:11434/api/generate
```

---

## 2️⃣ curl 示例（最基础）

```bash
curl http://localhost:11434/api/generate -d '{
  "model": "llama3",
  "prompt": "解释 JavaScript 的闭包",
  "stream": false
}'
```

返回 JSON：

```json
{
  "response": "闭包是指..."
}
```

---

## 3️⃣ 流式输出（stream = true）

```json
"stream": true
```

👉 非常适合：

* Chat UI
* 打字机效果
* 实时响应

---

# 六、Node.js / Express 中使用 Ollama（实战）

### Node fetch 示例

```js
const res = await fetch('http://localhost:11434/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'llama3',
    prompt: '给我一个 Express 中间件示例',
    stream: false
  })
})

const data = await res.json()
console.log(data.response)
```

👉 在你现在的技术栈里（Express / Nest），**无缝可用**。

---

# 七、聊天模式（多轮对话）

使用 `/api/chat`：

```json
POST /api/chat
```

### 示例

```json
{
  "model": "llama3",
  "messages": [
    { "role": "system", "content": "你是一个前端导师" },
    { "role": "user", "content": "什么是 React Hooks" },
    { "role": "assistant", "content": "Hooks 是..." },
    { "role": "user", "content": "useEffect 有什么坑" }
  ]
}
```

👉 **你自己负责维护上下文**（Ollama 不自动记忆）。

---

# 八、Modelfile（自定义模型行为）

## 1️⃣ Modelfile 是什么

类似 Dockerfile，用来：

* 固定 system prompt
* 设定参数
* 基于已有模型派生

---

## 2️⃣ 最简单 Modelfile

```text
FROM llama3

SYSTEM 你是一个专业的软件工程导师，回答要简洁、准确
```

---

## 3️⃣ 构建自定义模型

```bash
ollama create my-teacher -f Modelfile
```

运行：

```bash
ollama run my-teacher
```

👉 非常适合：

* 项目 AI 助手
* 私有知识问答
* 固定角色

---

# 九、Ollama 常见使用模式总结

## ✅ 模式 1：本地 ChatGPT

```bash
ollama run llama3
```

---

## ✅ 模式 2：后端 AI 服务

```
React → Express/Nest → Ollama → 模型
```

---

## ✅ 模式 3：RAG（进阶）

Ollama + 向量库（Chroma / Milvus / pgvector）

> Ollama 负责“生成”，向量库负责“找资料”。

---

# 十、性能 & 常见问题

### Q1：CPU 能跑吗？

能，但慢，推荐：

* ≤ 7B 模型
* 简短上下文

---

### Q2：GPU 一定要吗？

不是必须，但：

* 有 NVIDIA GPU 体验质变
* 显存 ≥ 8GB 很舒服

---

### Q3：Ollama vs OpenAI API？

| 对比   | Ollama | OpenAI |
| ---- | ------ | ------ |
| 是否本地 | ✅      | ❌      |
| 成本   | 0      | 按量     |
| 延迟   | 低      | 中      |
| 效果   | 取决模型   | 稳定     |

---

# 十一、给你的学习路线建议（很关键）

结合你的背景，我建议你 **三步走**：

### 第一步（1 天）

* 跑 `llama3 / qwen2.5`
* 熟悉 `run / pull / API`

### 第二步（2~3 天）

* 用 Express/Nest 封装一个 AI 接口
* 前端调接口显示结果

### 第三步（进阶）

* Modelfile
* RAG
* 多模型路由

👉 这是**非常加分的工程项目**。

---

## 总结一句话

> **Ollama 的“基本使用”并不难，真正的价值在于：它让你能把大模型当成一个“本地服务组件”来工程化使用。**

如果你愿意，下一步我可以直接帮你：

* 设计一个 **Ollama + Express + React 的完整项目结构**
* 或 **帮你选最适合你电脑的模型**
* 或 **教你做一个最小 RAG 示例**

你直接说你下一步想干什么即可。
