| 场景                    | 是否必须 Cookie |
| --------------------- | ----------- |
| React + Express 前后端分离 | ❌ 不必须       |
| 移动端 / RN / Flutter    | ❌ 不建议       |
| 企业级 Web 应用            | ✅ 推荐        |
| SSR / Next.js         | ✅ 推荐        |
| 简单学习项目                | ❌ 没必要       |

👉 JWT ≠ Cookie 绑定

四、你现在这个技术栈的建议（结合你）

你目前的情况是：

React 前端

Express / Nest 生态

做类似 社交平台后端

未来要实习 / 面试

✅ 强烈建议你掌握 两种方式
学习阶段（优先）

👉 JWT + Authorization Header

原因：

原理清晰

面试好讲

不涉及 CSRF

进阶 & 生产

👉 JWT + HttpOnly Cookie + Refresh Token

这是企业级方案

五、面试高频问题一句话回答模板

“JWT 一定要配合 Cookie 使用吗？”

不一定。JWT 只是身份凭证，可以放在 Authorization Header 或 HttpOnly Cookie 中。Header 方式更适合前后端分离和移动端，而 Cookie 方式安全性更高，但需要额外处理 CSRF。