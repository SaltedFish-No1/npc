import classNames from 'classnames';
import { AlertTriangle, Brain, Image as ImageIcon, Terminal } from 'lucide-react';
import styles from './DebugPanel.module.css';
import { CharacterState } from '@/schemas/chat';
import { SystemLog } from '@/stores/chatStore';
import { useTranslation } from 'react-i18next';
import type { PointerEvent as ReactPointerEvent } from 'react';

type DebugPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  systemLogs: SystemLog[];
  state: CharacterState;
  draftImagePrompt?: string;
  draggableProps?: {
    position: { x: number; y: number };
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
    isDragging: boolean;
  };
};

export function DebugPanel({
  isOpen,
  onClose,
  systemLogs,
  state,
  draftImagePrompt,
  draggableProps
}: DebugPanelProps) {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const floatingStyle = draggableProps
    ? { left: draggableProps.position.x, top: draggableProps.position.y }
    : undefined;

  return (
    <div className={styles.debugPanel} style={floatingStyle}>
      <div
        className={classNames(styles.debugHeader, {
          [styles.dragging]: draggableProps?.isDragging
        })}
        onPointerDown={draggableProps?.onPointerDown}
      >
        <span>
          <Terminal size={14} /> {t('chat.debug.panelTitle')}
        </span>
        <button className={styles.ghostButton} onClick={onClose}>
          {t('chat.debug.close')}
        </button>
      </div>
      <div className={styles.debugBody}>
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>
            <AlertTriangle size={12} /> {t('chat.debug.logs')}
          </h4>
          <div className={styles.logList}>
            {systemLogs.length === 0 && <span>{t('chat.debug.noEvents')}</span>}
            {systemLogs
              .slice()
              .reverse()
              .map((log, idx) => (
                <div
                  key={idx}
                  className={classNames(styles.logItem, {
                    [styles.logItemError]: log.level === 'error'
                  })}
                >
                  <strong>[{log.source}]</strong> {log.message}
                </div>
              ))}
          </div>
        </div>
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>
            <Brain size={12} /> {t('chat.debug.currentState')}
          </h4>
          <div className={styles.stateSnapshot}>
            <pre style={{ margin: 0 }}>{JSON.stringify(state, null, 2)}</pre>
          </div>
        </div>
        {draftImagePrompt && (
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>
              <ImageIcon size={12} /> {t('chat.debug.pendingImage')}
            </h4>
            <div className={styles.stateSnapshot}>
              <pre style={{ margin: 0 }}>{draftImagePrompt}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
