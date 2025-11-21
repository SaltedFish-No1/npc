/// <reference types="vite/client" />

declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare global {
  interface Window {
    __npc_id?: string;
  }
}

export {};
