/**
 * 文件：web/src/features/chat/ChatFeature.tsx
 * 功能描述：聊天页面骨架与组合，连接核心交互控制器与UI组件 | Description: Chat page scaffold composing UI and hooking into controller
 * 作者：Haotian Chen  ·  版本：v1.0.0
 * 创建日期：2025-11-24  ·  最后修改：2025-11-24
 * 依赖说明：依赖 Zustand stores、i18n、控制器与各子组件
 */
import { useEffect, useMemo } from 'react';
import { Bug } from 'lucide-react';
import styles from './styles/ChatPage.module.css';
import { useUIStore } from '@/stores/uiStore';
import { useChatStore } from '@/stores/chatStore';
import { ChatMessage } from '@/schemas/chat';
import { FALLBACK_AVATAR_BROKEN, FALLBACK_AVATAR_NORMAL } from '@/config/constants';
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

/**
 * 功能：渲染聊天页面并处理语言切换、头像占位与调试面板
 * Description: Render chat page, handle language switching, avatar fallback, and debug panel
 * @returns {JSX.Element} 聊天页面 | Chat page
 */
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
    sendMessage,
    loadOlderMessages,
    hasMoreHistory,
    isHistoryLoading
  } = useChatController();

  const isBroken = state.mode === 'BROKEN' || state.mode === '???%' || state.stress >= 99;
  const avatar = useMemo(() => {
    if (!state.avatarUrl) {
      return isBroken ? FALLBACK_AVATAR_BROKEN : FALLBACK_AVATAR_NORMAL;
    }
    return state.avatarUrl;
  }, [state.avatarUrl, isBroken]);

  const messages: ChatMessage[] = useMemo(() => session?.messages ?? [], [session]);
  const isThinking = isSending || Boolean(liveContent);

  const isBooting = authLoading || sessionPending || !session;
  const currentLanguage = normalizeLanguageCode(i18n.resolvedLanguage ?? i18n.language);
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
        <p>{authError?.message ?? sessionError?.message ?? t('chat.errors.startupBody')}</p>
      </div>
    );
  }

  /**
   * 业务规则：语言切换
   * 中文：当选择与当前语言相同则忽略，否则触发 i18n 切换
   * English: Ignore if selecting current language; otherwise change via i18n
   */
  const handleLanguageChange = async (code: string) => {
    if (code === currentLanguage) return;
    await i18n.changeLanguage(code);
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
            isThinking={isThinking}
            onLoadMore={hasMoreHistory ? loadOlderMessages : undefined}
            hasMoreHistory={hasMoreHistory}
            isHistoryLoading={isHistoryLoading}
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
