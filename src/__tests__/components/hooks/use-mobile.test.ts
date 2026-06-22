// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { useIsMobile } from '@/hooks/use-mobile';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('useIsMobile', () => {
  afterEach(() => {
    // Restaura o viewport do desktop entre os testes
    window.innerWidth = 1024;
    vi.restoreAllMocks();
  });

  it('returns false on desktop', () => {
    // Viewport de desktop: a largura e maior que o breakpoint de 768px
    window.innerWidth = 1024;

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it('returns true when window is mobile (width < 768px)', () => {
    // Re-mock do matchMedia para refletir a viewport movel
    (window.matchMedia as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })
    );
    window.innerWidth = 500;

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it('cleans up the event listener on unmount', () => {
    const removeEventListener = vi.fn();
    const addEventListener = vi.fn();

    (window.matchMedia as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener,
        removeEventListener,
        dispatchEvent: vi.fn(),
      })
    );

    const { unmount } = renderHook(() => useIsMobile());

    expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

    unmount();

    // Ao desmontar, o listener de "change" deve ser removido
    expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
