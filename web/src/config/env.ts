import { DEFAULT_APP_ID } from './constants';

export const getAppId = (): string => {
  if (typeof window !== 'undefined') {
    const appId = (window as unknown as { __app_id?: string }).__app_id;
    if (appId) return appId;
  }
  const envAppId = import.meta.env.VITE_APP_ID as string | undefined;
  return envAppId ?? DEFAULT_APP_ID;
};
