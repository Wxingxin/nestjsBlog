# introduct

## nestjs 是什么

Nest (NestJS) 是一个用于构建高效、可扩展的 Node.js 服务器端应用的框架。它使用渐进式 JavaScript，构建并完全支持 TypeScript（但仍然允许开发者使用纯 JavaScript 进行编码）并结合了 OOP（面向对象编程）、FP（函数式编程）和 FRP（函数式反应式编程）的元素。

在幕后，Nest 使用强大的 HTTP 服务器框架，如 Express（默认），也可以选择配置为使用 Fastify！

Nest 在这些常见的 Node.js 框架（Express/Fastify）之上提供了一个抽象级别，但也直接向开发者公开了它们的 API。这使开发者可以自由使用可用于底层平台的无数第三方模块。

## nestjs 设计的哲学

近年来，得益于 Node.js，JavaScript 已成为前端和后端应用的 Web“通用语言”。这催生了 Angular、React 和 Vue 等出色的项目，它们提高了开发者的工作效率，并支持创建快速、可测试和可扩展的前端应用。但是，虽然 Node（和服务器端 JavaScript）存在大量出色的库、辅助程序和工具，但它们都无法有效解决架构的主要问题。

Nest 提供开箱即用的应用架构，允许开发者和团队创建高度可测试、可扩展、松耦合且易于维护的应用。该架构深受 Angular 的启发。

## 创建 nestjs 项目

1. 准备

::: warning
要安装 nestjs，你需要先安装 Node.js 和 npm（Node.js 的包管理器）。安装完成后，你可以使用 npm 来安装 nestjs。

```bash
npm install -g @nestjs/cli
```

:::

2. 创建项目

```bash
nest new <项目名称>
```

3. 进入项目目录

```bash
cd <项目名称>
```

4. 安装依赖

```bash
npm install
```

5. 启动项目

```bash
npm run start
```

## 项目查看

在`src`中有**5**的文件夹

:::tip

```bash
src -
    |- app.controller.spec.ts //测试ts代码，开始学习不用管
    |- app.controller.ts
    |- app.module.ts
    |- app.service.ts
    |- main.ts
```

:::

### 1. `main.ts`

```js
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

:::tip IMPORT
` import { NestFactory } from "@nestjs/core";`

- NestFactory 是 NestJS 框架用来**创建应用实例（app）**的工厂类。

- 你可以理解为：NestJS 程序启动时，需要先创建“应用对象”，NestFactory 就是帮你创建这个对象的工具。

`import { AppModule } from "./app.module";`

- AppModule 是你项目的根模块。

- NestJS 是一个“模块化”的框架，所有功能都被划分成 module。

- AppModule 就是整个项目的入口模块，里面告诉 NestJS：有哪些模块、控制器、服务需要加载。

:::

`async function bootstrap() {}`

- NestJS 的启动流程是异步的（因为创建 app、监听端口等操作可能耗时）。

- 所以这里用 async function 写启动函数，名字叫 bootstrap（引导、启动）。

` const app = await NestFactory.create(AppModule);`

- 创建一个 Nest 应用实例。

- 传入根模块 AppModule，NestJS 会自动把里面的所有 providers、controllers 都初始化好。

- 创建完成后，你就得到一个 app 对象，后续你可以：

- 设置全局前缀

- 注册全局中间件

- 开启 CORS

- 注册过滤器、管道等等

` await app.listen(process.env.PORT ?? 3000);`

- 启动 HTTP 服务，监听某个端口。

- process.env.PORT 表示环境变量里的 PORT（常见于云服务器部署，如 Render、Vercel、Heroku）。

- ?? 3000 表示 如果没有 PORT，就使用 3000 端口。

- ??（Nullish coalescing operator）：只有当左侧是 null 或 undefined 才用右边的值。

`bootstrap();`

- 调用刚刚定义的 bootstrap 函数，启动 NestJS 应用。

### 2. `app.module.ts`

```js
import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

:::tip IMPORT

`import { Module } from "@nestjs/common";`

- NestJS 的模块是通过 @Module() 装饰器定义的。

- 模块是 Nest 整个项目的基本组织结构，类似于“功能包”。

`import { AppController } from "./app.controller";`
`import { AppService } from "./app.service";`

- 导入你在项目里定义的控制器和服务。

- AppController 处理路由（如 GET、POST）。

- AppService 是一个提供业务逻辑的服务。

- Nest 推荐：控制器负责处理请求，服务负责处理业务逻辑。

:::

---

:::info SERVE

```js
//这是 Nest 模块的配置对象，包含 3 个核心字段：
@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService],
})

```

`imports: []`

导入其他模块（Module）。

用来让一个模块使用另一个模块的 service、controller。

当前是空数组，说明 AppModule 没有依赖其他模块。

示例（未来你可能会写成这样）：

imports: [UsersModule, AuthModule, DatabaseModule]

`② controllers: [AppController]`

指定当前模块里有哪些控制器要加载。

控制器负责处理 HTTP 请求，例如：

```ts
@Get('hello')
getHello() {
  return 'Hello Nest';
}

```

Nest 会自动扫描并注册这些路由。

`③ providers: [AppService]`

指定要提供给 Nest 的依赖注入容器的服务。

服务通常用来写业务逻辑，比如数据库查询、计算等。

示例：

```ts
@Injectable()
export class AppService {
  getHello() {
    return "Hello Nest!";
  }
}
```

控制器可以这样使用：
```ts
constructor(private readonly appService: AppService) {}
```
:::

`export class AppModule {}`

- 定义一个 Class，它就是整个应用的根模块。

- bootstrap（启动文件）里会用它创建应用：

- await NestFactory.create(AppModule);

### 3. `app.controller.ts`

```js
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}

```

:::tip IMPORT

:::

### 4. `app.service.ts`

```js
import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
  getHello(): string {
    return "Hello World!";
  }
}
```

:::tip IMPORT

:::
