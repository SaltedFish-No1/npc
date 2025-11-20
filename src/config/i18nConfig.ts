export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' }
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

export const getLanguageLabel = (code?: string) => {
  if (!code) return SUPPORTED_LANGUAGES[0].label;
  const match = SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
  return match ? match.label : code;
};

export const normalizeLanguageCode = (code?: string): LanguageCode => {
  if (!code) return SUPPORTED_LANGUAGES[0].code;
  const direct = SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
  if (direct) return direct.code;
  const base = code.split('-')[0];
  const baseMatch = SUPPORTED_LANGUAGES.find((lang) => lang.code === base);
  return baseMatch ? baseMatch.code : SUPPORTED_LANGUAGES[0].code;
};
