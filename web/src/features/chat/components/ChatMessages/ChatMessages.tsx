import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import { Brain, Image as ImageIcon } from 'lucide-react';
import styles from './ChatMessages.module.css';
import { ChatMessage, CharacterState } from '@/schemas/chat';
import { FALLBACK_USER_AVATAR } from '@/config/constants';
import { USER_PROFILE } from '@/config/characterProfile';

type ChatMessagesProps = {
  messages: ChatMessage[];
  isBooting: boolean;
  avatar: string;
  state: CharacterState;
  isThinking?: boolean;
  hasMoreHistory?: boolean;
  isHistoryLoading?: boolean;
  onLoadMore?: () => void;
  characterCodename: string;
};

export function ChatMessages({
  messages,
  isBooting,
  avatar,
  state,
  isThinking,
  hasMoreHistory = false,
  isHistoryLoading = false,
  onLoadMore,
  characterCodename
}: ChatMessagesProps) {
  const { t } = useTranslation();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  return (
    <div className={styles.messages}>
      {hasMoreHistory && (
        <button
          type="button"
          className={styles.loadMoreButton}
          disabled={isHistoryLoading}
          onClick={onLoadMore}
        >
          {isHistoryLoading
            ? t('chat.messages.loadingHistory', 'Loading history…')
            : t('chat.messages.loadOlder', 'Load older messages')}
        </button>
      )}
      {isBooting && <div>{t('state.loading')}</div>}
      {!isBooting &&
        messages.map((msg, idx) => {
          const isAssistant = msg.role === 'assistant';
          const assistantThought = (msg.thought ?? '').trim();
          const showDebugRibbon =
            isAssistant &&
            (msg.stressChange !== undefined ||
              msg.trustChange !== undefined ||
              msg.currentStress !== undefined);
          return (
            <div
              key={msg.messageId ?? `${msg.role}-${msg.createdAt ?? idx}-${idx}`}
              className={classNames(styles.messageRow, {
                [styles.assistantRow]: isAssistant,
                [styles.userRow]: !isAssistant
              })}
            >
              <div className={styles.avatarSmall}>
                <img
                  src={isAssistant ? avatar : FALLBACK_USER_AVATAR}
                  alt={isAssistant ? characterCodename : USER_PROFILE.displayName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div className={classNames(styles.bubble, { [styles.userBubble]: !isAssistant })}>
                {isAssistant && assistantThought && (
                  <p className={styles.thought}>
                    <Brain size={12} /> {assistantThought}
                  </p>
                )}
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{msg.content}</div>
                {msg.imageUrl && (
                  <div className={styles.imagePreview}>
                    <img
                      src={msg.imageUrl}
                      alt={t('chat.messages.imageAlt')}
                      style={{ width: '100%', display: 'block' }}
                    />
                    <div className={styles.debugRibbon}>
                      <ImageIcon size={12} /> {msg.imagePrompt}
                    </div>
                  </div>
                )}
                {showDebugRibbon && (
                  <div className={styles.debugRibbon}>
                    {t('chat.messages.debug', {
                      stress: msg.stressChange ?? 0,
                      trust: msg.trustChange ?? 0,
                      stressSnapshot: msg.currentStress ?? state.stress
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      {isThinking && (
        <div className={classNames(styles.messageRow, styles.assistantRow, styles.thinkingRow)}>
          <div className={styles.avatarSmall}>
            <img
              src={avatar}
              alt={characterCodename}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <div className={classNames(styles.bubble, styles.thinkingBubble)}>
            <p className={styles.thinkingLabel}>{t('chat.messages.streaming')}</p>
            <div className={styles.thinkingDots} aria-live="polite" aria-busy="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
