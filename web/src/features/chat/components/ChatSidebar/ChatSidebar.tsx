import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import { Brain, Loader2, RefreshCw, Settings } from 'lucide-react';
import styles from './ChatSidebar.module.css';
import { CharacterState } from '@/schemas/chat';
import { IS_BACKEND_CONFIGURED, NPC_API_BASE_URL } from '@/config/constants';
import type { CharacterProfile } from '@/config/characterProfile';
import type { DigitalPersonaRuntimeState, PersonaRuntimeHighlights } from '@/schemas/persona';

type RuntimeStat = {
  key: string;
  label: string;
  value: number;
  accent: string;
};

type RuntimeFactRow = {
  key: string;
  label: string;
  value: string;
};

type Translator = (key: string, options?: Record<string, unknown>) => string;

type ChatSidebarProps = {
  isBroken: boolean;
  avatar: string;
  state: CharacterState;
  isGenerating: boolean;
  onToggleSettings: () => void;
  onGenerateAvatar: () => void;
  profile: CharacterProfile;
  personaRuntime?: DigitalPersonaRuntimeState;
  personaHighlights?: PersonaRuntimeHighlights;
};

export function ChatSidebar({
  isBroken,
  avatar,
  state,
  isGenerating,
  onToggleSettings,
  onGenerateAvatar,
  profile,
  personaRuntime,
  personaHighlights
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

  const badgeLabel = state.avatarLabel
    ? state.avatarLabel
    : isBroken
      ? profile.statuses.broken
      : profile.statuses.normal;

  const resolvedHighlights = useMemo(
    () => personaHighlights ?? (personaRuntime ? deriveRuntimeHighlights(personaRuntime) : undefined),
    [personaHighlights, personaRuntime]
  );

  const highlightStats = useMemo<RuntimeStat[]>(() => {
    if (!resolvedHighlights?.percentMetrics?.length) return [];
    return resolvedHighlights.percentMetrics.slice(0, 2).map((metric): RuntimeStat => ({
      key: `${metric.key}:${metric.targetId ?? 'default'}`,
      label: getRuntimeStatLabel(metric.key, metric.targetId, t),
      value: metric.value,
      accent:
        metric.key === 'stress_meter.current_level'
          ? 'linear-gradient(90deg,#f472b6,#fb7185)'
          : 'linear-gradient(90deg,#22d3ee,#38bdf8)'
    }));
  }, [resolvedHighlights, t]);

  const fallbackStats = useMemo<RuntimeStat[]>(
    () => [
      {
        key: 'state.stress',
        label: profile.stats.stressLabel,
        value: state.stress,
        accent: 'linear-gradient(90deg,var(--primary),#ffffff)'
      },
      {
        key: 'state.trust',
        label: profile.stats.trustLabel,
        value: state.trust,
        accent: 'linear-gradient(90deg,#0ea5e9,#22d3ee)'
      }
    ],
    [profile.stats.stressLabel, profile.stats.trustLabel, state.stress, state.trust]
  );

  const runtimeInfo = useMemo<RuntimeFactRow[]>(() => {
    if (!resolvedHighlights?.narrativeFacts?.length) return [];
    return resolvedHighlights.narrativeFacts.map((fact): RuntimeFactRow => ({
      key: `${fact.key}:${fact.targetId ?? 'default'}`,
      label: getRuntimeInfoLabel(fact.key, fact.targetId, t),
      value: formatRuntimeFactValue(fact.key, fact.value, t)
    }));
  }, [resolvedHighlights, t]);

  const primaryFacts = runtimeInfo.slice(0, 2);
  const extraFacts = runtimeInfo.slice(2);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.fixedHeader}>
        <div className={styles.titleGroup}>
          <div>
            <h1 className={classNames(styles.title, { glitch: isBroken })}>{profile.codename}</h1>
            <div className={styles.statusLine}>
              <span className={styles.pulseDot} />
              <span>
                {isBroken ? profile.statuses.broken : profile.statuses.normal}
              </span>
            </div>
          </div>
          <button className={styles.ghostButton} onClick={onToggleSettings}>
            <Settings size={18} />
          </button>
        </div>

        <div className={styles.avatarCard}>
          <img src={avatar} alt={profile.codename} className={styles.avatarImage} />
          <div className={styles.avatarOverlay}>
            <button className={styles.ghostButton} onClick={onGenerateAvatar}>
              {isGenerating ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
              {t('actions.generate')}
            </button>
          </div>
          <div className={styles.badge}>
            {badgeLabel}
          </div>
        </div>
      </div>

      <div className={styles.scrollRegion}>
        {resolvedHighlights ? (
          <div className={styles.runtimePanel}>
          <div className={styles.runtimeHeader}>
            <Brain size={14} />
            <div>
              <p className={styles.runtimeTitle}>{t('chat.sidebar.runtimeTitle')}</p>
              <p className={styles.runtimeSubtitle}>{t('chat.sidebar.runtimeSubtitle')}</p>
            </div>
          </div>
          {highlightStats.length > 0 && (
            <div className={styles.stats}>
              {highlightStats.map((stat) => (
                <div key={stat.key} className={styles.stat}>
                  <div className={styles.statLabel}>
                    <span>{stat.label}</span>
                    <span>{stat.value}%</span>
                  </div>
                  <div className={styles.statBar}>
                    <div
                      className={styles.statFill}
                      style={{ width: `${stat.value}%`, background: stat.accent }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          {runtimeInfo.length > 0 && (
            <div className={styles.runtimeInfo}>
              {primaryFacts.map((fact) => (
                <div key={fact.key} className={styles.runtimeRow}>
                  <span className={styles.runtimeLabel}>{fact.label}</span>
                  <span className={styles.runtimeValue}>{fact.value}</span>
                </div>
              ))}
              {extraFacts.length > 0 && (
                <details className={styles.runtimeAccordion}>
                  <summary>{t('chat.sidebar.runtimeAccordion.more')}</summary>
                  <div className={styles.runtimeInfo}>
                    {extraFacts.map((fact) => (
                      <div key={fact.key} className={styles.runtimeRow}>
                        <span className={styles.runtimeLabel}>{fact.label}</span>
                        <span className={styles.runtimeValue}>{fact.value}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
          </div>
        ) : (
          <div className={styles.stats}>
          {fallbackStats.map((stat) => (
            <div key={stat.key} className={styles.stat}>
              <div className={styles.statLabel}>
                <span>{stat.label}</span>
                <span>{stat.value}%</span>
              </div>
              <div className={styles.statBar}>
                <div
                  className={styles.statFill}
                  style={{ width: `${stat.value}%`, background: stat.accent }}
                />
              </div>
            </div>
          ))}
          </div>
        )}

        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>
            <Brain size={14} />
            {t('chat.sidebar.sectionTitle')}
          </h4>
          <details className={styles.snapshotDetails}>
            <summary>{t('chat.sidebar.stateSummary')}</summary>
            <div className={styles.stateSnapshot}>
              <pre style={{ margin: 0 }}>{JSON.stringify(state, null, 2)}</pre>
            </div>
          </details>
        </div>

        <div className={styles.panelFooter}>
          <span>
            {t('chat.sidebar.engineLabel')}:{' '}
            {IS_BACKEND_CONFIGURED ? 'NPC API' : t('chat.sidebar.pendingLabel')}
          </span>
          <span className={styles.backendMeta}>{backendDisplay}</span>
        </div>
      </div>
    </aside>
  );
}

const clampPercentage = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

const normalizeTrustToPercent = (trust: number) => clampPercentage(((trust + 100) / 200) * 100);

const deriveRuntimeHighlights = (runtime: DigitalPersonaRuntimeState): PersonaRuntimeHighlights => {
  const percentMetrics: PersonaRuntimeHighlights['percentMetrics'] = [];
  const narrativeFacts: PersonaRuntimeHighlights['narrativeFacts'] = [];

  if (typeof runtime.stress_meter?.current_level === 'number') {
    percentMetrics.push({ key: 'stress_meter.current_level', value: clampPercentage(runtime.stress_meter.current_level) });
  }

  const userRelation = runtime.relationship_matrix?.find((entry) => entry.target_id === 'user');
  if (typeof userRelation?.trust_level === 'number') {
    percentMetrics.push({
      key: 'relationship_matrix.trust_level',
      value: normalizeTrustToPercent(userRelation.trust_level),
      rawValue: userRelation.trust_level,
      targetId: userRelation.target_id
    });
  }

  if (runtime.scene_context?.current_goal) {
    narrativeFacts.push({ key: 'scene_context.current_goal', value: runtime.scene_context.current_goal });
  }
  if (runtime.scene_context?.current_tactic) {
    narrativeFacts.push({ key: 'scene_context.current_tactic', value: runtime.scene_context.current_tactic });
  }
  if (runtime.current_status?.occupation) {
    narrativeFacts.push({ key: 'current_status.occupation', value: runtime.current_status.occupation });
  }
  if (runtime.current_status?.health_status) {
    narrativeFacts.push({ key: 'current_status.health_status', value: runtime.current_status.health_status });
  }
  if (runtime.current_status?.appearance_variable) {
    narrativeFacts.push({ key: 'current_status.appearance_variable', value: runtime.current_status.appearance_variable });
  }
  if (runtime.stress_meter?.active_triggers?.length) {
    narrativeFacts.push({
      key: 'stress_meter.active_triggers',
      value: runtime.stress_meter.active_triggers.join(', ')
    });
  }
  if (runtime.temporal_status?.current_date) {
    narrativeFacts.push({
      key: 'temporal_status.current_date',
      value: runtime.temporal_status.current_date
    });
  }
  if (typeof runtime.temporal_status?.calculated_age === 'number') {
    narrativeFacts.push({
      key: 'temporal_status.calculated_age',
      value: runtime.temporal_status.calculated_age.toString()
    });
  }
  if (userRelation?.knowledge_about_target) {
    narrativeFacts.push({
      key: 'relationship_matrix.knowledge',
      value: userRelation.knowledge_about_target,
      targetId: userRelation.target_id
    });
  }

  return { percentMetrics, narrativeFacts };
};

const resolveTargetLabel = (targetId: string | undefined, t: Translator) => {
  if (!targetId) return t('chat.sidebar.runtimeStats.targets.default');
  if (targetId === 'user') return t('chat.sidebar.runtimeStats.targets.user');
  return targetId;
};

const getRuntimeStatLabel = (key: string, targetId: string | undefined, t: Translator) => {
  switch (key) {
    case 'stress_meter.current_level':
      return t('chat.sidebar.runtimeStats.stress');
    case 'relationship_matrix.trust_level':
      return t('chat.sidebar.runtimeStats.rapport', { target: resolveTargetLabel(targetId, t) });
    default:
      return key;
  }
};

const getRuntimeInfoLabel = (key: string, targetId: string | undefined, t: Translator) => {
  switch (key) {
    case 'scene_context.current_goal':
      return t('chat.sidebar.runtimeInfo.goal');
    case 'scene_context.current_tactic':
      return t('chat.sidebar.runtimeInfo.tactic');
    case 'current_status.occupation':
      return t('chat.sidebar.runtimeInfo.occupation');
    case 'current_status.health_status':
      return t('chat.sidebar.runtimeInfo.health');
    case 'current_status.appearance_variable':
      return t('chat.sidebar.runtimeInfo.appearance');
    case 'stress_meter.active_triggers':
      return t('chat.sidebar.runtimeInfo.triggers');
    case 'temporal_status.current_date':
      return t('chat.sidebar.runtimeInfo.timeline');
    case 'temporal_status.calculated_age':
      return t('chat.sidebar.runtimeInfo.age');
    case 'relationship_matrix.knowledge':
      return t('chat.sidebar.runtimeInfo.knowledge', { target: resolveTargetLabel(targetId, t) });
    default:
      return key;
  }
};

const formatRuntimeFactValue = (key: string, value: string, t: Translator) => {
  if (key === 'temporal_status.current_date') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
    }
  }
  if (key === 'temporal_status.calculated_age') {
    const age = Number(value);
    if (!Number.isNaN(age)) {
      return t('chat.sidebar.runtimeInfo.ageValue', { value: age });
    }
  }
  return value;
};
