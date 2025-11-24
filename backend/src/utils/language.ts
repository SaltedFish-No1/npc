/**
 * 文件：backend/src/utils/language.ts
 * 功能描述：语言码到标签的简单映射工具 | Description: Map language code to human-readable label
 * 作者：Haotian Chen  ·  版本：v1.0.0
 * 创建日期：2025-11-24  ·  最后修改：2025-11-24
 * 依赖说明：纯函数，无外部依赖
 */
const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  zh: '简体中文'
};

const FALLBACK_LANGUAGE = 'en';

const LANGUAGE_ALIASES: Record<string, string> = {
  en: 'en',
  'en-us': 'en',
  'en-gb': 'en',
  zh: 'zh',
  'zh-cn': 'zh',
  'zh-hans': 'zh'
};

/**
 * 功能：标准化语言码，目前仅支持中/英，其余回退到 en
 * Description: Normalize language code to supported set (en/zh)
 */
export const normalizeLanguageCode = (code: string): 'en' | 'zh' => {
  const normalized = LANGUAGE_ALIASES[code.toLowerCase()];
  return (normalized as 'en' | 'zh') ?? FALLBACK_LANGUAGE;
};

/**
 * 功能：解析语言标签，未知语言回退为 English
 * Description: Resolve language label; unknown codes fallback to English
 * @param {string} code - 语言码 | Language code
 * @returns {{code:string,label:string}} 语言标签对象 | Label object
 */
export const resolveLanguageLabel = (code: string): { code: string; label: string } => {
  const normalized = normalizeLanguageCode(code);
  return {
    code: normalized,
    label: LANGUAGE_LABELS[normalized] ?? LANGUAGE_LABELS[FALLBACK_LANGUAGE]
  };
};
