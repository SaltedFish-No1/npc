import { useState, FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useChatSession } from '@/hooks/useChatSession';
import { useUIStore } from '@/stores/uiStore';
import { useChatStore } from '@/stores/chatStore';
import {
  characterStateSchema,
  ChatMessage,
  SessionData,
  SettingsForm
} from '@/schemas/chat';
import { streamChatCompletion, generateImage } from '@/services/chatService';
import { appendTurn, resetSession, updateAvatar } from '@/services/sessionService';
import { buildSystemPrompt } from '@/services/promptService';
import { useTranslation } from 'react-i18next';
import { CHARACTER_PROFILE } from '@/config/characterProfile';
import { normalizeLanguageCode } from '@/config/i18nConfig';

const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);
const defaultState = characterStateSchema.parse({});

export function useChatController() {
  const { user, loading: authLoading, error: authError } = useAuth();
  const { data: session, isPending: sessionPending, error: sessionError } = useChatSession(
    user?.uid
  );
  const queryClient = useQueryClient();
  const { apiKey, toggleSettings, setApiKey } = useUIStore();
  const { addLog } = useChatStore();

  const [input, setInput] = useState('');
  const [liveContent, setLiveContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [draftImagePrompt, setDraftImagePrompt] = useState<string | undefined>();
  const { t, i18n } = useTranslation();
  const targetLanguage = normalizeLanguageCode(i18n.resolvedLanguage || i18n.language);

  const state = session?.characterState ?? defaultState;

  const handleSettingsSubmit = (data: SettingsForm) => {
    setApiKey(data.apiKey);
    toggleSettings();
    toast.success(t('toasts.apiKeyUpdated'));
  };

  const handleGenerateAvatar = async () => {
    if (!user) return;
    if (!apiKey) {
      toast.warning(t('toasts.apiKeyMissing'));
      toggleSettings();
      return;
    }
    setIsGenerating(true);
    const moodPrompt =
      state.stress >= 90
        ? CHARACTER_PROFILE.avatarPrompts.overload
        : CHARACTER_PROFILE.avatarPrompts.calm;
    try {
      addLog({ source: 'GEN_IMG', message: 'Generating avatar...' });
      const url = await generateImage({ apiKey, prompt: moodPrompt, ratio: '1:1' });
      if (url) {
        await updateAvatar(user.uid, url);
        queryClient.setQueryData(['session', user.uid], (prev?: SessionData) =>
          prev
            ? { ...prev, characterState: { ...(prev.characterState ?? {}), avatarUrl: url } }
            : prev
        );
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
    await resetSession(user.uid);
    queryClient.removeQueries({ queryKey: ['session', user.uid] });
  };

  const sendMessage = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !user || !session || isSending) return;
    if (!apiKey) {
      toast.warning(t('toasts.apiKeyMissing'));
      toggleSettings();
      return;
    }
    setIsSending(true);
    setLiveContent('');
    setDraftImagePrompt(undefined);

    const systemPrompt = buildSystemPrompt(state, targetLanguage);
    const userMessage: ChatMessage = { role: 'user', content: input.trim() };
    const contextMessages = [...session.messages.slice(-8), userMessage].map((m) => ({
      role: m.role,
      content: m.content
    }));

    try {
      addLog({ source: 'LLM', message: 'Streaming from Volcengine...' });
      const ai = await streamChatCompletion({
        apiKey,
        systemPrompt,
        messages: contextMessages,
        onChunk: (chunk) => setLiveContent((prev) => prev + chunk)
      });

      addLog({ source: 'LLM', message: 'Parsing AI response' });
      setLiveContent('');

      let generatedImage: string | null = null;
      if (ai.image_prompt) {
        setDraftImagePrompt(ai.image_prompt);
        setIsGenerating(true);
        addLog({ source: 'AI_DECISION', message: `Requested image: ${ai.image_prompt}` });
        try {
          generatedImage = await generateImage({
            apiKey,
            prompt: ai.image_prompt,
            ratio: '16:9'
          });
        } catch (error) {
          addLog({ source: 'GEN_IMG', message: `Image generation failed: ${String(error)}` });
        } finally {
          setIsGenerating(false);
        }
      }

      const nextStress = clamp((state.stress || 0) + (ai.stress_change || 0), 0, 100);
      const nextTrust = clamp((state.trust || 0) + (ai.trust_change || 0), 0, 100);
      const nextState = {
        ...state,
        stress: nextStress,
        trust: nextTrust,
        mode: (nextStress >= 99 ? '???%' : 'NORMAL') as '???%' | 'NORMAL'
      };

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: ai.response,
        thought: ai.thought,
        stressChange: ai.stress_change,
        trustChange: ai.trust_change,
        currentStress: nextStress,
        imageUrl: generatedImage ?? undefined,
        imagePrompt: ai.image_prompt
      };

      queryClient.setQueryData(['session', user.uid], (prev?: SessionData) => {
        if (!prev) return prev;
        return {
          ...prev,
          characterState: nextState,
          messages: [...prev.messages, userMessage, assistantMessage]
        };
      });

      await appendTurn(user.uid, {
        userMessage,
        assistantMessage,
        nextState
      });

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
    handleSettingsSubmit,
    handleGenerateAvatar,
    handleResetSession,
    sendMessage
  };
}
