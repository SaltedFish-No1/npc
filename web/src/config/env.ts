import { DEFAULT_APP_ID } from './constants';

export const getAppId = (): string => {
  if (typeof window !== 'undefined' && (window as Record<string, any>).__app_id) {
    return (window as Record<string, any>).__app_id as string;
  }
  return import.meta.env.VITE_APP_ID || DEFAULT_APP_ID;
};
