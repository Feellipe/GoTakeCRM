# PWA (Progressive Web App) — Vertical Slices

> **For Hermes:** Use `tdd` (Matt Pollock) for philosophy + `tdd-techniques` for test case design.
> Strict vertical slicing: RED (1 test) → GREEN (minimal code) → Refactor → Commit per cycle.

**Goal:** Make GoTakeCRM installable as a PWA on mobile and desktop.

**Architecture:** `@serwist/next` for service worker, static manifest + icons.

---

## Phase 1: Infrastructure (no tests — config only)

### Task 1: Install @serwist/next

```bash
npm install @serwist/next @serwist/sw
git add package.json package-lock.json && git commit -m "feat: install @serwist/next"
```

### Task 2: Generate PWA icons

Create `scripts/generate-pwa-icons.ts` with sharp (already installed). Run `npx tsx scripts/generate-pwa-icons.ts`. Add `public/icons/` to git.

### Task 3: Create manifest.json

Create `public/manifest.json` with name "GoTakeCRM", short_name "GoTake", golden theme, 192+512 icons.

Edit `src/app/layout.tsx` to add `manifest: '/manifest.json'` to metadata.

### Task 4: Configure Serwist worker

Create `src/app/sw.ts` with Serwist + defaultCache. Update `next.config.ts` with `withSerwist`.

```bash
git add public/sw.ts next.config.ts && git commit -m "feat: configure service worker"
```

---

## Phase 2: usePwaInstall hook — Vertical Slices

### Task 5 (Tracer bullet 🎯): Hook registers event listeners

**RED — 1 test:**

`src/__tests__/unit/use-pwa-install.test.ts`
```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePwaInstall } from '@/lib/hooks/use-pwa-install';

describe('usePwaInstall', () => {
  afterEach(() => vi.restoreAllMocks());

  it('registers beforeinstallprompt listener on mount', () => {
    const addListener = vi.spyOn(window, 'addEventListener');
    renderHook(() => usePwaInstall());
    expect(addListener).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function));
  });
});
```

**GREEN — minimal hook:**

`src/lib/hooks/use-pwa-install.ts`
```ts
'use client';
import { useEffect } from 'react';

export function usePwaInstall() {
  useEffect(() => {
    const handler = (e: Event) => e.preventDefault();
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  return { canInstall: false, isInstalled: false, promptInstall: async () => {} };
}
```

Run: `npx vitest run src/__tests__/unit/use-pwa-install.test.ts` → PASS

**Refactor + Commit:**
```bash
git add src/__tests__/unit/use-pwa-install.test.ts src/lib/hooks/use-pwa-install.ts
git commit -m "feat: add usePwaInstall hook with event listener registration"
```

---

### Task 6: beforeinstallprompt fires → canInstall = true

**RED:**
```ts
it('sets canInstall=true when beforeinstallprompt fires', () => {
  const { result } = renderHook(() => usePwaInstall());
  act(() => { window.dispatchEvent(new Event('beforeinstallprompt')); });
  expect(result.current.canInstall).toBe(true);
});
```

**GREEN:** Add `useState` for `deferredPrompt` and `canInstall`. Set `deferredPrompt` in event handler, derive `canInstall`.

Run → PASS → Commit.

---

### Task 7: canInstall = all 8 DT combinations

**RED:** Add DT test with `it.each` for all combinations of `{deferred, installed, standalone} → expected`.

**GREEN:** Implement full `canInstall` logic: `!!deferredPrompt && !isInstalled && !isStandalone`.

Run → PASS → Commit.

---

### Task 8: promptInstall accepted → isInstalled

**RED:**
```ts
it('sets isInstalled=true when user accepts install prompt', async () => { ... });
```

**GREEN:** Implement `promptInstall()` calling `deferredPrompt.prompt()`, handling `userChoice.accepted`.

Run → PASS → Commit.

---

### Task 9: promptInstall dismissed → no change

**RED:**
```ts
it('does not set isInstalled when user dismisses', async () => { ... });
```

**GREEN:** Handle `userChoice.dismissed` — no state change.

Run → PASS → Commit.

---

### Task 10: cleanup removes event listeners

**RED:**
```ts
it('removes event listeners on unmount', () => {
  const removeSpy = vi.spyOn(window, 'removeEventListener');
  const { unmount } = renderHook(() => usePwaInstall());
  unmount();
  expect(removeSpy).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function));
});
```

**GREEN:** Already works from the `useEffect` cleanup in Task 5.

Run → PASS → Commit.

---

## Phase 3: PwaInstallBanner — Vertical Slices

### Task 11 (Tracer bullet 🎯): Banner renders install prompt

**RED:**
```ts
import { render, screen } from '@testing-library/react';
import { PwaInstallBanner } from '@/components/pwa-install-banner';

vi.mock('@/lib/hooks/use-pwa-install', () => ({
  usePwaInstall: () => ({ canInstall: true, promptInstall: vi.fn() }),
}));

it('renders Install GoTakeCRM when canInstall is true', () => {
  render(<PwaInstallBanner />);
  expect(screen.getByText('Install GoTakeCRM')).toBeInTheDocument();
});
```

**GREEN:** Create banner component rendering the text + install button.

Run → PASS → Commit.

---

### Task 12: Banner hidden when canInstall = false

**RED:**
```ts
vi.mock('@/lib/hooks/use-pwa-install', () => ({
  usePwaInstall: () => ({ canInstall: false, promptInstall: vi.fn() }),
}));

it('does not render when canInstall is false', () => {
  render(<PwaInstallBanner />);
  expect(screen.queryByText('Install GoTakeCRM')).not.toBeInTheDocument();
});
```

**GREEN:** Add `if (!canInstall) return null;` guard.

Run → PASS → Commit.

---

### Task 13: Dismiss hides the banner

**RED:**
```ts
it('hides banner when dismiss button is clicked', async () => {
  const user = userEvent.setup();
  render(<PwaInstallBanner />);
  await user.click(screen.getByRole('button', { name: /close/i }));
  expect(screen.queryByText('Install GoTakeCRM')).not.toBeInTheDocument();
});
```

**GREEN:** Add `useState` for `dismissed`.

Run → PASS → Commit.

---

## Verification

```bash
npm run build  # no errors
npx vitest run  # no regressions
curl -s http://localhost:3000/manifest.json | jq .name  # "GoTakeCRM"
```

| Task | Type | Tests | Est. time |
|------|------|-------|-----------|
| 1-4 | Infra | — | 10 min |
| 5 | 🎯 Tracer hook | 1 | 5 min |
| 6-10 | Incremental hook | 5 | 15 min |
| 11 | 🎯 Tracer banner | 1 | 5 min |
| 12-13 | Incremental banner | 2 | 5 min |
| **Total** | | **9 tests** | **~40 min** |
