import { useMemo, useState } from 'react';
import { SUPPORTED_LANGUAGES } from '@/config/i18nConfig';
import styles from '../../styles/ChatPage.module.css';
import { useTranslation } from 'react-i18next';
import {
  CHARACTER_PROFILE,
  NPC_STORAGE_KEY,
  getActiveNpcId,
  getNpcOptions
} from '@/config/characterProfile';

interface ChatHeaderProps {
  isBooting: boolean;
  messageCount: number;
  currentLanguage: string;
  onLanguageChange: (code: string) => void;
  appSubtitle?: string;
  onNpcChange?: (id: string) => Promise<void> | void;
}

export function ChatHeader({
  isBooting,
  messageCount,
  currentLanguage,
  onLanguageChange,
  appSubtitle,
  onNpcChange
}: ChatHeaderProps) {
  const { t } = useTranslation();
  const npcOptions = useMemo(() => getNpcOptions(), []);
  const [selectedNpcId, setSelectedNpcId] = useState(() => getActiveNpcId());
  const [isSwitching, setIsSwitching] = useState(false);

  const handleNpcChange = async (nextId: string) => {
    if (nextId === selectedNpcId || isSwitching) return;
    setSelectedNpcId(nextId);
    setIsSwitching(true);

    if (typeof window === 'undefined') {
      setIsSwitching(false);
      return;
    }

    try {
      if (onNpcChange) {
        await onNpcChange(nextId);
      }

      try {
        window.localStorage?.setItem(NPC_STORAGE_KEY, nextId);
      } catch {
        // ignore storage failures
      }

      (window as Window & { __npc_id?: string }).__npc_id = nextId;
      window.location.reload();
    } catch (error) {
      console.error('Failed to handle NPC change', error);
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <div className={styles.chatHeader}>
      <div className={styles.chatTitle}>
        <h2>{CHARACTER_PROFILE.codename}</h2>
        <p className={styles.chatSubtitle}>{CHARACTER_PROFILE.tagline}</p>
        {appSubtitle && <p className={styles.chatSubline}>{appSubtitle}</p>}
      </div>

      <div className={styles.headerMeta}>
        <div className={styles.statusLine}>
          {isBooting ? t('chat.header.connecting') : t('chat.header.events', { count: messageCount })}
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
            value={selectedNpcId}
            onChange={(event) => handleNpcChange(event.target.value)}
            disabled={isSwitching}
          >
            {npcOptions.map((option) => (
              <option key={option.id} value={option.id} title={option.tagline}>
                {option.codename}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
