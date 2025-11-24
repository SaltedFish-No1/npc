/**
 * 文件：web/src/config/i18nConfig.ts
 * 功能描述：国际化配置与语言码归一化 | Description: i18n config and language code normalization
 * 作者：Haotian Chen  ·  版本：v1.0.0
 * 创建日期：2025-11-24  ·  最后修改：2025-11-24
 * 依赖说明：纯配置与函数
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' }
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

/**
 * 功能：获取语言标签，未提供时返回默认
 * Description: Get language label, default when missing
 */
export const getLanguageLabel = (code?: string) => {
  if (!code) return SUPPORTED_LANGUAGES[0].label;
  const match = SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
  return match ? match.label : code;
};

/**
 * 功能：归一化语言码（支持 `xx-YY` 回退到基础）
 * Description: Normalize language code (fallback to base for `xx-YY`)
 */
export const normalizeLanguageCode = (code?: string): LanguageCode => {
  if (!code) return SUPPORTED_LANGUAGES[0].code;
  const direct = SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
  if (direct) return direct.code;
  const base = code.split('-')[0];
  const baseMatch = SUPPORTED_LANGUAGES.find((lang) => lang.code === base);
  return baseMatch ? baseMatch.code : SUPPORTED_LANGUAGES[0].code;
};
