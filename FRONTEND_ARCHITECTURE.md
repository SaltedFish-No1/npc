# NPC 前端架构开发说明（入门版）

本文面向入门级前端开发者，帮助你快速理解 NPC 项目的技术栈、目录结构以及核心数据流。阅读完后，你应该能根据业务需求定位到对应的模块，并按现有约定扩展功能。

## 技术栈与基础设施

- **构建/开发工具**：使用 Vite + TypeScript，`pnpm` 作为包管理器，提供 `dev`、`build`、`preview`、`lint`、`format`、`typecheck` 等脚本。详见 `package.json` 的 scripts 字段。【F:package.json†L1-L64】
- **框架/路由**：React 18 + React Router 6，入口在 `src/main.tsx`，通过 `BrowserRouter` 渲染 `App` 组件。【F:src/main.tsx†L1-L17】
- **数据请求与缓存**：使用 TanStack Query 提供请求缓存、订阅和失效控制，全局在 `App` 中创建 `QueryClientProvider`。【F:src/app/App.tsx†L11-L25】
- **状态管理**：UI 层使用 Zustand 管理本地 UI 状态（设置弹窗、调试面板、API Key 持久化）以及系统日志。【F:src/stores/uiStore.ts†L4-L29】【F:src/stores/chatStore.ts†L3-L26】
- **国际化**：集成 i18next 与语言切换（`src/i18n`），`ChatFeature` 中通过 `useTranslation` 和语言工具函数进行切换。【F:src/features/chat/ChatFeature.tsx†L11-L96】
- **通知/反馈**：使用 Sonner 提示条（`<Toaster />` 全局挂载在 `App` 中）。【F:src/app/App.tsx†L17-L25】

## 目录总览

- `src/main.tsx`：应用入口，挂载路由与根组件。
- `src/app/App.tsx`：初始化国际化、全局样式、错误边界、React Query，并声明路由。
- `src/app/routes`：路由组件；当前只有聊天页 `ChatPage`，懒加载 `ChatFeature`。
- `src/features/chat`：聊天相关的 UI、逻辑与样式，是主要开发区域。
- `src/hooks`：可复用的业务钩子，例如匿名鉴权、会话订阅。
- `src/services`：与外部世界交互的纯函数（LLM、图片生成、会话读写、匿名登录、Prompt 组装）。
- `src/stores`：Zustand store（UI 状态、调试日志）。
- `src/config`：业务配置（角色资料、常量、环境变量、国际化工具等）。

## 渲染层级与路由

1. `main.tsx` 挂载根节点并注入 `BrowserRouter`。【F:src/main.tsx†L1-L17】
2. `App.tsx` 包裹错误边界、React Query Provider 与全局提示，配置 `/` -> `ChatPage` 路由。【F:src/app/App.tsx†L13-L25】
3. `ChatPage` 仅返回 `ChatFeature`，保持路由层与业务解耦。【F:src/app/routes/chat/ChatPage.tsx†L1-L5】

## ChatFeature：页面骨架

`ChatFeature` 负责组织聊天页的所有子组件与数据流：【F:src/features/chat/ChatFeature.tsx†L23-L157】

- **布局**：`ChatSidebar`（头像、状态、API Key 按钮） + 主面板（`ChatHeader`、`ChatMessages`、`ChatInput`），并挂载浮动的 `DebugPanel` 与 `SettingsModal`。
- **UI 状态**：从 `useUIStore` 读取设置/调试开关与 API Key；从 `useChatStore` 读取系统日志。【F:src/features/chat/ChatFeature.tsx†L24-L37】
- **数据加载**：通过 `useChatController` 拉取会话、拼接流式内容、处理发送状态与错误。【F:src/features/chat/ChatFeature.tsx†L28-L71】
- **国际化与标题**：根据当前语言选择角色文案，更新 `document.title`；提供语言切换回调。【F:src/features/chat/ChatFeature.tsx†L71-L97】
- **Fallback 逻辑**：当角色处于爆发状态或头像缺失时切换备用头像；流式回复期间在消息列表尾部插入“预览”消息。【F:src/features/chat/ChatFeature.tsx†L47-L69】
- **错误兜底**：鉴权或会话加载失败时显示错误提示。【F:src/features/chat/ChatFeature.tsx†L84-L91】

## 数据流与业务钩子

### 匿名鉴权（useAuth）

- 使用 `services/auth.ts` 在浏览器 `localStorage` 生成/缓存匿名用户 ID，并支持订阅变更。【F:src/services/auth.ts†L1-L74】
- `useAuth` 在组件挂载时确保用户存在，并在状态更新时触发组件重渲染。【F:src/hooks/useAuth.ts†L4-L19】

### 会话获取与订阅（useChatSession）

- 基于 TanStack Query：`queryKey` 为 `['session', userId]`，只有存在 userId 才会触发加载。【F:src/hooks/useChatSession.ts†L6-L17】
- 使用 `subscribeSession` 监听本地存储更新，实时刷新缓存数据。【F:src/hooks/useChatSession.ts†L19-L27】

### ChatController：聊天业务中枢

`useChatController` 封装了输入状态、会话写入、提示词生成和外部接口调用：【F:src/features/chat/hooks/useChatController.ts†L24-L202】

- **基础状态**：保存输入框文本、流式内容、发送/生成中状态，以及草稿图片提示词。【F:src/features/chat/hooks/useChatController.ts†L33-L40】
- **设置/密钥**：提交设置表单时只持久化 API Key 并关闭弹窗。【F:src/features/chat/hooks/useChatController.ts†L43-L47】
- **头像生成**：根据当前压力值选择 calm/overload 提示词，调用图片接口并更新会话头像缓存与提示。【F:src/features/chat/hooks/useChatController.ts†L49-L79】
- **会话重置**：清空当前用户的本地会话并让 React Query 失效。【F:src/features/chat/hooks/useChatController.ts†L81-L85】
- **消息发送流程**：
  1. 校验输入、用户、会话与 API Key 状态；
  2. 构建系统提示词与上下文消息（只取最近 8 条）；
  3. 调用 `streamChatCompletion` 获取流式文本，在 `onChunk` 中累积；
  4. 如果返回了 `image_prompt`，调用 `generateImage` 生成插画；
  5. 计算下一轮 stress/trust 数值与模式（NORMAL/???%）；
  6. 将用户消息、AI 消息与新状态写入 React Query 缓存，并通过 `appendTurn` 持久化；
  7. 处理异常与提示，最后复位发送状态。【F:src/features/chat/hooks/useChatController.ts†L87-L182】

## 状态与持久化

- **UI Store**：只持久化 API Key（localStorage），其余 UI 标志为非持久化，以防污染跨设备状态。【F:src/stores/uiStore.ts†L13-L27】
- **系统日志 Store**：维护最多 200 条调试日志，可在 DebugPanel 中查看。【F:src/stores/chatStore.ts†L16-L26】
- **会话数据**：`sessionService` 将数据存在内存 + localStorage，支持订阅与初始默认值（角色状态、默认问候）。提供 `appendTurn`、`updateAvatar`、`resetSession` 等接口。【F:src/services/sessionService.ts†L1-L156】

## 与后端/模型交互

- **聊天/流式接口**：`chatService` 封装文本模型请求与流式解析，允许通过 `onChunk` 回调实时拼接内容，并对返回的 JSON 结果进行 schema 校验，异常时抛出错误。【F:src/services/chatService.ts†L1-L152】
- **图片生成**：同一文件提供 `generateImage`，按比例映射输出尺寸并返回 URL。【F:src/services/chatService.ts†L154-L189】
- **提示词构建**：`promptService` 根据角色配置和当前状态生成系统提示词，约束输出 JSON 格式和语言。【F:src/services/promptService.ts†L1-L18】

## 角色与文案配置

- `config/characterProfile.ts` 定义角色档案、形象风格、状态文案与头像提示词，同时为会话提供默认状态与问候语引用。【F:src/config/characterProfile.ts†L1-L89】
- 国际化标签和应用标题通过 `getActiveNpcLocalization` 按语言选择，用于 `ChatFeature` 的标题与副标题展示。【F:src/features/chat/ChatFeature.tsx†L71-L120】

## 开发者工作流建议

1. **启动/调试**：运行 `pnpm dev`，默认路由指向聊天页；使用浮动的 bug 按钮查看调试日志。【F:package.json†L7-L15】【F:src/features/chat/ChatFeature.tsx†L139-L149】
2. **添加功能**：
   - 纯展示/交互：在 `features/chat/components` 下新增组件，并通过 `ChatFeature` 组合。
   - 数据请求：在 `services` 中新增纯函数，并在自定义 hook 中封装；利用 React Query 缓存和订阅机制。
   - 状态：若是 UI 级别或调试数据，优先考虑在 `stores` 中扩展 Zustand 状态。
3. **编码规范**：保持无 try/catch 包裹 import（遵循仓库代码风格）；使用 TypeScript 类型（schemas 下的 zod 结构可以复用）；提交前运行 `pnpm lint` 和 `pnpm typecheck`。

## 常见扩展场景参考

- **新增角色**：在 `config/characterProfile.ts` 中添加 Profile、模型模板和本地化文案，并调整 `getActiveCharacterModel` 选择逻辑。
- **改进消息列表**：在 `ChatMessages` 组件内处理 UI 需求，同时确保使用 `messages` 属性中的 `liveContent` 预览逻辑保持不变。【F:src/features/chat/ChatFeature.tsx†L55-L69】
- **接入新的后端**：在 `services/chatService.ts` 中抽象 API 地址与 header，或在 `config/constants` 中增加新的模型名称和基础 URL。

通过以上结构，你可以从入口到业务核心快速定位文件，并按职责分层的方式进行修改或扩展。
