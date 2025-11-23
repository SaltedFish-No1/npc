import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import { Brain, Image as ImageIcon } from 'lucide-react';
import styles from './ChatMessages.module.css';
import { ChatMessage, CharacterState } from '@/schemas/chat';
import { FALLBACK_USER_AVATAR } from '@/config/constants';
import { CHARACTER_PROFILE, USER_PROFILE } from '@/config/characterProfile';

interface ChatMessagesProps {
  messages: ChatMessage[];
  isBooting: boolean;
  avatar: string;
  state: CharacterState;
}

export function ChatMessages({ messages, isBooting, avatar, state }: ChatMessagesProps) {
  const { t } = useTranslation();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className={styles.messages}>
      {isBooting && <div>{t('state.loading')}</div>}
      {!isBooting &&
        messages.map((msg, idx) => {
          const isAssistant = msg.role === 'assistant';
          return (
            <div
              key={`${idx}-${msg.role}`}
              className={classNames(styles.messageRow, {
                [styles.assistantRow]: isAssistant,
                [styles.userRow]: !isAssistant
              })}
            >
              <div className={styles.avatarSmall}>
                <img
                  src={isAssistant ? avatar : FALLBACK_USER_AVATAR}
                  alt={isAssistant ? CHARACTER_PROFILE.codename : USER_PROFILE.displayName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div className={classNames(styles.bubble, { [styles.userBubble]: !isAssistant })}>
                {isAssistant && msg.thought && (
                  <p className={styles.thought}>
                    <Brain size={12} /> {msg.thought}
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
                {isAssistant && (
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
      <div ref={messagesEndRef} />
    </div>
  );
}
