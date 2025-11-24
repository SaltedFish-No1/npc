import { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Send } from 'lucide-react';
import styles from './ChatInput.module.css';

type ChatInputProps = {
  input: string;
  setInput: (value: string) => void;
  isSending: boolean;
  isBooting: boolean;
  onSend: (e: FormEvent) => void;
  characterName: string;
  placeholderOverride?: string;
};

/**
 * 功能：渲染聊天输入条，可根据角色 display 注入 placeholder
 * Description: Render chat input bar with optional backend-provided placeholder copy
 */
export function ChatInput({
  input,
  setInput,
  isSending,
  isBooting,
  onSend,
  characterName,
  placeholderOverride
}: ChatInputProps) {
  const { t } = useTranslation();

  return (
    <form className={styles.inputBar} onSubmit={onSend}>
      <input
        className={styles.textInput}
        placeholder={placeholderOverride ?? t('chat.input.placeholder', { name: characterName })}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={isSending || isBooting}
      />
      <button className={styles.sendButton} type="submit" disabled={isSending || isBooting}>
        {isSending ? <Activity size={18} className="spin" /> : <Send size={18} />}
        {t('actions.send')}
      </button>
    </form>
  );
}
