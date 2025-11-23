const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  'zh-cn': '简体中文'
};

export const resolveLanguageLabel = (code: string): { code: string; label: string } => ({
  code,
  label: LANGUAGE_LABELS[code.toLowerCase()] ?? 'English'
});
