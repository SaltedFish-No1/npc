import { SUPPORTED_LANGUAGES } from '@/config/i18nConfig';
import styles from '../../styles/ChatPage.module.css';
import { useTranslation } from 'react-i18next';
import { CHARACTER_PROFILE } from '@/config/characterProfile';

interface ChatHeaderProps {
  isBooting: boolean;
  messageCount: number;
  currentLanguage: string;
  onLanguageChange: (code: string) => void;
  appSubtitle?: string;
}

export function ChatHeader({
  isBooting,
  messageCount,
  currentLanguage,
  onLanguageChange,
  appSubtitle
}: ChatHeaderProps) {
  const { t } = useTranslation();

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
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
