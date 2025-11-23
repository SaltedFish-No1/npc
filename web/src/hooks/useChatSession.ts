import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchSession, subscribeSession } from '@/services/sessionService';
import { SessionData } from '@/schemas/chat';

type UseChatSessionParams = {
  userId?: string;
  characterId: string;
  languageCode: string;
};

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
