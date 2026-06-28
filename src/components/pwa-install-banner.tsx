'use client';

import React from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePwaInstall } from '@/lib/hooks/use-pwa-install';

export function PwaInstallBanner() {
  const { canInstall, promptInstall } = usePwaInstall();
  const [dismissed, setDismissed] = React.useState(false);

  if (!canInstall || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80 bg-card border border-border rounded-xl shadow-lg p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
          <Download className="w-5 h-5 text-stone-950" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Install GoTakeCRM</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add to your home screen for the best experience
          </p>
          <Button
            size="sm"
            className="mt-2 bg-amber-500 text-stone-950 hover:bg-amber-600"
            onClick={promptInstall}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Install App
          </Button>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
