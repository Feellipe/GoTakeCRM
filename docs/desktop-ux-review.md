# GoTakeCRM Desktop UX Review & Fix Plan

**Date:** 2026-07-05
**Viewport:** 1440×900px
**Audited by:** Playwright measurements
**Test URL:** https://gotakecrm-git-demo-feellipes-projects.vercel.app

---

## Summary

Desktop view is in **good shape overall** — no horizontal scroll, sidebar works in mini/icon-only mode, content fills the width. The main issues are **touch-target sized elements** that also appear on desktop (mostly header/footer), and some **layout polish** opportunities.

---

## High Priority

### H1 — Pipeline: 24×24px Expand/Collapse Buttons

Pipeline has expand/collapse icon buttons at **24×24px** — extremely small even for mouse.

**Pages affected:** Pipeline

**Elements:**
- Collapse/expand toggle per deal card: 24×24px
- "Proposal" action buttons: 97×28px

**Fix:** `min-h-[44px] min-w-[44px]` or at minimum `min-h-[32px] min-w-[32px]` with larger icons.

### H2 — Financials: Revenue/Expenses Tabs at 29px

The tabs at the top of the financial table are only **29px tall**.

**Pages affected:** Financials

**Elements:**
- "Revenue" tab: 660×29px
- "Expenses" tab: 660×29px

**Fix:** Apply consistent button/tab sizing: `min-h-[44px]` or `py-3`.

### H3 — Footer Links Too Small

Desktop footer links are **20px tall** — harder to click than necessary.

**Pages affected:** All pages (Dashboard, Clients, Pipeline, Proposals, Financials, Calendar)

**Elements:**
- "Documentation" link: 108×20px
- "Support" link: 55×20px

**Fix:** Already applied from mobile fixes (`inline-flex items-center px-3 py-3 min-h-[44px]`).

---

## Medium Priority

### M1 — "View All" and "View Calendar" Links at 32px

Multiple "View All" links and "View Calendar" at **32px height**.

**Pages affected:** Dashboard, Clients

**Elements (sample):**
- "View All": 101×32px
- "View Calendar": 147×32px
- "Previous"/"Next" (Calendar): 107×32 / 81×32

**Fix:** `min-h-[44px]` or at least `min-h-[36px]`.

### M2 — Dashboard Card Grid Density

At 1440px, only **~2 of 20 cards** use a multi-column grid. Most cards span full width, leaving significant whitespace.

**Pages affected:** Dashboard

**Observation:** With 1440px of space, KPI cards, quick action cards, and charts could be laid out in 2–3 columns instead of stacking vertically.

**Fix:** Use responsive grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` for card sections.

### M3 — Clients Table Width

The clients page shows data in a single-column list even at 1440px. Only **3 of 10 sections** use multi-column.

**Pages affected:** Clients

**Fix:** At `lg:` breakpoint, switch to a data table layout or 2-column card grid.

---

## What's Working Well ✅

| Aspect | Status |
|---|---|
| ✅ **No horizontal scroll** on any page at 1440px | Clean |
| ✅ **Sidebar** mini/icon-only mode (80px) | Nav links visible and functional |
| ✅ **H1 headings** | 24px / bold 700 throughout |
| ✅ **Body font** | 16px — readable |
| ✅ **Main content** | Full width 1440px |
| ✅ **Header actions** | All visible at desktop (no overflow) |
| ✅ **Client names** | 16px / 600 — good hierarchy |
| ✅ **Pipeline stage headers** | Clear H3 labels |

---

## Comparison: Desktop vs Mobile

| Metric | Mobile (375px) | Desktop (1440px) | Improvement |
|---|---|---|---|
| Horizontal scroll | ❌ On ALL pages | ✅ None | **Fixed by responsive layout** |
| Small targets <44px | 59–81% per page | 50–79% per page | Slightly better but same elements |
| Sidebar | Overlay (fixed) | Mini/icon-only (80px) | ✅ Works well |
| Header overflow | ❌ Severe | ✅ All visible | **Fixed** |
| Card layout | Single column | Mostly single column | Could improve |

---

## Verification Steps

After applying fixes:
1. Run `node scripts/desktop-ux-review.js` at 1440×900
2. Verify Pipeline 24px buttons are increased
3. Verify Financials tabs have proper height
4. Check dashboard card grid at 1440px
