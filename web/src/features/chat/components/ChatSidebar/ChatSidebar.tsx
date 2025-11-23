import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import {
  Brain,
  Loader2,
  RefreshCw,
  Settings
} from 'lucide-react';
import styles from './ChatSidebar.module.css';
import { CharacterState } from '@/schemas/chat';
import { IS_BACKEND_CONFIGURED, NPC_API_BASE_URL } from '@/config/constants';
import { CHARACTER_PROFILE } from '@/config/characterProfile';

interface ChatSidebarProps {
  isBroken: boolean;
  avatar: string;
  state: CharacterState;
  isGenerating: boolean;
  onToggleSettings: () => void;
  onGenerateAvatar: () => void;
}

export function ChatSidebar({
  isBroken,
  avatar,
  state,
  isGenerating,
  onToggleSettings,
  onGenerateAvatar
}: ChatSidebarProps) {
  const { t } = useTranslation();
  const backendDisplay = (() => {
    if (NPC_API_BASE_URL.startsWith('http')) {
      try {
        return new URL(NPC_API_BASE_URL).host;
      } catch {
        return NPC_API_BASE_URL;
      }
    }
    return `${NPC_API_BASE_URL} · ${t('chat.sidebar.proxyTag')}`;
  })();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.titleGroup}>
        <div>
          <h1 className={classNames(styles.title, { glitch: isBroken })}>
            {CHARACTER_PROFILE.codename}
          </h1>
          <div className={styles.statusLine}>
            <span className={styles.pulseDot} />
            <span>
              {isBroken ? CHARACTER_PROFILE.statuses.broken : CHARACTER_PROFILE.statuses.normal}
            </span>
          </div>
        </div>
        <button className={styles.ghostButton} onClick={onToggleSettings}>
          <Settings size={18} />
        </button>
      </div>

      <div className={styles.avatarCard}>
  <img src={avatar} alt={CHARACTER_PROFILE.codename} className={styles.avatarImage} />
        <div className={styles.avatarOverlay}>
          <button className={styles.ghostButton} onClick={onGenerateAvatar}>
            {isGenerating ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
            {t('actions.generate')}
          </button>
        </div>
        <div className={styles.badge}>
          {isBroken ? CHARACTER_PROFILE.statuses.badgeBroken : CHARACTER_PROFILE.statuses.badgeNormal}
        </div>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statLabel}>
            <span>{CHARACTER_PROFILE.stats.stressLabel}</span>
            <span>{state.stress}%</span>
          </div>
          <div className={styles.statBar}>
            <div className={styles.statFill} style={{ width: `${state.stress}%` }} />
          </div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>
            <span>{CHARACTER_PROFILE.stats.trustLabel}</span>
            <span>{state.trust}%</span>
          </div>
          <div className={styles.statBar}>
            <div
              className={styles.statFill}
              style={{ width: `${state.trust}%`, background: 'linear-gradient(90deg,#0ea5e9,#22d3ee)' }}
            />
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>
          <Brain size={14} />
          {t('chat.sidebar.sectionTitle')}
        </h4>
        <div className={styles.stateSnapshot}>
          <pre style={{ margin: 0 }}>{JSON.stringify(state, null, 2)}</pre>
        </div>
      </div>

      <div className={styles.panelFooter}>
        <span>
          {t('chat.sidebar.engineLabel')}: {IS_BACKEND_CONFIGURED ? 'NPC API' : t('chat.sidebar.pendingLabel')}
        </span>
        <span className={styles.backendMeta}>{backendDisplay}</span>
      </div>
    </aside>
  );
}
