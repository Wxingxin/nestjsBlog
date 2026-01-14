“**Ollama Autocoder**”是一个 VS Code 扩展，用来把你本机的 **Ollama 模型**接到编辑器里，提供**代码自动补全（inline completion）**能力。它本质上不是“再部署一个模型”，而是**调用你已经运行着的 Ollama 服务（默认 `localhost:11434`）**，把当前光标附近的代码作为上下文发给模型，让模型续写。 ([GitHub][1])

下面按“你本地已经部署好 Ollama”的前提，给你一套最稳的结合方式。

---

## 1) 你需要满足的前置条件（Mac 本地）

1. **Ollama 服务在跑**

   ```bash
   ollama serve
   ```

   或者你已经用 brew service 启动也可以（关键是 11434 能访问）。

2. **装一个“代码模型”**
   Autocoder 的默认模型常见是 `qwen2.5-coder:latest`（或你自己改成其他 coder 模型）。([GitHub][1])
   建议你直接拉一个 coder：

   ```bash
   ollama pull qwen2.5-coder:7b
   ```

   然后确认名字：

   ```bash
   ollama list
   ```

---

## 2) VS Code 里怎么配置（核心就在 Settings）

### 方法 A：UI 配置

* 打开 VS Code → Settings
* 搜索：`ollama autocoder`
* 重点配置两项：

  * **API Endpoint**：一般填 `http://localhost:11434`
  * **Model**：填 `qwen2.5-coder:7b`（以你 `ollama list` 里的名字为准）

扩展的要求就是：Ollama 必须在你设置的 endpoint 上提供服务，并且你设置的 model 必须已安装。([GitHub][1])

### 方法 B：直接写 `settings.json`（更可控）

在 VS Code 打开命令面板 → “Preferences: Open Settings (JSON)”，添加类似（字段名以你安装的扩展实际提示为准）：

```jsonc
{
  // 关键：让扩展知道 Ollama 在哪
  "ollama-autocoder.endpoint": "http://localhost:11434",

  // 关键：你本地已 pull 的模型名
  "ollama-autocoder.model": "qwen2.5-coder:7b",

  // 可选：上下文窗口，建议不要超过模型支持的上下文
  "ollama-autocoder.promptWindowSize": 2048,

  // 可选：生成参数（温度/最大token等，扩展若暴露的话）
  "ollama-autocoder.temperature": 0.2
}
```

> 说明：扩展文档强调 “prompt window size 要与模型最大上下文对齐”。([GitHub][1])

---

## 3) 使用方式（如何触发补全/如何停止）

### 触发补全

* 在代码里正常写，停顿一下或在合适位置触发 VS Code 的 inline suggestion（很多人习惯按 **Tab** 接受建议）
* 如果你发现没有出现补全，去命令面板执行：**“Trigger Inline Suggestion”**（确认 VS Code 本身的内联建议机制是开启的）

### 停止生成

扩展支持通过通知里的 **Cancel** 停止，或者你继续输入也会中断生成。([Visual Studio Marketplace][2])

---

## 4) 你本地 Qwen（非 coder）能不能用？

能用，但**效果会明显差于 coder 模型**：

* `qwen2.5:7b` 更偏通用聊天
* `qwen2.5-coder:*` 专为代码补全/代码理解调过

建议：

* **聊天问答**：`qwen2.5:7b / 14b`
* **编辑器补全**：`qwen2.5-coder:7b / 14b`

---

## 5) 最常见问题排查（Mac 上很实用）

### 问题 1：VS Code 里一直转圈/没输出

先用 curl 验证本机 endpoint 真的能访问：

```bash
curl http://localhost:11434/api/tags
```

能返回模型列表，说明网络层 OK。

### 问题 2：模型名填错

以 `ollama list` 的 NAME 列为准（包括 `:tag`）。

### 问题 3：补全很慢/卡顿

* 把模型换小一点（7B）
* 把 `promptWindowSize` 降到 1024/2048
* 确保用的是 coder 模型

---

## 6) 你说的“怎么结合”，最推荐的工作流

* **Autocoder**：负责“边写边补全”（类似 Copilot 的 Tab 补全）
* 另外再配一个 **Chat/RAG 类插件**（如 Continue）做“解释代码、重构、问答”（这块 Ollama 官方也有 VS Code 集成指引）。([Ollama документация][3])

这样是最接近“本地 Copilot + 本地 ChatGPT”的组合。

---

如果你把你 VS Code 里 Autocoder 的设置项截图（或把 settings.json 里以 `ollama-autocoder` 开头的几行贴出来），我可以直接帮你确认：

1. endpoint 是否对
2. model 是否对
3. 为什么补全不触发（通常是 VS Code 的 inline suggestion/快捷键冲突）

[1]: https://github.com/10Nates/ollama-autocoder?utm_source=chatgpt.com "10Nates/ollama-autocoder"
[2]: https://marketplace.visualstudio.com/items?itemName=10nates.ollama-autocoder&utm_source=chatgpt.com "Ollama Autocoder"
[3]: https://docs.ollama.com/integrations/vscode?utm_source=chatgpt.com "VS Code"
