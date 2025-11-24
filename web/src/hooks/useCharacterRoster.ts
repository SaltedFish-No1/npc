/**
 * 文件：web/src/hooks/useCharacterRoster.ts
 * 功能描述：拉取 NPC 角色列表的 React Query Hook，保持前后端角色源一致
 * 作者：Haotian Chen  ·  版本：v1.0.0
 * 创建日期：2025-11-25  ·  最后修改：2025-11-25
 * 依赖说明：依赖 chatService.fetchCharacters 与 TanStack Query
 */
import { useQuery } from '@tanstack/react-query';
import { fetchCharacters, type CharacterSummary } from '@/services/chatService';
import { normalizeLanguageCode } from '@/config/i18nConfig';

/**
 * 功能：按语言（可选）获取 NPC 角色列表并缓存 5 分钟。
 * 细节：内部会自动归一化语言码，避免 `zh-CN` / `zh` 导致缓存 miss。
 * Description: Fetch NPC roster filtered by language; language codes are normalized to prevent cache misses.
 * @param {string} [languageCode] 语言码，可为 `xx` 或 `xx-YY`
 * @returns {import('@tanstack/react-query').UseQueryResult<CharacterSummary[]>}
 */
export const useCharacterRoster = (languageCode?: string) => {
  const normalizedLanguage = languageCode ? normalizeLanguageCode(languageCode) : undefined;
  return useQuery<CharacterSummary[]>({
    queryKey: ['characters', normalizedLanguage ?? 'any'],
    queryFn: () =>
      fetchCharacters(normalizedLanguage ? { languageCode: normalizedLanguage } : undefined),
    staleTime: 1000 * 60 * 5
  });
};
