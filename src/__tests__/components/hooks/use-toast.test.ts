// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { useToast, toast } from '@/hooks/use-toast';

describe('useToast', () => {
  beforeEach(() => {
    // Usa fake timers para controlar a remocao assincrona dos toasts
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Limpa o estado global entre os testes e restaura timers reais
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.dismiss();
    });
    act(() => {
      vi.runAllTimers();
    });
    vi.useRealTimers();
  });

  it('starts with empty toasts', () => {
    const { result } = renderHook(() => useToast());

    expect(result.current.toasts).toEqual([]);
  });

  it('adds a toast to state when toast() is called', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Hello' });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Hello');
  });

  it('returns an id, dismiss, and update function from toast()', () => {
    const { result } = renderHook(() => useToast());

    let toastResult: ReturnType<typeof toast> | undefined;

    act(() => {
      toastResult = toast({ title: 'Hello' });
    });

    expect(toastResult).toBeDefined();
    expect(typeof toastResult?.id).toBe('string');
    expect(typeof toastResult?.dismiss).toBe('function');
    expect(typeof toastResult?.update).toBe('function');
  });

  it('removes a toast from state when dismiss() is called', () => {
    const { result } = renderHook(() => useToast());

    let toastResult: ReturnType<typeof toast> | undefined;
    act(() => {
      toastResult = toast({ title: 'Goodbye' });
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      result.current.dismiss(toastResult?.id);
    });

    // O dismiss marca o toast como closed e o coloca na fila de remocao.
    // A remocao efetiva do array acontece apos o timeout (TOAST_REMOVE_DELAY).
    act(() => {
      vi.runAllTimers();
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('enforces a maximum of 1 toast (TOAST_LIMIT = 1)', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'First toast' });
    });
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('First toast');

    // Ao adicionar um segundo toast, o primeiro deve ser removido pelo limite
    act(() => {
      toast({ title: 'Second toast' });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Second toast');
  });
});
