import { useState, FormEvent, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useChatSession } from '@/hooks/useChatSession';
import { useChatStore } from '@/stores/chatStore';
import { characterStateSchema, ChatMessage, SessionData } from '@/schemas/chat';
import { streamChatCompletion, generateImage } from '@/services/chatService';
import { persistSessionSnapshot, resetSession } from '@/services/sessionService';
import { useTranslation } from 'react-i18next';
import { CHARACTER_PROFILE, getActiveNpcId } from '@/config/characterProfile';
import { normalizeLanguageCode } from '@/config/i18nConfig';

const defaultState = characterStateSchema.parse({});

export function useChatController() {
  const { user, loading: authLoading, error: authError } = useAuth();
  const activeCharacterId = getActiveNpcId();
  const { t, i18n } = useTranslation();
  const targetLanguage = normalizeLanguageCode(i18n.resolvedLanguage || i18n.language);
  const sessionQueryKey = useMemo(
    () => ['session', user?.uid, activeCharacterId, targetLanguage] as const,
    [user?.uid, activeCharacterId, targetLanguage]
  );
  const { data: session, isPending: sessionPending, error: sessionError } = useChatSession({
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

  const state = session?.characterState ?? defaultState;

  const handleGenerateAvatar = async () => {
    if (!user?.uid || !session) return;
    setIsGenerating(true);
    const moodPrompt =
      state.stress >= 90
        ? CHARACTER_PROFILE.avatarPrompts.overload
        : CHARACTER_PROFILE.avatarPrompts.calm;
    try {
      addLog({ source: 'GEN_IMG', message: 'Generating avatar...' });
      const imageResponse = await generateImage({
        sessionId: session.sessionId,
        characterId: activeCharacterId,
        prompt: moodPrompt,
        ratio: '1:1',
        updateAvatar: true
      });
      const currentSession =
        (queryClient.getQueryData(sessionQueryKey) as SessionData | undefined) ?? session;
      if (currentSession) {
        const updatedSession: SessionData = {
          ...currentSession,
          characterState: imageResponse.characterState
            ? characterStateSchema.parse(imageResponse.characterState)
            : currentSession.characterState,
          updatedAt: Date.now()
        };
        queryClient.setQueryData<SessionData>(sessionQueryKey, updatedSession);
        persistSessionSnapshot(user.uid, activeCharacterId, updatedSession);
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

  const handleResetSession = async () => {
    if (!user?.uid) return;
    await resetSession(user.uid, activeCharacterId);
    queryClient.removeQueries({ queryKey: sessionQueryKey });
  };

  const sendMessage = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !user?.uid || !session || isSending) return;
    setIsSending(true);
    setLiveContent('');
    setDraftImagePrompt(undefined);

    const userMessage: ChatMessage = { role: 'user', content: input.trim() };
    const baseSession = (queryClient.getQueryData(sessionQueryKey) as SessionData | undefined) ?? session;

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
            prompt: ai.imagePrompt,
            ratio: '16:9'
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
      persistSessionSnapshot(user.uid, activeCharacterId, nextSession);

      setInput('');
      addLog({ source: 'SYSTEM', message: 'Turn completed' });
    } catch (error) {
      console.error(error);
      toast.error(t('toasts.communicationError'));
      addLog({ source: 'ERROR', message: String(error), level: 'error' });
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
    sendMessage
  };
}
