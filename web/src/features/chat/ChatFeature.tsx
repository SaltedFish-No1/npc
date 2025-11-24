/**
 * 文件：web/src/features/chat/ChatFeature.tsx
 * 功能描述：聊天页面骨架与组合，连接核心交互控制器与UI组件 | Description: Chat page scaffold composing UI and hooking into controller
 * 作者：Haotian Chen  ·  版本：v1.0.0
 * 创建日期：2025-11-24  ·  最后修改：2025-11-24
 * 依赖说明：依赖 Zustand stores、i18n、控制器与各子组件
 */
import { useEffect, useMemo, useState } from 'react';
import { useDraggable } from '@/hooks/useDraggable';
import { Bug } from 'lucide-react';
import styles from './styles/ChatPage.module.css';
import { useUIStore } from '@/stores/uiStore';
import { useChatStore } from '@/stores/chatStore';
import { ChatMessage } from '@/schemas/chat';
import { useTranslation } from 'react-i18next';
import { normalizeLanguageCode } from '@/config/i18nConfig';
import {
  NPC_STORAGE_KEY,
  buildFallbackAvatars,
  getActiveNpcId,
  getNpcLocalization,
  getNpcPreset
} from '@/config/characterProfile';

import { useChatController } from './hooks/useChatController';
import { ChatSidebar } from './components/ChatSidebar/ChatSidebar';
import { ChatMessages } from './components/ChatMessages/ChatMessages';
import { ChatInput } from './components/ChatInput/ChatInput';
import { DebugPanel } from './components/DebugPanel/DebugPanel';
import { SettingsModal } from './components/SettingsModal/SettingsModal';
import { ChatHeader } from './components/ChatHeader/ChatHeader';
import { useCharacterRoster } from '@/hooks/useCharacterRoster';

const DEBUG_PANEL_SIZE = { width: 360, height: 520 } as const;
const DEBUG_BUTTON_SIZE = { width: 56, height: 56 } as const;
const DEBUG_BUTTON_OFFSET = {
  x: DEBUG_PANEL_SIZE.width - DEBUG_BUTTON_SIZE.width / 2,
  y: DEBUG_PANEL_SIZE.height + 24
};

/**
 * 功能：渲染聊天页面并处理语言切换、头像占位与调试面板
 * Description: Render chat page, handle language switching, avatar fallback, and debug panel
 * @returns {JSX.Element} 聊天页面 | Chat page
 */
export default function ChatFeature() {
  const { settingsOpen, debugOpen, toggleSettings, toggleDebug } = useUIStore();
  const { systemLogs } = useChatStore();
  const { t, i18n } = useTranslation();
  const [activeCharacterId, setActiveCharacterId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage?.getItem(NPC_STORAGE_KEY);
      if (stored) {
        return stored;
      }
    }
    return getActiveNpcId();
  });

  const {
    session,
    state,
    personaRuntime,
    personaHighlights,
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
    sendMessage,
    loadOlderMessages,
    hasMoreHistory,
    isHistoryLoading
  } = useChatController(activeCharacterId);

  const isBroken = state.mode === 'BROKEN' || state.mode === '???%' || state.stress >= 99;

  const currentLanguage = normalizeLanguageCode(i18n.resolvedLanguage ?? i18n.language);
  const {
    data: characterRoster = [],
    isPending: charactersPending
  } = useCharacterRoster(currentLanguage);

  useEffect(() => {
    if (!characterRoster.length) return;
    if (!characterRoster.some((character) => character.id === activeCharacterId)) {
      setActiveCharacterId(characterRoster[0].id);
    }
  }, [characterRoster, activeCharacterId]);

  const activePreset = useMemo(() => getNpcPreset(activeCharacterId), [activeCharacterId]);
  const activeProfile = activePreset.profile;
  const messages: ChatMessage[] = useMemo(() => session?.messages ?? [], [session]);
  const isThinking = isSending || Boolean(liveContent);

  const isBooting = authLoading || sessionPending || !session;
  const activeCharacterSummary = useMemo(
    () => characterRoster.find((character) => character.id === activeCharacterId),
    [characterRoster, activeCharacterId]
  );

  const displayOverrides = activeCharacterSummary?.display;
  const inputPlaceholder = displayOverrides?.inputPlaceholder;

  // 将后端 display 文案覆盖到前端预设，保持 fallback 逻辑不变
  const profileForDisplay = useMemo(() => {
    const summary = activeCharacterSummary;
    const fallbackAvatars = summary
      ? buildFallbackAvatars(summary.name ?? summary.codename ?? summary.id)
      : activeProfile.fallbackAvatars;

    return {
      ...activeProfile,
      id: summary?.id ?? activeProfile.id,
      defaultName: summary?.name ?? activeProfile.defaultName,
      codename: displayOverrides?.chatTitle ?? summary?.codename ?? activeProfile.codename,
      tagline: displayOverrides?.chatSubline ?? activeProfile.tagline,
      statuses: {
        ...activeProfile.statuses,
        normal: displayOverrides?.statusLine?.normal ?? activeProfile.statuses.normal,
        broken: displayOverrides?.statusLine?.broken ?? activeProfile.statuses.broken
      },
      fallbackAvatars
    };
  }, [activeProfile, activeCharacterSummary, displayOverrides]);

  const npcOptions = characterRoster;
  const npcLocalization = useMemo(
    () => getNpcLocalization(activeCharacterId, currentLanguage),
    [activeCharacterId, currentLanguage]
  );

  const resolvedAppTitle =
    displayOverrides?.title ??
    npcLocalization?.appTitle ??
    activeCharacterSummary?.codename ??
    profileForDisplay.codename;
  const resolvedAppSubtitle =
    displayOverrides?.subtitle ?? npcLocalization?.appSubtitle ?? profileForDisplay.tagline;

  const avatar = useMemo(() => {
    if (state.avatarUrl) {
      return state.avatarUrl;
    }
    if (activeCharacterSummary?.avatarUrl) {
      return activeCharacterSummary.avatarUrl;
    }
    return isBroken ? profileForDisplay.fallbackAvatars.broken : profileForDisplay.fallbackAvatars.normal;
  }, [state.avatarUrl, isBroken, profileForDisplay, activeCharacterSummary]);

  const initialPanelPosition = useMemo(() => {
    if (typeof window === 'undefined') {
      return { x: 24, y: 120 };
    }
    const margin = 24;
    const x = Math.max(margin, window.innerWidth - DEBUG_PANEL_SIZE.width - margin);
    const y = Math.max(80, window.innerHeight - DEBUG_PANEL_SIZE.height - 140);
    return { x, y };
  }, []);

  const debugDock = useDraggable({
    storageKey: 'npc-debug-dock',
    defaultPosition: initialPanelPosition,
    surfaceSize: DEBUG_PANEL_SIZE,
    boundsPadding: 12
  });

  useEffect(() => {
    if (resolvedAppTitle) {
      document.title = resolvedAppTitle;
    }
  }, [resolvedAppTitle]);

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

  const handleNpcChange = async (id: string) => {
    if (!id || id === activeCharacterId) return;
    setActiveCharacterId(id);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage?.setItem(NPC_STORAGE_KEY, id);
      } catch {
        // ignore storage persistence failures
      }
      (window as Window & { __npc_id?: string }).__npc_id = id;
    }
  };

  const handleToggleDebug = () => {
    if (debugDock.isDragging) return;
    toggleDebug();
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
          profile={profileForDisplay}
          personaRuntime={personaRuntime}
          personaHighlights={personaHighlights}
        />

        <section className={styles.chatPanel}>
          <ChatHeader
            isBooting={isBooting}
            messageCount={session?.messages.length ?? 0}
            currentLanguage={currentLanguage}
            onLanguageChange={handleLanguageChange}
            appSubtitle={resolvedAppSubtitle}
            onNpcChange={handleNpcChange}
            npcOptions={npcOptions}
            activeNpcId={activeCharacterId}
            npcOptionsLoading={charactersPending}
            profile={profileForDisplay}
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
            characterCodename={profileForDisplay.codename}
          />

          <ChatInput
            input={input}
            setInput={setInput}
            isSending={isSending}
            isBooting={isBooting}
            onSend={sendMessage}
            characterName={profileForDisplay.defaultName}
            placeholderOverride={inputPlaceholder}
          />
        </section>
      </div>

      <button
        className={styles.floatingDebug}
        style={{
          left: debugDock.position.x + DEBUG_BUTTON_OFFSET.x,
          top: debugDock.position.y + DEBUG_BUTTON_OFFSET.y
        }}
        onPointerDown={debugDock.handlePointerDown}
        onClick={handleToggleDebug}
        data-dragging={debugDock.isDragging}
        aria-label="debug-toggle"
      >
        <Bug size={18} />
      </button>

      <DebugPanel
        isOpen={debugOpen}
        onClose={toggleDebug}
        systemLogs={systemLogs}
        state={state}
        personaRuntime={personaRuntime}
        draftImagePrompt={draftImagePrompt}
        draggableProps={{
          position: debugDock.position,
          onPointerDown: debugDock.handlePointerDown,
          isDragging: debugDock.isDragging
        }}
      />

      <SettingsModal isOpen={settingsOpen} onClose={toggleSettings} />
    </div>
  );
}
