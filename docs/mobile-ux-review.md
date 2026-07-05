# GoTakeCRM Mobile UX Review & Fix Plan

**Date:** 2026-07-05
**Viewport:** 375×812px (iPhone)
**Audited by:** `ux-evaluator` profile (mimo-v2.5 via OpenCode Go) + Playwright measurements
**Test URL:** https://gotakecrm-git-demo-feellipes-projects.vercel.app
**Demo login:** demo@gotakecrm.com / demo2026

---

## Critical Issues

### C1 — Horizontal Scroll on ALL Pages

Every page has content wider than 375px viewport.

| Page | Off-screen elements |
|---|---|
| Dashboard | Cards at x=609–636, "New Booking" at x=614, header buttons at x=361+ |
| Clients | "New Client" at x=560, action buttons at x=367 |
| Pipeline | "Proposal" buttons at x=556, "New Deal" at x=576 |
| Proposals | "New Booking" at x=600 |
| Financials | "New Booking" at x=603, "Expenses" tab at x=392 |
| Calendar | "Next" at x=631, "New Booking" at x=588 |

**Fix:**
- Make header action bar responsive: wrap buttons or collapse secondary actions into "+" overflow menu on mobile (`lg:hidden` / `hidden lg:flex`)
- Use responsive grid for dashboard cards: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Ensure all page layouts stack vertically instead of overflowing horizontally
- Add `overflow-x-hidden` on mobile wrapper

### C2 — All Touch Targets Below 44px Minimum

| Page | Elements <44px | Total | % |
|---|---|---|---|
| Login | 5 | 5 | 100% |
| Dashboard | 16 | 27 | 59% |
| Clients | 29 | 37 | 78% |
| Pipeline | 35 | 43 | 81% |
| Proposals | 12 | 20 | 60% |
| Financials | 14 | 22 | 64% |
| Calendar | 11 | 19 | 58% |

**Specific failing elements:**
- All header buttons (Search 42×36, Theme 36×36, Notif 36×36, Export 92×32)
- All "New [Entity]" buttons (148×36, etc.)
- "View", "WhatsApp", "View All" action buttons (32px height)
- Pipeline "Proposal" buttons (97×28)
- Pipeline expand/collapse icons (24×24)
- Footer links (20px height)
- Login "Create one" link (66×14)
- Login inputs and buttons (36px height)
- Hamburger menu button (40×40 — just under)

**Fix:** Apply globally:
```css
/* Add to globals.css */
button, a, input, select, textarea, [role="button"] {
  min-height: 44px;
}
```
Or per-component with Tailwind: `min-h-[44px]`

---

## High Priority

### H1 — Header Toolbar Overflow

On all pages, the rightmost header buttons (Export, New Booking, etc.) render at x=360+ — off-screen on 375px viewport.

**Fix:** Wrap header actions or use overflow menu pattern:
```tsx
{/* Primary actions visible */}
<Button>Search</Button>
{/* Secondary actions in overflow */}
<div className="hidden md:flex gap-2">
  <Button>Export</Button>
  <Button>New Booking</Button>
</div>
```

### H2 — Header Buttons Below Minimum

Hamburger (40px), Search (36px), Theme (36px), Notif (36px), Export (32px).

**Fix:** `min-h-[44px] min-w-[44px]` on all header icon buttons.

---

## Medium Priority

### M1 — Button Font Sizes

Export, New Booking, View All, Search use 14px — below 16px mobile minimum.

**Fix:** `text-base` (16px) minimum on all interactive elements.

---

## What's Already Working ✅

- Viewport meta: `width=device-width, initial-scale=1` (zoom NOT disabled)
- Body font: 16px / 24px line-height
- Sidebar nav links: 216×44px ✅
- Quick action FAB: 56×56px ✅
- H1 headings: 24px bold
- Sidebar: fixed overlay at `z-50`, correctly off-screen at `x=-247`
- Background: warm off-white

---

## Verification Steps

After applying fixes, re-test with Playwright at 375×812px:

1. `horizontalScroll` should be `false` on all pages
2. No element with `width < 44 || height < 44` should exist among interactive elements
3. Header actions should all be visible or properly collapsed
4. `min-h-[44px]` should apply to all buttons, inputs, links
