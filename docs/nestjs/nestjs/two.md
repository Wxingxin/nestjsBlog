下面我用**工程视角**把 **NestJS 装饰器**完整分一遍类：**干什么的、解决什么问题、写在哪里**。
你看完这一条，基本就能“看懂别人写的 NestJS 代码”。

---

## 🧠 一句话总览

> **NestJS 的装饰器 = 给类 / 方法 / 参数“贴标签”，让框架在运行时接管它**

这些“标签”最终都会被 Nest 的 **DI 容器 + HTTP 适配层**读取。

---

## 🧩 NestJS 装饰器的 6 大类（必须掌握）

---

## 1️⃣ 模块 & 依赖注入类装饰器（项目骨架）

👉 **写在：`class` 上**

### 常见装饰器

```ts
@Module()
@Injectable()
@Controller()
```

### 作用

| 装饰器             | 干什么               |
| --------------- | ----------------- |
| `@Module()`     | 定义一个模块（组织代码的最小单元） |
| `@Injectable()` | 声明这个类可以被依赖注入      |
| `@Controller()` | 声明这是一个控制器，负责接收请求  |

### 示例

```ts
@Injectable()
export class UserService {}
```

```ts
@Controller('users')
export class UserController {}
```

📌 **你可以理解为：**

* `@Injectable()` = “这个类归 Nest 管”
* `@Controller()` = “这个类能接 HTTP 请求”

---

## 2️⃣ 路由装饰器（HTTP 映射）

👉 **写在：Controller 的方法上**

### 常见装饰器

```ts
@Get()
@Post()
@Put()
@Delete()
@Patch()
```

### 作用

> 把 **HTTP 方法 + URL** 映射到一个函数

### 示例

```ts
@Controller('users')
export class UserController {
  @Get()
  findAll() {}

  @Post()
  create() {}
}
```

📌 对应关系：

```txt
GET    /users  → findAll()
POST   /users  → create()
```

---

## 3️⃣ 请求参数装饰器（拿数据）

👉 **写在：Controller 方法的参数上**

### 最常用的一批

```ts
@Param()
@Query()
@Body()
@Headers()
@Req()
@Res()
```

### 作用

> 从 HTTP 请求中“拆数据”

### 示例

```ts
@Get(':id')
findOne(
  @Param('id') id: string,
  @Query('page') page: number,
) {}
```

### 参数来源速查表

| 装饰器          | 来源                |
| ------------ | ----------------- |
| `@Param()`   | 路由参数 `/users/:id` |
| `@Query()`   | 查询参数 `?page=1`    |
| `@Body()`    | 请求体               |
| `@Headers()` | 请求头               |
| `@Req()`     | 原始 request（不推荐）   |

⚠️ **企业项目建议：**

* 能不用 `@Req()` 就不用
* 用 DTO + `@Body()` 更规范

---

## 4️⃣ 校验 & 转换装饰器（DTO 专属）

👉 **写在：DTO 类的属性上**

> 这一类不是 NestJS 原生，而是 **class-validator / class-transformer**
> 但 **NestJS 官方强烈推荐**

### 常见装饰器

```ts
@IsString()
@IsEmail()
@IsOptional()
@IsInt()
@Min()
@Max()
```

### 示例

```ts
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
```

📌 **它解决的问题**

* ❌ 不再手写 if 校验
* ❌ 不再相信前端数据
* ✅ 自动返回 400 错误

---

## 5️⃣ 流程控制装饰器（高级 / 面试重点）

👉 **写在：Controller / 方法 上**

### 常见装饰器

```ts
@UseGuards()
@UsePipes()
@UseInterceptors()
@UseFilters()
```

### 各自负责什么

| 装饰器                  | 作用        |
| -------------------- | --------- |
| `@UseGuards()`       | 权限 / 登录校验 |
| `@UsePipes()`        | 数据校验 / 转换 |
| `@UseInterceptors()` | 统一返回 / 日志 |
| `@UseFilters()`      | 异常处理      |

### 示例

```ts
@UseGuards(AuthGuard)
@Post()
create() {}
```

📌 **执行顺序（重要）**

```txt
Middleware
→ Guard
→ Pipe
→ Controller
→ Service
→ Interceptor (response)
→ Filter (error)
```

---

## 6️⃣ 自定义语义装饰器（高级封装）

👉 **写在：任意文件，自己定义**

### 典型场景

* `@CurrentUser()`
* `@Public()`
* `@Roles('admin')`

### 示例

```ts
export const CurrentUser = createParamDecorator(
  (data, ctx) => {
    const req = ctx.switchToHttp().getRequest()
    return req.user
  }
)
```

```ts
@Get('profile')
getProfile(@CurrentUser() user) {}
```

📌 **本质**

> 给一堆重复逻辑起一个“业务语义名字”

---

## 🗂 装饰器写在哪里（速查）

| 写在哪里    | 装饰器类型                                 |
| ------- | ------------------------------------- |
| `class` | `@Controller` `@Injectable` `@Module` |
| 方法      | `@Get` `@Post` `@UseGuards`           |
| 方法参数    | `@Body` `@Param` `@Query`             |
| DTO 属性  | `@IsString` `@IsEmail`                |
| 自定义     | `createParamDecorator`                |

---

## 🎯 总结一句话（你一定要记住）

> **NestJS 的装饰器不是“语法糖”，而是“架构入口”**

* class 装饰器 → **注册到 DI 容器**
* method 装饰器 → **HTTP 路由映射**
* param 装饰器 → **请求拆解**
* DTO 装饰器 → **数据安全**
* Guard / Pipe / Interceptor → **流程控制**

---

## 🚀 下一步我建议你学什么？

你可以选一个👇
1️⃣ **装饰器 + 依赖注入是怎么联动的（底层原理）**
2️⃣ **Guard / Pipe / Interceptor 实战 + 图解执行顺序**
3️⃣ **自己手写一个 `@CurrentUser()` 装饰器**

你选哪个，我直接带你写代码。
