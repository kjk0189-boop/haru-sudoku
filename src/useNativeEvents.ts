import { useEffect, useRef } from 'react';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { App } from '@capacitor/app';

/** Keep native listeners stable while always calling the current UI handlers. */
export function useNativeEvents(onBack: () => void, onBackground: () => void): void {
  const handlers = useRef({ onBack, onBackground });
  handlers.current = { onBack, onBackground };
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let disposed = false;
    const listeners: PluginListenerHandle[] = [];
    const attach = async () => {
      const back = await App.addListener('backButton', () => handlers.current.onBack());
      if (disposed) { await back.remove(); return; }
      listeners.push(back);
      const state = await App.addListener('appStateChange', ({ isActive }) => { if (!isActive) handlers.current.onBackground(); });
      if (disposed) await state.remove(); else listeners.push(state);
    };
    void attach().catch(() => { /* Browser UI remains operable if a native listener is unavailable. */ });
    return () => { disposed = true; for (const listener of listeners) void listener.remove(); };
  }, []);
}

export function minimizeNativeApp(): void { if (Capacitor.isNativePlatform()) void App.minimizeApp(); }
