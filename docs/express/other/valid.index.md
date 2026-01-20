简洁、明确地回答你的问题：

**是的，当前很多新的 Express 项目确实越来越多使用像 Zod、Yup、Joi 等 `schema-first` 的验证库，而不是只用 `express-validator` 或直接用 `validator`。** 这在工程实践中尤其明显于 TypeScript 项目中。([Reddit][1])

下面我分几个要点说明趋势和原因：

---

## 1. 趋势：schema-first 库在现代 Express 项目中越来越受欢迎

### Zod / Joi / Yup 的兴起

许多开发者认为传统的 `express-validator` 在大型或复杂项目里可维护性较差，因此会迁移到 **schema 定义更明确、更易组合的库**，像：

* **Zod**：现在在 TypeScript 社区非常火，开发体验优秀、类型推导强。([DEV Community][2])
* **Joi**：老牌服务端 schema 验证方案，适合较复杂规则。([npmtrends.com][3])
* **Yup**：语法类似于 Zod，也常见于前后端共享校验逻辑。([npmtrends.com][3])

这些库的共同特点是 **定义 schema → 校验数据 → 得到一致的验证结果**。
这更符合现代工程中“验证逻辑与类型定义一致”的需求。

---

## 2. 为什么这个趋势越来越明显？

### A. 与 TypeScript 配合更好

Zod / Joi 等库都支持：

* 声明 schema
* 自动推导 TypeScript 类型
* 在前后端/全栈之间共享 schema

这比 `express-validator` 的链式中间件更贴近现代代码组织。([DEV Community][4])

---

## 3. `express-validator` 和 `validator` 仍旧有存在价值

虽然趋势向 schema-first 库倾斜，但 `express-validator` 和 `validator` 并没有“消失”：

* **`express-validator`**：在很多中小型或者快速原型项目仍然使用，特别是 JavaScript 而非 TypeScript 项目里。([betterstack.com][5])
* **`validator`**：依然普遍作为底层字符串/格式校验工具（如判断 email、uuid 等），用在各种 Node.js 项目里。([DEV Community][2])

也就是说：

* **如果项目不使用 TypeScript 或者很简单：`express-validator` 依然常见**。
* **如果项目是现代结构（尤其是 TS + schema 驱动）：Zod / Joi / Yup 越来越常见**。

---

## 4. 社区讨论中的趋势侧写

例如在 Reddit 等社区中有很多讨论：

* 很多人在 Express 中使用 Zod 或类似模式来做中间件验证，更容易与 typings 共享。([Reddit][1])
* 社区里也有不少人提到 express-validator 曾经是常见方案，但现在热门的还有 Zod、class-validator、Typebox 等。([Reddit][6])

这些讨论可以反映出 **“多种方案共存，但 schema-first 验证库的热度更高”** 的趋势。

---

## 5. 实际工程选择指南

下面是根据项目类型给出的常见选择：

| 项目类型                    | 推荐库                 | 说明                    |
| ----------------------- | ------------------- | --------------------- |
| 简单 Express API（JS）      | `express-validator` | 快速、直接，不强依赖 TypeScript |
| 现代 Express + TypeScript | **Zod / Joi**       | schema 更明显，类型一致性强     |
| 全栈共享校验逻辑                | Zod / Yup           | 可以前后端共享 schema        |
| 复杂规则 or 结合 OpenAPI      | AJV                 | JSON Schema 驱动，和规范更贴合 |

---

## 6. 结论（核心总结）

**当前新建的 Express 项目，尤其是使用 TypeScript 的，大多数工程实践确实更倾向于使用 Zod/Joi/Yup 这类 schema-first 验证库，而不是只用 express-validator 或 validator。**
`express-validator` 仍有用户，但增长趋势在向更结构化的验证库迁移。([Reddit][1])

---

如果你愿意，我可以针对你当前的项目（例如是否使用 TypeScript）给出具体的验证结构模板，并示范用 Zod 结合 Express/中间件封装的完整示例。只需要告诉我你的项目堆栈。

[1]: https://www.reddit.com/r/node/comments/1eoad8q/for_backend_web_server_apis_where_do_you_prefer/?utm_source=chatgpt.com "For backend web server APIs, where do you prefer to do ..."
[2]: https://dev.to/shanu001x/top-5-validation-libraries-for-javascript-in-2024-35la?utm_source=chatgpt.com "Top 5 Validation Libraries for JavaScript in 2024"
[3]: https://npmtrends.com/express-validation-vs-express-validator-vs-joi-vs-zod?utm_source=chatgpt.com "express-validation vs express-validator vs joi vs zod"
[4]: https://dev.to/osalumense/validating-request-data-in-expressjs-using-zod-a-comprehensive-guide-3a0j?utm_source=chatgpt.com "Validating Request Data in Express.js using Zod and ..."
[5]: https://betterstack.com/community/guides/scaling-nodejs/express-validator-nodejs/?utm_source=chatgpt.com "Using Express-Validator for Data Validation in Node.js"
[6]: https://www.reddit.com/r/node/comments/1ad0e43/which_validator_is_best_for_express/?utm_source=chatgpt.com "Which validator is best for Express? : r/node"
