import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchSession, subscribeSession } from '@/services/sessionService';
import { SessionData } from '@/schemas/chat';

export const useChatSession = (userId?: string) => {
  const queryClient = useQueryClient();

  const queryResult = useQuery<SessionData>({
    queryKey: ['session', userId],
    enabled: Boolean(userId),
    queryFn: () => {
      if (!userId) throw new Error('Missing user id');
      return fetchSession(userId);
    },
    staleTime: 1000 * 60
  });

  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeSession(
      userId,
      (data) => queryClient.setQueryData(['session', userId], data),
      (error) => console.error('Firestore subscribe error', error)
    );
    return () => unsub();
  }, [queryClient, userId]);

  return queryResult;
};
