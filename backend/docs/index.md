# 使用说明

欢迎来到 NPC 后端文档站。本章节汇总了开发与部署过程中最常用的操作，帮助你快速启动服务、了解鉴权方式，并在需要时构建这份文档站。

## 快速开始

1. **安装依赖**
   ```bash
   cd backend
   pnpm install
   ```
2. **配置环境变量**
   ```bash
   cp .env.example .env
   # 按需填写 NPC_GATEWAY_KEY、LLM_API_KEY、DB_URL 等
   ```
3. **启动开发服务器**
   ```bash
   pnpm dev
   ```
4. **必要的外部服务**
   - PostgreSQL（启用 `vector` 扩展）
   - 可选 Redis：配置 `REDIS_URL` 后用于会话缓存
   - 上游 LLM / 图像模型：由 `LLM_API_BASE`、`TEXT_MODEL_NAME`、`IMG_MODEL_NAME` 控制

## 运行方式

| 场景 | 命令 | 说明 |
| --- | --- | --- |
| 开发 | `pnpm dev` | tsx watch，热重载 Fastify 服务 |
| 构建 | `pnpm build` | 输出 `dist/`，用于生产部署 |
| 生产 | `pnpm start` | 运行编译后的入口 `dist/index.js` |
| 类型检查 | `pnpm typecheck` | 确保 TS 严格模式通过 |
| 测试 | `pnpm test` | 运行 Vitest 集成测试 |

## 必备请求头

除 `/health` 外的接口均需携带：

```http
x-api-key: <NPC_GATEWAY_KEY>
```

可在 `.env` 或部署环境中统一配置。

## 文档站点

本目录即 VitePress 文档工程，提供以下指令：

```bash
# 文档实时预览（默认 http://localhost:5173）
pnpm docs:dev

# 生成静态站点到 docs/.vitepress/dist
pnpm docs:build

# 预览打包后的站点
pnpm docs:preview
```

如需扩展目录，可直接新增 Markdown 文件并在 `.vitepress/config.ts` 中维护导航/侧边栏。

## 下一步

- 前往 [API 参考](./api/index.md) 了解所有接口与参数
- 阅读 [服务架构说明](./service-arch.md) 了解依赖关系与数据流
