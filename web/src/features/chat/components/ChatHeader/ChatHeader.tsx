import { useState } from 'react';
import { SUPPORTED_LANGUAGES } from '@/config/i18nConfig';
import styles from '../../styles/ChatPage.module.css';
import { useTranslation } from 'react-i18next';
import type { CharacterProfile } from '@/config/characterProfile';
import type { CharacterSummary } from '@/services/chatService';

type ChatHeaderProps = {
  isBooting: boolean;
  messageCount: number;
  currentLanguage: string;
  onLanguageChange: (code: string) => void;
  appSubtitle?: string;
  onNpcChange?: (id: string) => Promise<void> | void;
  npcOptions: CharacterSummary[];
  activeNpcId: string;
  npcOptionsLoading?: boolean;
  profile: CharacterProfile;
};

export function ChatHeader({
  isBooting,
  messageCount,
  currentLanguage,
  onLanguageChange,
  appSubtitle,
  onNpcChange,
  npcOptions,
  activeNpcId,
  npcOptionsLoading,
  profile
}: ChatHeaderProps) {
  const { t } = useTranslation();
  const [isSwitching, setIsSwitching] = useState(false);

  const handleNpcChange = async (nextId: string) => {
    if (nextId === activeNpcId || isSwitching) return;
    setIsSwitching(true);

    try {
      if (onNpcChange) {
        await onNpcChange(nextId);
      }
    } catch (error) {
      console.error('Failed to handle NPC change', error);
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <div className={styles.chatHeader}>
      <div className={styles.chatTitle}>
        <h2>{profile.codename}</h2>
        <p className={styles.chatSubtitle}>{profile.tagline}</p>
        {appSubtitle && <p className={styles.chatSubline}>{appSubtitle}</p>}
      </div>

      <div className={styles.headerMeta}>
        <div className={styles.statusLine}>
          {isBooting
            ? t('chat.header.connecting')
            : t('chat.header.events', { count: messageCount })}
        </div>
        <label className={styles.languageLabel}>
          <span>{t('chat.header.language')}</span>
          <select
            className={styles.languageSelect}
            value={currentLanguage}
            onChange={(e) => onLanguageChange(e.target.value)}
            disabled={isSwitching}
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.languageLabel}>
          <span>{t('chat.header.character')}</span>
          <select
            className={styles.languageSelect}
            value={activeNpcId}
            onChange={(event) => handleNpcChange(event.target.value)}
            disabled={isSwitching || npcOptionsLoading || npcOptions.length === 0}
          >
            {npcOptions.map((option) => (
              <option key={option.id} value={option.id} title={option.name}>
                {option.display?.chatTitle ?? option.codename ?? option.name}
              </option>
            ))}
            {!npcOptions.length && (
              <option value="" disabled>
                {t('chat.header.connecting')}
              </option>
            )}
          </select>
        </label>
      </div>
    </div>
  );
}
