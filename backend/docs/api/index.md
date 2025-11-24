# API 参考

面向网关/前端的全部后端接口都集中在 `/api/npc/*` 与 `/api/characters` 下。本页列出每个端点的用途、参数、请求示例与典型响应，方便在集成或调试时查阅。

> **鉴权**：除 `/health` 外，所有接口都必须在请求头中附带 `x-api-key: <NPC_GATEWAY_KEY>`。

## 约定

- **Base URL**：默认 `http://localhost:4000`。在前端开发环境中通过 `/npc-api` 代理到该地址。
- **时间戳**：`createdAt/updatedAt` 均为 `number`（毫秒）。
- **语言码**：使用 ISO 639-1 小写（如 `en`、`zh-cn`）。
- **分页**：`limit` 默认为 50，`nextCursor` 可直接回传到同一端点继续翻页。

## 接口速览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/health` | 免鉴权健康检查 |
| GET | `/api/characters` | 列出可用角色（可按语言过滤） |
| POST | `/api/characters/:id/activate` | 激活并获取初始会话 |
| POST | `/api/npc/chat` | 单次聊天回合 |
| POST | `/api/npc/chat/stream` | SSE 流式聊天 |
| POST | `/api/npc/images` | 根据意图/情绪生成图片，可回写头像 |
| GET | `/api/npc/sessions/:id` | 拉取单个会话概览（最近消息+状态） |
| GET | `/api/npc/sessions/:id/messages` | 会话消息游标分页（历史回放） |
| GET | `/api/npc/sessions/:id/persona` | 获取 DigitalPersona 运行态 |
| PATCH | `/api/npc/sessions/:id/persona` | 更新 DigitalPersona 运行态 |
| GET | `/api/npc/avatars` | 查看历史生成的头像库 |
| POST | `/api/npc/sessions/:id/avatar` | 将选中的头像绑定到会话 |
| GET | `/api/npc/memory-stream` | 读取角色长期记忆流 |

---

## 角色与会话

### GET `/api/characters`

**查询参数**

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `languageCode` | `string?` | 仅返回支持该语言的角色 |

**响应示例**

```json
[
  {
    "id": "mob",
    "name": "Shigeo Kageyama",
    "codename": "Mob",
    "avatarUrl": "https://...",
    "languages": ["en", "zh-cn"],
    "capabilities": { "text": true, "image": true }
  }
]
```

### POST `/api/characters/:id/activate`

**Body**

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `sessionId` | `string` | 否 | 传入则复用会话，否则新建 |
| `languageCode` | `string` | 否 | 目标语言（默认 `en`） |

**响应示例**

```json
{
  "sessionId": "sess_123",
  "characterId": "mob",
  "languageCode": "en",
  "characterState": { "stress": 12, "mode": "NORMAL", "avatarUrl": "https://..." },
  "initialMessages": [
    { "role": "assistant", "content": "Hi... I'm Mob.", "messageId": "msg_1", "createdAt": 1732457600000 }
  ]
}
```

### GET `/api/npc/sessions/:id`

返回单个会话的元数据与最近 20 条消息，便于快速展示对话摘要。

**响应字段（节选）**

| 字段 | 说明 |
| --- | --- |
| `characterState` | 当前压力/信任/头像等状态 |
| `personaId` | 绑定的 DigitalPersona 静态 ID（若配置） |
| `personaRuntime` | 最新运行态 JSON，包含 `stress_meter`、`scene_context` 等 |

```json
{
  "sessionId": "sess_123",
  "characterId": "mob",
  "personaId": "c2d1-...",
  "personaRuntime": {
    "stress_meter": { "current_level": 42, "active_triggers": ["User doubts ability"] },
    "scene_context": { "current_goal": "说服用户冷静", "current_tactic": "讲道理" }
  },
  "messages": ["..."]
}
```

### GET `/api/npc/sessions/:id/messages`

**查询参数**

| 参数 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `limit` | `number` | `50` | 每页条数 (1~200) |
| `cursor` | `string` | - | 形如 `1700000000000:msg_id`，作为“上一页最旧消息”的指针 |

**响应**

```json
{
  "items": [
    {
      "role": "assistant",
      "content": "Here is your answer",
      "messageId": "msg_assistant",
      "createdAt": 1732457700123,
      "imageUrl": "https://...",
      "imagePrompt": "Shigeo portrait..."
    }
  ],
  "nextCursor": "1732457600000:msg_user"
}
```

### GET `/api/npc/sessions/:id/persona`

若会话绑定了 DigitalPersona v2，将返回其 `personaId` 与运行态。若未配置则返回 `404`。

```json
{
  "sessionId": "sess_123",
  "personaId": "4b1c...",
  "personaRuntime": {
    "temporal_status": { "current_date": "2025-11-25T12:01:00Z", "calculated_age": 16 },
    "stress_meter": { "current_level": 55 }
  }
}
```

### PATCH `/api/npc/sessions/:id/persona`

按 `DigitalPersonaRuntimePatch`（参见 `docs/digital-persona.md`）提交运行态增量，服务端会做 Zod 校验并与现有状态深度合并。

**Body 字段示例**

```json
{
  "stress_meter": { "current_level": 70, "active_triggers": ["Time constraint"] },
  "scene_context": { "current_goal": "尽快结束对话", "current_tactic": "威胁" }
}
```

**响应**

```json
{
  "sessionId": "sess_123",
  "personaId": "4b1c...",
  "personaRuntime": {
    "stress_meter": { "current_level": 70, "active_triggers": ["Time constraint"] },
    "scene_context": { "current_goal": "尽快结束对话", "current_tactic": "威胁" }
  },
  "version": 12,
  "updatedAt": 1732541000000
}
```

## 聊天接口

### POST `/api/npc/chat`

**Body**

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `sessionId` | `string` | 二选一 | 已存在会话 ID |
| `characterId` | `string` | 二选一 | 当无会话时提供角色 ID |
| `languageCode` | `string` | 否 | 切换语言将触发重建会话 |
| `messages` | `Array<{role:'user'|'assistant',content:string}>` | 是 | 至少包含一条用户消息 |

**响应**

```json
{
  "sessionId": "sess_123",
  "characterState": { "stress": 30, "mode": "NORMAL" },
  "assistantMessage": { "role": "assistant", "content": "Hello!" },
  "imagePrompt": null,
  "sessionVersion": 7
}
```

> 提示：若角色配置了 DigitalPersona v2，会在本次调用后自动更新 `stress_meter`、`temporal_status` 等运行态，可通过 `GET /api/npc/sessions/:id/persona` 校验结果。

### POST `/api/npc/chat/stream`

与上方请求体一致，但返回 **SSE**：

- `event: chunk`：模型实时文本片段
- `event: final`：完整 payload（同非流式响应）
- `event: end`：流结束信号

客户端需监听 `text/event-stream` 并在 `final` 事件中读取 JSON。

## 图片与头像

### POST `/api/npc/images`

后端通过角色配置解析 prompt，前端只需描述意图。

**Body**

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `sessionId` | `string` | 二选一 | 会话上下文（优先） |
| `characterId` | `string` | 二选一 | 若无会话可仅凭角色生成 |
| `intent` | `'avatar'\|'scene'` | 否 | 默认 `avatar`，自动选择比例 |
| `avatarMood` | `string` | 否 | 头像情绪/标签（如 `normal`、`broken`） |
| `useImagePrompt` | `boolean` | 否 | 复用最近 AI 生成的 prompt（常用于助手请求图片） |
| `updateAvatar` | `boolean` | 否 | 为 `true` 时写入会话头像与库 |
| `metadata` | `Record<string,unknown>` | 否 | 自定义追踪信息 |

**响应**

```json
{
  "sessionId": "sess_123",
  "imageUrl": "https://...",
  "characterState": { "avatarUrl": "https://...", "avatarLabel": "broken" },
  "sessionVersion": 9,
  "avatar": {
    "id": "avatar_abc",
    "characterId": "mob",
    "statusLabel": "broken",
    "imageUrl": "https://..."
  }
}
```

### GET `/api/npc/avatars`

**查询参数**

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `characterId` | `string?` | 仅查看指定角色 |
| `includeGlobal` | `boolean?` | 是否包含全局共享头像（默认 true） |

### POST `/api/npc/sessions/:id/avatar`

Body: `{ "avatarId": "avatar_abc" }`。将指定头像绑定到会话并返回最新 `characterState`。

## 记忆与其他

### GET `/api/npc/memory-stream`

**查询参数**

| 参数 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `characterId` | `string` | - | 可选过滤条件 |
| `sessionId` | `string` | - | 可选过滤条件 |
| `limit` | `number` | 50 | 返回条数 (≤200) |
| `offset` | `number` | 0 | 偏移量 |

**响应**

```json
{
  "total": 120,
  "limit": 50,
  "offset": 0,
  "items": [
    {
      "id": "mem_1",
      "characterId": "mob",
      "sessionId": "sess_123",
      "type": "reflection",
      "content": "记了一次情绪爆发",
      "importance": 0.82,
      "createdAt": 1732457500000
    }
  ]
}
```

### GET `/health`

免鉴权，用于基础监控。

```json
{ "status": "ok", "db": true, "timestamp": 1732457600000 }
```
