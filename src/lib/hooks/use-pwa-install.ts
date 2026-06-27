'use client';

import { useEffect } from 'react';

export function usePwaInstall() {
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  return {
    canInstall: false,
    isInstalled: false,
    promptInstall: async () => {},
  };
}
