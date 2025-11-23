import { CHARACTER_PROFILE, USER_PROFILE } from './characterProfile';

const DEV_PROXY_BASE_URL = import.meta.env.DEV ? '/npc-api' : undefined;
const ENV_API_BASE_URL = import.meta.env.VITE_NPC_API_BASE_URL?.replace(/\/$/, '');
const DEFAULT_BACKEND_BASE_URL = 'http://localhost:4000';

export const NPC_API_BASE_URL =
	ENV_API_BASE_URL || DEV_PROXY_BASE_URL || DEFAULT_BACKEND_BASE_URL;
export const NPC_API_KEY = (import.meta.env.VITE_NPC_API_KEY || '').trim();
export const IS_BACKEND_CONFIGURED = NPC_API_KEY.length > 0;

export const DEFAULT_APP_ID = 'deep-persona-mob';

export const FALLBACK_AVATAR_NORMAL = CHARACTER_PROFILE.fallbackAvatars.normal;
export const FALLBACK_AVATAR_BROKEN = CHARACTER_PROFILE.fallbackAvatars.broken;
export const FALLBACK_USER_AVATAR = USER_PROFILE.fallbackAvatar;
