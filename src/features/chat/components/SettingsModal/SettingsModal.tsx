import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Circle, Image as ImageIcon, Settings } from 'lucide-react';
import styles from './SettingsModal.module.css';
import { settingsSchema, SettingsForm } from '@/schemas/chat';
import { IMG_MODEL_NAME, TEXT_MODEL_NAME } from '@/config/constants';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string | null;
  onSave: (data: SettingsForm) => void;
}

export function SettingsModal({ isOpen, onClose, apiKey, onSave }: SettingsModalProps) {
  const { t } = useTranslation();
  const { register, handleSubmit, formState, reset } = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { apiKey: apiKey ?? '' }
  });

  useEffect(() => {
    reset({ apiKey: apiKey ?? '' });
  }, [apiKey, reset]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h3 style={{ marginTop: 0, marginBottom: 10 }}>{t('settings.title')}</h3>
        <form onSubmit={handleSubmit(onSave)}>
          <div className={styles.field}>
            <label className={styles.label}>{t('labels.apiKey')}</label>
            <input
              type="password"
              className={styles.input}
              placeholder="sk-..."
              {...register('apiKey')}
            />
            {formState.errors.apiKey && (
              <span className={styles.errorText}>{formState.errors.apiKey.message}</span>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t('settings.modelsLabel')}</label>
            <div>
              <span className={styles.chip}>
                <Circle size={10} /> {t('labels.textModel')}: {TEXT_MODEL_NAME}
              </span>
              <span className={styles.chip}>
                <ImageIcon size={12} /> {t('labels.imageModel')}: {IMG_MODEL_NAME}
              </span>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.ghostButton} onClick={onClose}>
              {t('actions.cancel')}
            </button>
            <button className={styles.sendButton} type="submit">
              <Settings size={14} /> {t('actions.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
