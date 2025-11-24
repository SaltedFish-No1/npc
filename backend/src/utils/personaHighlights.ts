/**
 * 文件：backend/src/utils/personaHighlights.ts
 * 功能描述：从 DigitalPersona 运行态中提取 UI 高亮字段（百分比指标 + 叙述型 facts）
 * Description: Derive UI-friendly highlight metrics from DigitalPersona runtime state
 */
import {
  type DigitalPersonaRuntimeState,
  personaRuntimeHighlightsSchema,
  type PersonaRuntimeHighlights
} from '../schemas/persona.js';

const clampPercentage = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

const normalizeTrustToPercent = (trust: number) => {
  // relationship trust 范围 -100~100，将其映射至 0~100 的 UI 进度条
  return clampPercentage(((trust + 100) / 200) * 100);
};

const formatIsoDate = (input: string): string => {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return input;
  }
  return date.toISOString();
};

/**
 * 功能：根据 runtime state 输出 highlight 结构（若无数据则返回 undefined）
 * Description: Build persona runtime highlight payload or undefined when runtime is missing
 */
export const buildPersonaRuntimeHighlights = (
  runtime?: DigitalPersonaRuntimeState | null
): PersonaRuntimeHighlights | undefined => {
  if (!runtime) return undefined;

  const percentMetrics: PersonaRuntimeHighlights['percentMetrics'] = [];
  const narrativeFacts: PersonaRuntimeHighlights['narrativeFacts'] = [];

  if (typeof runtime.stress_meter?.current_level === 'number') {
    percentMetrics.push({
      key: 'stress_meter.current_level',
      value: clampPercentage(runtime.stress_meter.current_level)
    });
  }

  const userRelation = runtime.relationship_matrix?.find((entry) => entry.target_id === 'user');
  if (typeof userRelation?.trust_level === 'number') {
    percentMetrics.push({
      key: 'relationship_matrix.trust_level',
      value: normalizeTrustToPercent(userRelation.trust_level),
      rawValue: userRelation.trust_level,
      targetId: userRelation.target_id
    });
  }

  if (runtime.scene_context?.current_goal) {
    narrativeFacts.push({ key: 'scene_context.current_goal', value: runtime.scene_context.current_goal });
  }
  if (runtime.scene_context?.current_tactic) {
    narrativeFacts.push({ key: 'scene_context.current_tactic', value: runtime.scene_context.current_tactic });
  }
  if (runtime.current_status?.occupation) {
    narrativeFacts.push({ key: 'current_status.occupation', value: runtime.current_status.occupation });
  }
  if (runtime.current_status?.health_status) {
    narrativeFacts.push({ key: 'current_status.health_status', value: runtime.current_status.health_status });
  }
  if (runtime.current_status?.appearance_variable) {
    narrativeFacts.push({ key: 'current_status.appearance_variable', value: runtime.current_status.appearance_variable });
  }
  if (runtime.stress_meter?.active_triggers?.length) {
    narrativeFacts.push({
      key: 'stress_meter.active_triggers',
      value: runtime.stress_meter.active_triggers.join(', ')
    });
  }
  if (runtime.temporal_status?.current_date) {
    narrativeFacts.push({
      key: 'temporal_status.current_date',
      value: formatIsoDate(runtime.temporal_status.current_date)
    });
  }
  if (typeof runtime.temporal_status?.calculated_age === 'number') {
    narrativeFacts.push({
      key: 'temporal_status.calculated_age',
      value: runtime.temporal_status.calculated_age.toString()
    });
  }
  if (userRelation?.knowledge_about_target) {
    narrativeFacts.push({
      key: 'relationship_matrix.knowledge',
      value: userRelation.knowledge_about_target,
      targetId: userRelation.target_id
    });
  }

  if (!percentMetrics.length && !narrativeFacts.length) {
    return undefined;
  }

  return personaRuntimeHighlightsSchema.parse({ percentMetrics, narrativeFacts });
};
