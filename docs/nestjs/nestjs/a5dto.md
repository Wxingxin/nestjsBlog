下面这是一份 **「给 NestJS 小白看的 · 校验 & 转换装饰器（DTO 专属）使用大全 + 必懂知识点」**。
我会用**最白话的方式**讲清楚：**它们是干嘛的、怎么写、什么时候必须写**。

> 在 NestJS 中：
> **DTO + 校验/转换装饰器 = 后端的“安全网 + 类型守门员”**

---

# 🧠 一句话先建立直觉（非常重要）

```ts
@Post()
create(@Body() dto: CreateUserDto) {}
```

这行代码真正想表达的是：

> **“我只接受符合 CreateUserDto 规则的数据，不合格的一律拒绝”**

👉 **DTO 不是类型提示，而是运行时校验规则**

---

# 🧩 一、DTO 是什么？为什么必须用？

## 1️⃣ DTO 是什么

DTO = **Data Transfer Object（数据传输对象）**

```ts
export class CreateUserDto {
  email: string
  password: string
}
```

📌 在 NestJS 中，DTO 通常用于：

* `@Body()`
* `@Query()`
* `@Param()`

---

## 2️⃣ 不用 DTO 会怎样？❌

```ts
@Post()
create(@Body() body: any) {}
```

问题：

* ❌ 参数随便传
* ❌ 类型全靠猜
* ❌ 安全隐患极大
* ❌ 面试直接扣分

👉 **企业级 NestJS：DTO 是硬性要求**

---

# 🧩 二、校验装饰器（class-validator）

> 校验装饰器解决的问题：
> **“这个字段合不合法？”**

---

## 3️⃣ 最常用校验装饰器（必背）

### 字符串类

```ts
@IsString()     // 必须是字符串
@IsNotEmpty()  // 不能为空
@Length(6, 20) // 长度范围
```

```ts
password: string
```

---

### 数字类

```ts
@IsInt()       // 整数
@Min(1)
@Max(100)
```

---

### 布尔 / 数组

```ts
@IsBoolean()
@IsArray()
```

---

### 邮箱 / URL

```ts
@IsEmail()
@IsUrl()
```

---

### 可选字段（非常常用）

```ts
@IsOptional()
```

📌 **不加 `@IsOptional()`**

* 这个字段 = 必传

---

## 4️⃣ 示例：创建用户 DTO（标准写法）

```ts
export class CreateUserDto {
  @IsEmail()
  email: string

  @IsString()
  @Length(6, 20)
  password: string
}
```

---

# 🧩 三、转换装饰器（class-transformer）

> 转换装饰器解决的问题：
> **“把 string 转成你真正想要的类型”**

---

## 5️⃣ 最重要的一个：`@Type()`

### 问题场景（新手必踩）

```ts
/users?page=1
```

```ts
@Get()
find(@Query('page') page: number) {}
```

❌ 实际上：

```ts
typeof page === 'string'
```

---

### 正确写法（DTO + @Type）

```ts
export class QueryUserDto {
  @Type(() => Number)
  @IsInt()
  page: number
}
```

```ts
@Get()
find(@Query() query: QueryUserDto) {}
```

---

## 6️⃣ `@Transform()` —— 自定义转换（了解）

```ts
@Transform(({ value }) => value.trim())
@IsString()
name: string
```

📌 使用场景：

* 去空格
* 自定义格式处理

---

# 🧩 四、校验 & 转换是如何生效的？（核心原理）

👉 **必须开启全局 ValidationPipe**

```ts
// main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
  }),
)
```

---

## 7️⃣ 这两个配置你必须懂

### `whitelist: true`

👉 **只保留 DTO 中声明的字段**

```ts
{
  email: 'a@b.com',
  password: '123456',
  role: 'admin' // ❌ 会被自动丢弃
}
```

---

### `transform: true`

👉 **允许类型转换（@Type 生效）**

---

# 🧩 五、常见 DTO 使用场景大全

---

## 8️⃣ Body DTO（最常见）

```ts
@Post()
create(@Body() dto: CreateUserDto) {}
```

---

## 9️⃣ Query DTO（分页 / 搜索）

```ts
@Get()
find(@Query() query: QueryUserDto) {}
```

---

## 🔟 Update DTO（PartialType）

```ts
export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

📌 特点：

* 所有字段自动变成可选
* 官方推荐写法

---

# 🧩 六、新手最常犯的 7 个错误 ❌

---

1️⃣ DTO 当 interface 用（❌ interface 没运行时）
2️⃣ 忘记开 `ValidationPipe`
3️⃣ Query 不做类型转换
4️⃣ Update DTO 手写一堆 `@IsOptional()`
5️⃣ `@Body()` 用 `any`
6️⃣ 以为 TS 类型能校验数据
7️⃣ Controller 里手写校验逻辑

---

# 🧠 七、工程级理解（一定要有）

```txt
HTTP Request
 ↓
DTO 实例化
 ↓
class-transformer（类型转换）
 ↓
class-validator（规则校验）
 ↓
Controller
 ↓
Service
```

---

# 🧠 一句话终极总结（请记住）

> * **DTO = 数据白名单**
> * **校验装饰器 = 安全**
> * **转换装饰器 = 正确类型**
> * **ValidationPipe 是灵魂**
> * **DTO 是 NestJS 项目的底线规范**

---

## 🚀 下一步我强烈建议你学这个（正好衔接）

你现在已经掌握了 **NestJS 数据安全的核心**，下一步最合理的是👇

1️⃣ **Pipe（ParseIntPipe / 自定义 Pipe 深度）**
2️⃣ **异常处理（HttpException / Filter）**
3️⃣ **Update DTO / PartialType / PickType / OmitType 全家桶**

你选一个，我继续用**小白友好 + 项目级写法**带你学。
------------------------------

下面我用**“文件放哪 + 在哪用 + 实际怎么流动”**这 3 个层次，把 **DTO 在 NestJS 项目中到底怎么用**一次性讲清楚。
你按这个来，**不会乱、不会用错、也符合企业项目规范**。

> 在 NestJS 中：
> **DTO 只在“接口边界层”使用，用来保护系统，不参与业务实现**

---

## 一、DTO 文件放在哪里？（最标准做法）

### ✅ 推荐目录结构（官方 + 企业通用）

```
src/
├── user/
│   ├── dto/
│   │   ├── create-user.dto.ts
│   │   ├── update-user.dto.ts
│   │   └── query-user.dto.ts
│   ├── user.controller.ts
│   ├── user.service.ts
│   └── user.module.ts
```

### 📌 记住一句话

> **DTO 永远跟“模块”走，不是全局随便放**

❌ 不推荐：

```
src/dtos/
src/common/dto/
```

---

## 二、DTO 在哪些文件中使用？（结论先给你）

| 文件                    | 能不能用 DTO | 说明            |
| --------------------- | -------- | ------------- |
| `Controller`          | ✅ 必须用    | 接收外部数据        |
| `Service`             | ❌ 不推荐    | Service 只关心业务 |
| `Repository / Prisma` | ❌ 禁止     | DTO ≠ 数据模型    |
| `Module`              | ❌ 不用     | Module 只负责注册  |
| `Pipe / Guard`        | ⚠️ 偶尔    | 高级场景          |

👉 **99% 情况：DTO 只出现在 Controller 方法参数中**

---

## 三、DTO 是“怎么使用”的？（核心）

### 1️⃣ 最典型用法：`@Body() + DTO`

#### `create-user.dto.ts`

```ts
import { IsEmail, IsString, Length } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 20)
  password: string;
}
```

#### `user.controller.ts`

```ts
@Post()
create(@Body() dto: CreateUserDto) {
  return this.userService.create(dto);
}
```

📌 这里发生了什么？

1. 客户端发请求
2. Nest 把 `body` 转成 `CreateUserDto` 实例
3. 校验不通过 → **直接 400**
4. 校验通过 → 才进入 Service

---

## 四、DTO 在 Controller → Service 中如何“传递”

### 正确写法（推荐）

```ts
@Post()
create(@Body() dto: CreateUserDto) {
  return this.userService.create(dto);
}
```

```ts
create(dto: CreateUserDto) {
  // dto 已经是安全、干净的数据
}
```

📌 **重点理解**

* DTO 在 Controller 中完成使命
* Service 只是“接收一个干净对象”

---

## 五、常见 DTO 使用场景大全（你以后天天用）

---

### 2️⃣ Query DTO（分页 / 搜索）

#### `query-user.dto.ts`

```ts
import { IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryUserDto {
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  page?: number;
}
```

#### Controller 使用

```ts
@Get()
findAll(@Query() query: QueryUserDto) {
  return this.userService.findAll(query);
}
```

---

### 3️⃣ Update DTO（强烈推荐写法）

#### `update-user.dto.ts`

```ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

📌 好处：

* 自动把字段变成可选
* 不重复写校验规则
* 官方推荐

---

### 4️⃣ Param DTO（了解即可）

一般 `@Param('id')` 就够了
但你也可以这样写（复杂参数时）：

```ts
export class IdParamDto {
  @IsInt()
  @Type(() => Number)
  id: number;
}
```

```ts
@Get(':id')
findOne(@Param() params: IdParamDto) {}
```

---

## 六、DTO 不该出现在哪里？（小白必看）

### ❌ 在 Service 里 new DTO

```ts
const dto = new CreateUserDto(); // ❌
```

### ❌ 把 DTO 当数据库模型

```ts
prisma.user.create({ data: dto }); // ❌ 概念混乱
```

### ❌ DTO 写成 interface

```ts
interface CreateUserDto {} // ❌ 没运行时
```

📌 **原则**

> DTO = 接口层
> Entity / Model = 数据层

---

## 七、DTO 是如何“生效”的？（你至少要懂 1 次）

### main.ts（必须有）

```ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
  }),
);
```

📌 否则：

* DTO 校验不会生效
* `@Type()` 不会转换

---

## 八、DTO 的“生命周期图”（非常重要）

```txt
HTTP Request
 ↓
@Controller
 ↓
@Body / @Query / @Param
 ↓
DTO 实例化
 ↓
class-transformer（类型转换）
 ↓
class-validator（校验）
 ↓
Controller 方法
 ↓
Service
```

---

## 九、一句话终极总结（你可以背）

> * **DTO 文件放在模块的 `dto/` 目录**
> * **DTO 只在 Controller 使用**
> * **DTO = 数据白名单 + 校验规则**
> * **Service 永远只处理“干净数据”**
> * **没有 DTO = 不规范 NestJS 项目**

---

## 🚀 下一步学习建议（强烈）

你现在已经完全掌握 **DTO 的定位和用法**，下一步最自然的是：

1️⃣ **Pipe：ValidationPipe / ParseIntPipe 深度**
2️⃣ **异常是怎么被 DTO 校验抛出的（Exception Filter）**
3️⃣ **DTO vs Entity vs Prisma Model 的清晰边界**

你选一个，我继续给你“按真实项目标准”往下讲。
