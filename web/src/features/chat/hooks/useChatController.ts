/**
 * 文件：web/src/features/chat/hooks/useChatController.ts
 * 功能描述：聊天核心交互控制器 Hook（鉴权、会话加载、消息发送、流式与图片生成） | Description: Chat controller hook handling auth, session, messaging, streaming and image generation
 * 作者：Haotian Chen  ·  版本：v1.0.0
 * 创建日期：2025-11-24  ·  最后修改：2025-11-24
 * 依赖说明：依赖 React Query、i18n、stores 与服务模块
 */
import { useState, FormEvent, useMemo, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useChatSession } from '@/hooks/useChatSession';
import { useChatStore } from '@/stores/chatStore';
import { characterStateSchema, ChatMessage, SessionData } from '@/schemas/chat';
import { streamChatCompletion, generateImage, fetchSessionMessages } from '@/services/chatService';
import { persistSessionSnapshot, resetSession } from '@/services/sessionService';
import { useTranslation } from 'react-i18next';
import { getActiveNpcId } from '@/config/characterProfile';
import { normalizeLanguageCode } from '@/config/i18nConfig';

const defaultState = characterStateSchema.parse({});

/**
 * 功能：提供聊天页面骨架与组合，连接核心交互控制器与UI组件
 * Description: Provide state and actions for chat page
 * @returns {object} 包含会话、输入、发送与生成头像等方法的对象 | Object with session, input, send and avatar generation methods
 */
export function useChatController() {
  const { user, loading: authLoading, error: authError } = useAuth();
  const activeCharacterId = getActiveNpcId();
  const { t, i18n } = useTranslation();
  const targetLanguage = normalizeLanguageCode(i18n.resolvedLanguage ?? i18n.language);
  const sessionQueryKey = useMemo(
    () => ['session', user?.uid, activeCharacterId, targetLanguage] as const,
    [user?.uid, activeCharacterId, targetLanguage]
  );
  const {
    data: session,
    isPending: sessionPending,
    error: sessionError
  } = useChatSession({
    userId: user?.uid,
    characterId: activeCharacterId,
    languageCode: targetLanguage
  });
  const queryClient = useQueryClient();
  const { addLog } = useChatStore();

  const [input, setInput] = useState('');
  const [liveContent, setLiveContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [draftImagePrompt, setDraftImagePrompt] = useState<string | undefined>();
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const hydratedSessionsRef = useRef<Set<string>>(new Set());

  const state = session?.characterState ?? defaultState;

  useEffect(() => {
    setHistoryCursor(null);
  }, [session?.sessionId]);

  const mergeMessages = (existing: ChatMessage[], incoming: ChatMessage[]) => {
    if (!incoming.length) return existing;
    const keyFor = (message: ChatMessage, index: number) =>
      message.messageId ?? `${message.role}-${message.createdAt ?? 0}-${index}`;
    const map = new Map<string, ChatMessage>();
    existing.forEach((message, index) => {
      map.set(keyFor(message, index), message);
    });
    incoming.forEach((message, index) => {
      const key = keyFor(message, existing.length + index);
      const existingMessage = map.get(key);
      map.set(key, existingMessage ? { ...existingMessage, ...message } : message);
    });
    const merged = Array.from(map.values());
    merged.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
    return merged;
  };

  const messagesDiffer = (next: ChatMessage[], prev: ChatMessage[]) => {
    if (next.length !== prev.length) return true;
    for (let i = 0; i < next.length; i += 1) {
      const nextMsg = next[i];
      const prevMsg = prev[i];
      if (!prevMsg) return true;
      const nextKey = nextMsg.messageId ?? `${nextMsg.role}-${i}`;
      const prevKey = prevMsg.messageId ?? `${prevMsg.role}-${i}`;
      if (nextKey !== prevKey) return true;
      if (
        nextMsg.content !== prevMsg.content ||
        nextMsg.imageUrl !== prevMsg.imageUrl ||
        nextMsg.imagePrompt !== prevMsg.imagePrompt ||
        nextMsg.thought !== prevMsg.thought
      ) {
        return true;
      }
    }
    return false;
  };

  useEffect(() => {
    const sessionId = session?.sessionId;
    if (!sessionId || !user?.uid) return;
    if (hydratedSessionsRef.current.has(sessionId)) return;

    const controller = new AbortController();
    hydratedSessionsRef.current.add(sessionId);
    setIsHistoryLoading(true);

    const hydrate = async () => {
      try {
        const history = await fetchSessionMessages({
          sessionId,
          limit: 50,
          signal: controller.signal
        });
        setHistoryCursor(history.nextCursor ?? null);
        if (history.items.length) {
          const currentSession = queryClient.getQueryData<SessionData>(sessionQueryKey) ?? session;
          const mergedMessages = mergeMessages(currentSession.messages, history.items);
          if (messagesDiffer(mergedMessages, currentSession.messages)) {
            const hydratedSession: SessionData = {
              ...currentSession,
              messages: mergedMessages,
              updatedAt: Date.now()
            };
            queryClient.setQueryData<SessionData>(sessionQueryKey, hydratedSession);
            persistSessionSnapshot(user.uid!, activeCharacterId, targetLanguage, hydratedSession);
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          hydratedSessionsRef.current.delete(sessionId);
          console.error('Failed to hydrate history', error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsHistoryLoading(false);
        }
      }
    };

    hydrate();
    return () => controller.abort();
  }, [session?.sessionId, user?.uid, sessionQueryKey, queryClient, activeCharacterId, targetLanguage, session]);

  const loadOlderMessages = async () => {
    if (!session?.sessionId || !historyCursor) return;
    setIsHistoryLoading(true);
    try {
      const nextPage = await fetchSessionMessages({
        sessionId: session.sessionId,
        limit: 50,
        cursor: historyCursor
      });
      setHistoryCursor(nextPage.nextCursor ?? null);
      if (nextPage.items.length) {
        const currentSession = queryClient.getQueryData<SessionData>(sessionQueryKey) ?? session;
        const mergedMessages = mergeMessages(currentSession.messages, nextPage.items);
        if (messagesDiffer(mergedMessages, currentSession.messages)) {
          const updated: SessionData = {
            ...currentSession,
            messages: mergedMessages,
            updatedAt: Date.now()
          };
          queryClient.setQueryData<SessionData>(sessionQueryKey, updated);
          if (user?.uid) {
            persistSessionSnapshot(user.uid, activeCharacterId, targetLanguage, updated);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load older messages', error);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  /**
   * 业务规则：根据当前状态推送头像意图，由后端统一提示词并刷新本地缓存
   * Description: Ask backend to generate an avatar using intent/mood hints and sync local session cache afterwards
   */
  const handleGenerateAvatar = async () => {
    if (!user?.uid || !session) return;
    setIsGenerating(true);
    const avatarMood = state.avatarLabel ?? state.mode?.toLowerCase() ?? 'default';
    try {
      addLog({ source: 'GEN_IMG', message: 'Generating avatar...' });
      const imageResponse = await generateImage({
        sessionId: session.sessionId,
        characterId: activeCharacterId,
        intent: 'avatar',
        avatarMood,
        updateAvatar: true,
        metadata: { trigger: 'manual-ui', stress: state.stress }
      });
      const currentSession = queryClient.getQueryData<SessionData>(sessionQueryKey) ?? session;
      if (currentSession) {
        const updatedSession: SessionData = {
          ...currentSession,
          characterState: imageResponse.characterState
            ? characterStateSchema.parse(imageResponse.characterState)
            : currentSession.characterState,
          updatedAt: Date.now()
        };
        queryClient.setQueryData<SessionData>(sessionQueryKey, updatedSession);
        persistSessionSnapshot(user.uid, activeCharacterId, targetLanguage, updatedSession);
      }
      if (imageResponse.imageUrl) {
        toast.success(t('toasts.avatarUpdated'));
      }
    } catch (error) {
      console.error(error);
      toast.error(t('toasts.avatarFailed'));
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * 业务规则：重置会话并清理查询缓存
   * Description: Reset session and clear query cache
   */
  const handleResetSession = () => {
    if (!user?.uid) return;
    resetSession(user.uid, activeCharacterId, targetLanguage);
    queryClient.removeQueries({ queryKey: sessionQueryKey });
  };

  /**
   * 复杂算法：流式消息发送与乐观更新
   * 中文：先乐观追加用户消息；流式过程中聚合 `chunk`；若 AI 请求图片则并行生成并合并结果；失败则回滚
   * English: Optimistically append user message; aggregate streaming chunks; branch to image generation if requested; rollback on failure
   */
  const sendMessage = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !user?.uid || !session || isSending) return;
    setIsSending(true);
    setLiveContent('');
    setDraftImagePrompt(undefined);

    const messageContent = input.trim();
    const userMessage: ChatMessage = { role: 'user', content: messageContent };
    const baseSession = queryClient.getQueryData<SessionData>(sessionQueryKey) ?? session;

    const optimisticSession: SessionData = {
      ...baseSession,
      messages: [...baseSession.messages, userMessage],
      updatedAt: Date.now()
    };
    queryClient.setQueryData<SessionData>(sessionQueryKey, optimisticSession);
    persistSessionSnapshot(user.uid, activeCharacterId, targetLanguage, optimisticSession);
    setInput('');

    try {
      addLog({ source: 'LLM', message: 'Streaming from NPC backend...' });
      const ai = await streamChatCompletion({
        sessionId: baseSession.sessionId,
        characterId: activeCharacterId,
        languageCode: targetLanguage,
        message: userMessage.content,
        onChunk: (chunk) => setLiveContent((prev) => prev + chunk)
      });

      addLog({ source: 'LLM', message: 'Parsing AI response' });
      setLiveContent('');

      let assistantMessage: ChatMessage = ai.assistantMessage;
      if (ai.imagePrompt) {
        setDraftImagePrompt(ai.imagePrompt);
        setIsGenerating(true);
        addLog({ source: 'AI_DECISION', message: `Requested image: ${ai.imagePrompt}` });
        try {
          const imageResponse = await generateImage({
            sessionId: ai.sessionId,
            characterId: activeCharacterId,
            intent: 'scene',
            useImagePrompt: true,
            metadata: { trigger: 'assistant-image', imagePrompt: ai.imagePrompt }
          });
          if (imageResponse.imageUrl) {
            assistantMessage = {
              ...assistantMessage,
              imageUrl: imageResponse.imageUrl,
              imagePrompt: ai.imagePrompt
            };
          }
          if (imageResponse.characterState) {
            ai.characterState = characterStateSchema.parse(imageResponse.characterState);
          }
        } catch (error) {
          addLog({ source: 'GEN_IMG', message: `Image generation failed: ${String(error)}` });
        } finally {
          setIsGenerating(false);
          setDraftImagePrompt(undefined);
        }
      }

      const nextSession: SessionData = {
        ...baseSession,
        sessionId: ai.sessionId,
        characterState: ai.characterState,
        messages: [...baseSession.messages, userMessage, assistantMessage],
        updatedAt: Date.now(),
        version: ai.sessionVersion ?? (baseSession.version ?? 0) + 1
      };

      queryClient.setQueryData<SessionData>(sessionQueryKey, nextSession);
      persistSessionSnapshot(user.uid, activeCharacterId, targetLanguage, nextSession);

      addLog({ source: 'SYSTEM', message: 'Turn completed' });
    } catch (error) {
      console.error(error);
      toast.error(t('toasts.communicationError'));
      addLog({ source: 'ERROR', message: String(error), level: 'error' });
      queryClient.setQueryData(sessionQueryKey, baseSession);
      persistSessionSnapshot(user.uid, activeCharacterId, targetLanguage, baseSession);
      setInput(messageContent);
    } finally {
      setIsSending(false);
      setLiveContent('');
      setDraftImagePrompt(undefined);
    }
  };

  return {
    user,
    session,
    state,
    input,
    setInput,
    liveContent,
    isSending,
    isGenerating,
    draftImagePrompt,
    authLoading,
    authError,
    sessionPending,
    sessionError,
    handleGenerateAvatar,
    handleResetSession,
    sendMessage,
    loadOlderMessages,
    hasMoreHistory: Boolean(historyCursor),
    isHistoryLoading
  };
}
