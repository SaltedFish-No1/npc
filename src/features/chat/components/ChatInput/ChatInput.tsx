import { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Send } from 'lucide-react';
import styles from './ChatInput.module.css';
import { CHARACTER_PROFILE } from '@/config/characterProfile';

interface ChatInputProps {
	input: string;
	setInput: (value: string) => void;
	isSending: boolean;
	isBooting: boolean;
	onSend: (e: FormEvent) => void;
}

export function ChatInput({ input, setInput, isSending, isBooting, onSend }: ChatInputProps) {
	const { t } = useTranslation();

	return (
		<form className={styles.inputBar} onSubmit={onSend}>
			<input
				className={styles.textInput}
				placeholder={t('chat.input.placeholder', { name: CHARACTER_PROFILE.defaultName })}
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
