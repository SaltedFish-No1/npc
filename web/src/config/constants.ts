/**
 * 文件：web/src/config/constants.ts
 * 功能描述：前端运行常量与后端地址配置 | Description: Frontend constants and backend base URL configuration
 * 作者：NPC 项目组  ·  版本：v1.0.0
 * 创建日期：2025-11-24  ·  最后修改：2025-11-24
 * 依赖说明：依赖环境变量与角色/用户配置
 */
import { CHARACTER_PROFILE, USER_PROFILE } from './characterProfile';

const DEV_PROXY_BASE_URL = import.meta.env.DEV ? '/npc-api' : undefined;
const ENV_API_BASE_URL = import.meta.env.VITE_NPC_API_BASE_URL?.replace(/\/$/, '');
const DEFAULT_BACKEND_BASE_URL = 'http://localhost:4000';

/**
 * 后端基地址解析优先级：env → dev 代理 → 本地默认
 * Backend base URL priority: env → dev proxy → local default
 */
export const NPC_API_BASE_URL =
	ENV_API_BASE_URL || DEV_PROXY_BASE_URL || DEFAULT_BACKEND_BASE_URL;
export const NPC_API_KEY = (import.meta.env.VITE_NPC_API_KEY || '').trim();
export const IS_BACKEND_CONFIGURED = NPC_API_KEY.length > 0;

export const DEFAULT_APP_ID = 'deep-persona-mob';

export const FALLBACK_AVATAR_NORMAL = CHARACTER_PROFILE.fallbackAvatars.normal;
export const FALLBACK_AVATAR_BROKEN = CHARACTER_PROFILE.fallbackAvatars.broken;
export const FALLBACK_USER_AVATAR = USER_PROFILE.fallbackAvatar;
