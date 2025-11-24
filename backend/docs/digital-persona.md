# DigitalPersona v2 角色模型

> 基于戏剧理论（Egri / Stanislavski / McKee）构建的数字化人模型，将不可变的角色设定（ROM）与高频更新的运行时状态（RAM）彻底解耦，确保 Prompt Engine 能稳定复用角色人格并在会话中实时响应情绪变化。

## 总览

| 维度 | 存储层 | 更新频率 | 作用 |
| --- | --- | --- | --- |
| `static_profile` | Vector DB / System Prompt 前缀 | 几乎不变 | 承载角色设定（身份、背景、性格、压力逻辑）
| `runtime_state` | Context Window / Redis | 每次对话轮次 | 记录剧情现场数据（时间、职业、压力值、关系矩阵）

Prompt Engine 读取两部分内容后进行模板渲染，其中静态部分提供角色“是谁”，动态部分描述“此刻发生了什么”。

## Part 1：Static Definition（ROM）

### 1. 元信息 `meta`
- `id`：角色唯一 UUID，用于多智能体系统的检索锚点。
- `name`：角色展示名称。
- `version`：设定版本（如 `v1.0` 纯良、`v2.0` 黑化），便于在不同剧情时间线切换。

### 2. 生理维度 `physiology`
- `date_of_birth`：必须存日期而非年龄，方便计算回忆篇或未来篇的年龄。
- `gender`：`Male|Female|Non-binary|Other`。
- `voice`：为 TTS 与文本描写提供 `timbre` 与 `base_pitch`。
- `appearance_fixed`：不可变特征描述（身高、疤痕等）。

### 3. 社会维度 `sociology`
反映角色出生背景：
- `origin_background`：社会阶层/成长环境。
- `education_history`：教育经历数组，影响词汇量与知识面。
- `family_structure`：原生家庭结构，用来推测与权威或亲密关系的应激反应。

### 4. 心理维度 `psychology`
- `mbti`：`^[EI][NS][TF][JP]$` 约束，用于宏观语气指引。
- `big_five`：0.0-1.0 的大五人格矩阵，控制细致的语言习惯。
- `moral_alignment`：D&D 阵营（如 `Chaotic Neutral`），用于决策冲突场景。

### 5. 动力引擎 `drive_engine`
- `super_objective`：角色终生追求。
- `core_fear`：最害怕的结果，驱动防御机制。

### 6. 压力规则 `stress_rules`
仅定义逻辑，不存储数值：
- `triggers[]`：哪些事件会叠加压力以及敏感度值 (1-10)。
- `response_patterns`：根据压力区间给 Prompt 层不同的覆盖策略：
  - `mask_mode`（<30）：维持礼貌的伪装；
  - `defense_mode`（30-70）：启用讽刺/转移等防御动作；
  - `breakdown_mode`（>70）：彻底崩溃或失语。

## Part 2：Runtime State（RAM）

### 1. 时间状态 `temporal_status`
- `current_date`：当前剧情时间。
- `calculated_age`：由 `current_date - date_of_birth` 计算，用于自动调整语气。

### 2. 当前状态 `current_status`
- `occupation` / `social_class`：实时职业、阶级。
- `health_status`：即时身体状况（受伤、醉酒等）。
- `appearance_variable`：可变外观（穿着、污染）。

### 3. 压力动态 `stress_meter`
- `current_level`：0-100 的压力指针，驱动 `response_patterns` 的选择。
- `active_triggers[]`：当前激活的压力源（字符串列表）。

### 4. 场景目标 `scene_context`
- `current_goal`：本场戏角色想达成的目的。
- `current_tactic`：为达目的采取的手段（卖惨、威胁等）。

### 5. 关系矩阵 `relationship_matrix`
数组形式记录：
- `target_id`：用户或其他 NPC 的 ID。
- `trust_level`：-100~100 信任度。
- `knowledge_about_target`：掌握的信息，用于塑造对话中的“知情差”。

## 集成建议

1. **存储层**：
   - `static_profile` 建议落在角色配置（YAML）+ 向量库，或作为系统 Prompt 固定段。
   - `runtime_state` 可放入 Redis / SessionStore，并在每次用户轮次后更新。
2. **PromptEngine 接口**：
   - 传入 `static_profile` 和 `runtime_state`，并根据 `stress_meter.current_level` 选择合适的模板段落。
3. **API 设计**：
   - `SessionService` 在 `getSessionContext` 里返回完整 schema；
   - `MemoryService` 负责把 `relationship_matrix` 与记忆检索结果拼接；
   - 多 NPC 场景下，按 `target_id` 区分每名 NPC 的 `runtime_state`；
   - Fastify 路由会调用 `buildPersonaRuntimeHighlights`，在响应中追加 `personaHighlights`（含 `percentMetrics`、`narrativeFacts`），方便前端按重要度渲染。
4. **JSDoc/Schema**：
   - 推荐在 `schemas/character.ts` 增补此模型的 Zod 描述，供 IDE 自动提示。

引用该文档即可统一 NPC 模型定义，避免 Prompt 设计与运行时状态混用导致的“人格漂移”问题。

## 当前工程落地

- **Schema**：`backend/src/schemas/persona.ts` 提供 `digitalPersonaSchema`、`digitalPersonaRuntimeStateSchema` 以及 `deepPartial` Patch，用于在 TypeScript 中直接推断 `DigitalPersonaRuntimeState` 类型。
- **角色加载**：`CharacterService` 会在读取 YAML 时自动解析 `persona` 字段（若存在）并缓存，开发者只需在角色配置中嵌入符合 schema 的段落即可。
- **会话存储**：`SessionData` 现包含 `personaId` 与 `personaRuntime`，数据库持久化时会把运行态 JSON 嵌入 `characterState` 字段的隐藏键中，避免额外迁移。
- **运行时更新**：`SessionService.updatePersonaRuntimeState(sessionId, patch)` 接收深度可选的 patch，对照 schema 合法化后与现有状态合并；调用成功会自动 bump 版本并刷新缓存。
- **API 回调**：通过 `GET /api/npc/sessions/:id/persona` 可读取运行态，`PATCH /api/npc/sessions/:id/persona` 则允许前端/运营工具推送 `DigitalPersonaRuntimePatch`，典型用例是多 NPC 场景下的压力同步或 GM 强制改戏。
- **Prompt 侧使用**：PromptEngine 在模板渲染阶段可直接读取 `session.personaRuntime`，借此把 `scene_context`、`stress_meter` 等信息插入系统提示词。
- **自动同步**：`ChatService` 在每轮对话后根据角色压力变化自动生成 `stress_meter`/`temporal_status` patch，并通过 `SessionService.appendTurn` 写回，确保 ROM/RAM 持续一致。
- **UI 高亮**：`backend/src/utils/personaHighlights.ts` 暴露 `buildPersonaRuntimeHighlights(runtime)`，将 0-100 指标与叙述型字段拆分为 `personaHighlights`，供前端的 Stat/手风琴组件消费（响应字段匹配 `personaRuntimeHighlightsSchema`）。

> 若未来需要多 NPC 会话，按 `personaId` 划分运行态即可，`relationship_matrix.target_id` 建议填会话内的 userId 或其他 persona 的 meta id。

## 角色配置示例

`backend/config/characters/mob.yaml` 已内置完整 persona 区块，可直接参考：

```yaml
persona:
   static_profile:
      meta:
         id: c2e8f0f4-3b72-4b6d-9a5c-7f53f0660c12
         name: Shigeo Kageyama
         version: v1.0
      physiology:
         date_of_birth: "2000-05-12"
         gender: Male
         voice:
            timbre: "轻柔、克制、偶尔断续"
            base_pitch: Medium
      ...
   runtime_state:
      temporal_status:
         current_date: "2025-11-25T00:00:00Z"
         calculated_age: 25
      stress_meter:
         current_level: 12
```

> **Tips**：首次接入新角色时可复制上述模板，将 meta/drive/stress_rules 逐项填充，再根据剧情设置 `runtime_state` 初始值。
