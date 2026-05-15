# BUG: Event handlers cannot be passed to Client Component props

**Date:** 2026-05-15
**Severity:** Critical (blocks app startup)
**Next.js Version:** 16.1.3 (Turbopack)

## Symptom

```
Error: Event handlers cannot be passed to Client Component props.
  <... variant="outline" onClick={function onClick} children=...>
                                 ^^^^^^^^^^^^^^^^^^
If you need interactivity, consider converting part of this to a Client Component.
```

App crashes on startup under `npm run dev` (Turbopack). Two error instances with different digests were emitted.

## Root Cause

Next.js 16 with Turbopack enforces strict React Server Component (RSC) boundaries. **Any component that receives event handlers (`onClick`, `onChange`, `onSubmit`, etc.) MUST be marked with `'use client'`** — this includes both the leaf interactive components AND any parent component that passes event handlers as props.

Two categories of violations were found:

### 1. Missing `'use client'` on UI components (10 files)

These shadcn/ui wrapper components lacked the `'use client'` directive. Even though they were typically imported from Client Components, Turbopack's static analysis treats them as potentially renderable from Server Components:

- `src/components/ui/button.tsx` — receives `onClick`
- `src/components/ui/input.tsx` — receives `onChange`, `onSubmit`
- `src/components/ui/textarea.tsx` — receives `onChange`
- `src/components/ui/badge.tsx` — interactive variant receives `onClick`
- `src/components/ui/card.tsx` — receives `onClick` when used as interactive card
- `src/components/ui/alert.tsx` — uses Radix primitives with event handlers
- `src/components/ui/breadcrumb.tsx` — uses `onClick` handlers
- `src/components/ui/pagination.tsx` — uses `onClick` for page navigation
- `src/components/ui/skeleton.tsx` — no event handlers, but rendered by Server Components
- `src/components/ui/navigation-menu.tsx` — uses Radix primitives with interactivity

### 2. Server Component rendering interactive components (1 file)

`src/app/not-found.tsx` is a Next.js convention file rendered as a **Server Component by default** (no `'use client'` directive), but it contained:

```tsx
// Line 24 — onClick inside a Server Component context
<Button variant="outline" onClick={() => window.history.back()}>
  Go Back
</Button>

// Lines 18-22 — Link wrapping a Button in a Server Component
<Link href="/dashboard">
  <Button className="gradient-gold ...">
    <Home /> Dashboard
  </Button>
</Link>
```

The `<Link>` wrapping a `<Button>` also violates RSC rules because `Link` in Next.js passes internal event handlers to its child for client-side navigation.

## Fix Applied

### Fix 1: Add `'use client'` to 10 UI components

Added `"use client"` directive as the first line of:
- `src/components/ui/alert.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/breadcrumb.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/navigation-menu.tsx`
- `src/components/ui/pagination.tsx`
- `src/components/ui/skeleton.tsx`
- `src/components/ui/textarea.tsx`

### Fix 2: Add `'use client'` to `src/app/not-found.tsx`

Converted the 404 page from Server Component to Client Component since it uses `onClick` and `<Link>` with interactive children.

## Verification

After fixes, no Server Components in `src/app/` remain that import interactive UI components with event handlers:

| File | Type | Status |
|------|------|--------|
| `src/app/layout.tsx` | Server | OK — renders ThemeProvider (Client), children |
| `src/app/page.tsx` | Server | OK — `redirect()` only, no UI |
| `src/app/loading.tsx` | Server | OK — renders Skeleton with className only |
| `src/app/not-found.tsx` | **Client** | FIXED — now has `'use client'` |
| `src/app/error.tsx` | Client | OK — already had `'use client'` |
| `src/app/icon.tsx` | Server | OK — `next/og` ImageResponse, no UI |
| `src/app/(dashboard)/loading.tsx` | Server | OK — renders Skeleton with className only |

## Prevention

When creating Next.js convention files (`error.tsx`, `not-found.tsx`, `loading.tsx`), rule of thumb:
- **`loading.tsx`**: Can be a Server Component if it only uses non-interactive primitives like `Skeleton`
- **`error.tsx`**: **MUST** be a Client Component — always receives `reset()` callback which is an event handler
- **`not-found.tsx`**: **MUST** be a Client Component if it contains any `<Link>`, `<Button>`, or interactivity

## Related Warnings

The following are separate issues, not related to this bug:

1. **Next.js 16 middleware deprecation**: `"middleware" file convention is deprecated. Please use "proxy" instead` — Next.js 16 renamed `middleware.ts` to `proxy.ts`. The current `src/middleware.ts` still works, but will need migration.
2. **NextAuth env warnings**: `[next-auth][error][NO_SECRET]` — missing `NEXTAUTH_SECRET`, `NEXTAUTH_GOOGLE_ID`, `NEXTAUTH_GOOGLE_SECRET` in `.env`. Configure these for auth to work.
