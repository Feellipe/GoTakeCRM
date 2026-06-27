// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePwaInstall } from '@/lib/hooks/use-pwa-install';

describe('usePwaInstall', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers beforeinstallprompt listener on mount', () => {
    const addListener = vi.spyOn(window, 'addEventListener');
    renderHook(() => usePwaInstall());
    expect(addListener).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function));
  });
});
