// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
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

  it('sets canInstall=true when beforeinstallprompt fires', () => {
    const { result } = renderHook(() => usePwaInstall());
    act(() => { window.dispatchEvent(new Event('beforeinstallprompt')); });
    expect(result.current.canInstall).toBe(true);
  });
});
