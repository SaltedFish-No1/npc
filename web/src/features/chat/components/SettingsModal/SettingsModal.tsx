import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link2, Shield } from 'lucide-react';
import styles from './SettingsModal.module.css';
import { IS_BACKEND_CONFIGURED, NPC_API_BASE_URL, NPC_API_KEY } from '@/config/constants';

type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { t } = useTranslation();
  const endpointLabel = useMemo(() => {
    if (NPC_API_BASE_URL.startsWith('http')) {
      try {
        const url = new URL(NPC_API_BASE_URL);
        return url.origin;
      } catch {
        return NPC_API_BASE_URL;
      }
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}${NPC_API_BASE_URL}`;
  }, []);

  const maskedKey = useMemo(() => {
    if (!NPC_API_KEY) return t('settings.apiKeyUnset');
    if (NPC_API_KEY.length <= 8) return NPC_API_KEY.replace(/./g, '•');
    return `${NPC_API_KEY.slice(0, 4)}••••${NPC_API_KEY.slice(-2)}`;
  }, [t]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h3 style={{ marginTop: 0, marginBottom: 10 }}>{t('settings.title')}</h3>

        <div className={styles.field}>
          <label className={styles.label}>{t('settings.backendEndpoint')}</label>
          <div className={styles.chip}>
            <Link2 size={14} /> {endpointLabel}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>{t('settings.authKey')}</label>
          <div className={styles.chip}>
            <Shield size={14} /> {IS_BACKEND_CONFIGURED ? maskedKey : t('settings.apiKeyUnset')}
          </div>
        </div>

        <p className={styles.helperText}>{t('settings.backendDescription')}</p>

        <div className={styles.modalFooter}>
          <button type="button" className={styles.sendButton} onClick={onClose}>
            {t('actions.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
