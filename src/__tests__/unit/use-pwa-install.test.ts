// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePwaInstall } from '@/lib/hooks/use-pwa-install';

describe('usePwaInstall', () => {
  beforeEach(() => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers beforeinstallprompt listener on mount', () => {
    const addListener = vi.spyOn(window, 'addEventListener');
    renderHook(() => usePwaInstall());
    expect(addListener).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function));
  });

  it('sets canInstall=true when beforeinstallprompt fires', () => {
    const { result } = renderHook(() => usePwaInstall());
    act(() => { window.dispatchEvent(new Event('beforeinstallprompt')); });
    expect(result.current.canInstall).toBe(true);
  });

  // DT: all 8 combinations of {deferredPrompt, isInstalled, isStandalone}
  it.each([
    { deferred: false, installed: false, standalone: false, expected: false },
    { deferred: true,  installed: false, standalone: false, expected: true  },
    { deferred: false, installed: true,  standalone: false, expected: false },
    { deferred: false, installed: false, standalone: true,  expected: false },
    { deferred: true,  installed: true,  standalone: false, expected: false },
    { deferred: true,  installed: false, standalone: true,  expected: false },
    { deferred: false, installed: true,  standalone: true,  expected: false },
    { deferred: true,  installed: true,  standalone: true,  expected: false },
  ])('canInstall=$expected when deferred=$deferred, installed=$installed, standalone=$standalone', ({
    deferred, installed, standalone, expected,
  }) => {
    if (standalone) {
      vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    }
    const { result } = renderHook(() => usePwaInstall());
    if (deferred) act(() => { window.dispatchEvent(new Event('beforeinstallprompt')); });
    if (installed) act(() => { window.dispatchEvent(new Event('appinstalled')); });
    expect(result.current.canInstall).toBe(expected);
  });
});
