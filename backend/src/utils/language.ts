/**
 * 文件：backend/src/utils/language.ts
 * 功能描述：语言码到标签的简单映射工具 | Description: Map language code to human-readable label
 * 作者：NPC 项目组  ·  版本：v1.0.0
 * 创建日期：2025-11-24  ·  最后修改：2025-11-24
 * 依赖说明：纯函数，无外部依赖
 */
const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  zh: '简体中文',
  'zh-cn': '简体中文',
  'zh-hans': '简体中文'
};

/**
 * 功能：解析语言标签，未知语言回退为 English
 * Description: Resolve language label; unknown codes fallback to English
 * @param {string} code - 语言码 | Language code
 * @returns {{code:string,label:string}} 语言标签对象 | Label object
 */
export const resolveLanguageLabel = (code: string): { code: string; label: string } => ({
  code,
  label: LANGUAGE_LABELS[code.toLowerCase()] ?? 'English'
});
