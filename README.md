# harness-admin-ui

后台管理前端模板，技术架构参照 `vue3-admin-develop-template`，
并剥离其内部私有依赖，改为可独立运行的标准实现。

## 技术栈

| 分类 | 选型 | 版本 |
|------|------|------|
| 框架 | Vue 3 + TypeScript | 3.5 / 5.9 |
| 构建 | Vite（替代模板里的私有 `@ziroom/mio-rspack`） | 8.3 |
| 路由 | Vue Router（Hash 模式） | 4.6 |
| 状态 | Pinia | 3.0 |
| UI | Element Plus + `@element-plus/icons-vue` | 2.14 / 2.3 |
| 请求 | axios（自行封装拦截器，替代 `@ziroom/manticore-utils`） | 1.20 |
| 样式 | Sass + CSS 变量设计令牌 | 1.104 |
| 按需引入 | unplugin-auto-import + unplugin-vue-components | 21 / 32 |
| 规范 | ESLint（flat config）+ Prettier + Commitlint + Commitizen | ESLint 10 |

## 与参考模板的差异

模板中依赖内部能力、无法独立运行的部分，替换为标准实现，**分层与目录结构保持不变**：

| 模板中的实现 | 本项目 |
|--------------|--------|
| `@ziroom/mio-rspack` 构建 | Vite，环境变量由 `process.env.MIO_*` 改为 `import.meta.env.VITE_*` |
| `@ziroom/manticore-utils` 的 `API` 类 | `src/services/request.ts`：单个 axios 实例 + 请求/响应拦截器 |
| `@ziroom/uc-auth` 登录态与路由守卫 | `src/plugins/permission.ts` + `src/store/user.ts` 的 token |
| `@ziroom/icons-vue3` 图标 | `@element-plus/icons-vue` |
| `@ziroom/eslint-config-infra` | 公共 ESLint flat config |
| `mio-rspack.mjs` / GitLab CI / Docker / husky | 未引入（模板自带，非技术架构必需） |

模板中未被实际引用的依赖（`@vueuse/core`、`lodash-es`、`dayjs`、`@ziroom/manticore-api`、
`vue3-clipboard`）与文件（`styles/var.scss`、`icons.ts`、`store/refresh.ts`、
`environment/host.ts`、`environment/appType.ts`、Filter/Table 组件）也一并去掉，避免空壳。

## 快速开始

需要 Node 18+ 与 pnpm，**无需任何私有源**：

```bash
pnpm install
pnpm dev          # 开发服务，默认 http://localhost:5173
pnpm build        # 构建到 dist/
pnpm type-check   # vue-tsc 类型检查
pnpm lint         # ESLint，--max-warnings 0
pnpm format       # Prettier 格式化
pnpm cz           # 交互式生成符合 conventional 规范的提交信息
```

## 环境变量

`VITE_` 前缀才会注入到前端代码，见 `.env.development` / `.env.production`：

| 变量 | 说明 |
|------|------|
| `VITE_ENV` | 环境标识，`src/environment/index.ts` 据此暴露 `env` / `isProduction()` |
| `VITE_API_URL` | 请求前缀，开发环境为 `/api`，生产留空表示同源 |
| `VITE_PROXY_TARGET` | 开发代理目标，默认指向 `http://localhost:8082` |
| `VITE_PORT` | 开发服务端口 |

## 目录结构

```
src/
├── api/            业务接口封装，按模块拆分
├── components/     跨页面复用的通用组件（页面私有组件放同级 components/）
├── environment/    环境变量读取与环境判断
├── layout/         整体布局：侧边栏 / 顶栏 / 内容容器 / 标签页
├── plugins/        setting 全局配置、permission 路由守卫
├── router/         路由声明（含 meta 约定）与 keep-alive 容器
├── services/       axios 实例、拦截器、统一错误提示
├── store/          Pinia：user / app / tagView
├── styles/         设计令牌、Element Plus 主题覆盖、工具类
├── types/          unplugin 自动生成的类型声明
├── utils/          通用工具函数
└── views/          页面
```

## 约定

### 路由 meta

| 字段 | 说明 |
|------|------|
| `title` | 菜单与标签页标题 |
| `icon` | 菜单图标（组件引用） |
| `hidden` | 不在菜单中展示（详情页等） |
| `alwaysShow` | 即使只有一个子路由，也渲染为分组 |
| `keepAlive` | 开启缓存，由 `src/router/view.vue` 承载 |
| `noCache` | 不进入标签页缓存列表 |
| `role` | 命中权限校验，需 `userStore.menulist` 包含该值 |
| `affix` | 标签页固定，不可关闭 |
| `activeMenu` | 非菜单页指定高亮的菜单项 |

`meta.role` 未声明时路由始终放行；声明后由 `src/plugins/permission.ts` 的全局前置守卫校验，
不通过则跳 `/404`。

### 接口封装

页面只调用 `src/api/<模块>/index.ts` 中的函数，不直接用 axios：

```ts
import request from "@/services/request";

export const queryList = request.POST<IListResponse, IQueryBody>("/xxx/list");
```

`request` 自动带 `userStore.token`，并按 `code === 200 || code === 0` 校验业务结果，
失败统一提示并 reject。

### 权限指令

```html
<!-- 无权限时移除元素 -->
<el-button v-auth="'order:delete'">删除</el-button>
<!-- 无权限时保留元素但置灰 -->
<el-button v-auth.usable="'order:edit'">编辑</el-button>
```

指令读取 `userStore.functions`，未接入鉴权服务时该数组为空，`v-auth` 会移除元素。

### 标签页

顶部多标签页默认关闭，在 `src/plugins/setting.ts` 把 `openTagView` 置为 `true` 开启。

## 注意

- 内置页面（`src/views/Home`、`UsageGuide`、`MenuDemo`、`NoFound`）是演示与自检用途，
  接入业务时按需替换。
- `pnpm build` 不包含类型检查，类型检查是独立的 `pnpm type-check`。
