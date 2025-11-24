/**
 * 文件：web/src/hooks/useChatSession.ts
 * 功能描述：会话加载与订阅 Hook（React Query + 实时订阅） | Description: Chat session hook with React Query and live subscriptions
 * 作者：Haotian Chen  ·  版本：v1.0.0
 * 创建日期：2025-11-24  ·  最后修改：2025-11-24
 * 依赖说明：依赖前端 session 服务
 */
import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchSession, subscribeSession } from '@/services/sessionService';
import { SessionData } from '@/schemas/chat';

type UseChatSessionParams = {
  userId?: string;
  characterId: string;
  languageCode: string;
};

/**
 * 功能：按用户、角色与语言加载会话，并订阅变更
 * Description: Load session by user/character/language and subscribe to changes
 */
export const useChatSession = ({ userId, characterId, languageCode }: UseChatSessionParams) => {
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => ['session', userId, characterId, languageCode] as const,
    [userId, characterId, languageCode]
  );

  const queryResult = useQuery<SessionData>({
    queryKey,
    enabled: Boolean(userId),
    queryFn: () => {
      if (!userId) throw new Error('Missing user id');
      return fetchSession(userId, { characterId, languageCode });
    },
    staleTime: 1000 * 60
  });

  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeSession(
      userId,
      characterId,
      languageCode,
      (data) => queryClient.setQueryData(queryKey, data),
      (error) => console.error('Session subscribe error', error)
    );
    return () => unsub();
  }, [characterId, languageCode, queryClient, queryKey, userId]);

  return queryResult;
};
