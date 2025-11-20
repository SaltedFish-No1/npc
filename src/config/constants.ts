import { CHARACTER_PROFILE, USER_PROFILE } from './characterProfile';

export const TEXT_MODEL_NAME = 'doubao-seed-1-6-thinking-250715';
export const IMG_MODEL_NAME = 'doubao-seedream-4-0-250828';

const DEFAULT_API_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';
const DEV_PROXY_BASE_URL = import.meta.env.DEV ? '/ark-api' : undefined;
const ENV_API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '');

export const API_BASE_URL = ENV_API_BASE_URL || DEV_PROXY_BASE_URL || DEFAULT_API_BASE_URL;
export const DEFAULT_APP_ID = 'deep-persona-mob';

export const FALLBACK_AVATAR_NORMAL = CHARACTER_PROFILE.fallbackAvatars.normal;
export const FALLBACK_AVATAR_BROKEN = CHARACTER_PROFILE.fallbackAvatars.broken;
export const FALLBACK_USER_AVATAR = USER_PROFILE.fallbackAvatar;
