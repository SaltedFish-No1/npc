import { useEffect, useMemo } from 'react';
import { Bug } from 'lucide-react';
import styles from './styles/ChatPage.module.css';
import { useUIStore } from '@/stores/uiStore';
import { useChatStore } from '@/stores/chatStore';
import { ChatMessage } from '@/schemas/chat';
import {
  FALLBACK_AVATAR_BROKEN,
  FALLBACK_AVATAR_NORMAL
} from '@/config/constants';
import { useTranslation } from 'react-i18next';
import { normalizeLanguageCode } from '@/config/i18nConfig';
import { getActiveNpcLocalization } from '@/config/characterProfile';

import { useChatController } from './hooks/useChatController';
import { ChatSidebar } from './components/ChatSidebar/ChatSidebar';
import { ChatMessages } from './components/ChatMessages/ChatMessages';
import { ChatInput } from './components/ChatInput/ChatInput';
import { DebugPanel } from './components/DebugPanel/DebugPanel';
import { SettingsModal } from './components/SettingsModal/SettingsModal';
import { ChatHeader } from './components/ChatHeader/ChatHeader';

export default function ChatFeature() {
  const { settingsOpen, debugOpen, toggleSettings, toggleDebug } = useUIStore();
  const { systemLogs } = useChatStore();
  const { t, i18n } = useTranslation();

  const {
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
  } = useChatController();

  const isBroken = state.mode === 'BROKEN' || state.mode === '???%' || state.stress >= 99;
  const avatar = useMemo(() => {
    if (!state.avatarUrl || state.avatarUrl.includes('dicebear')) {
      return isBroken ? FALLBACK_AVATAR_BROKEN : FALLBACK_AVATAR_NORMAL;
    }
    return state.avatarUrl;
  }, [state.avatarUrl, isBroken]);

  const messages: ChatMessage[] = useMemo(() => {
    if (!session) return [];
    const withPreview = liveContent
      ? [
          ...session.messages,
          {
            role: 'assistant',
            content: liveContent || '...',
            thought: t('chat.messages.streaming'),
            currentStress: state.stress
          } as ChatMessage
        ]
      : session.messages;
    return withPreview;
  }, [liveContent, session, state.stress, t]);

  const isBooting = authLoading || sessionPending || !session;
  const currentLanguage = normalizeLanguageCode(i18n.resolvedLanguage || i18n.language);
  const npcLocalization = useMemo(
    () => getActiveNpcLocalization(currentLanguage),
    [currentLanguage]
  );

  useEffect(() => {
    if (npcLocalization?.appTitle) {
      document.title = npcLocalization.appTitle;
    }
  }, [npcLocalization]);

  if (authError || sessionError) {
    return (
      <div style={{ padding: 24 }}>
        <h3>{t('chat.errors.startupTitle')}</h3>
        <p>{authError?.message || sessionError?.message || t('chat.errors.startupBody')}</p>
      </div>
    );
  }

  const handleLanguageChange = (code: string) => {
    if (code === currentLanguage) return;
    i18n.changeLanguage(code);
  };

  return (
    <div className={styles.page}>
      <div className="scanline" />
      <div className={styles.layout}>
        <ChatSidebar
          isBroken={isBroken}
          avatar={avatar}
          state={state}
          isGenerating={isGenerating}
          onToggleSettings={toggleSettings}
          onGenerateAvatar={handleGenerateAvatar}
        />

        <section className={styles.chatPanel}>
          <ChatHeader
            isBooting={isBooting}
            messageCount={session?.messages.length ?? 0}
            currentLanguage={currentLanguage}
            onLanguageChange={handleLanguageChange}
            appSubtitle={npcLocalization?.appSubtitle}
            onNpcChange={handleResetSession}
          />

          <ChatMessages
            messages={messages}
            isBooting={isBooting}
            avatar={avatar}
            state={state}
          />

          <ChatInput
            input={input}
            setInput={setInput}
            isSending={isSending}
            isBooting={isBooting}
            onSend={sendMessage}
          />
        </section>
      </div>

      <button className={styles.floatingDebug} onClick={toggleDebug} aria-label="debug-toggle">
        <Bug size={18} />
      </button>

      <DebugPanel
        isOpen={debugOpen}
        onClose={toggleDebug}
        systemLogs={systemLogs}
        state={state}
        draftImagePrompt={draftImagePrompt}
      />

      <SettingsModal isOpen={settingsOpen} onClose={toggleSettings} />
    </div>
  );
}
