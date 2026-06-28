# Plan 008 — Multi-Tenant UI & Navigation

> **For Hermes:** Use TDD (Matt Pollock) for vertical slicing + tdd-techniques for test design.
> Each task = 1 RED test → 1 GREEN implementation → 1 commit.
> Load the tdd and tdd-techniques skills before executing.
> Use subagent-driven-development for parallel-safe phases.

**Goal:** Transform the UI from single-org to multi-tenant with "All Work" / "My Work" / org navigation, role-based access, and separated settings.

**Architecture:** React Context for active org state, sidebar restructured with org switcher, settings page with tabs (Personal + Org), role-gating in navigation and API.

**Prerequisites:** Data layer already multi-tenant (User, Organization, UserOrganization, organizationId on all models). Auth already supports credentials + Google.

**GLOSSARY:** See `docs/glossary-multi-tenant-ui.md`
**ADR:** See `docs/adr/0005-multi-tenant-ui-architecture.md`

---

## Phase 1: Infrastructure

### Task 1: Install dependencies (no tests)

```bash
npm install zustand  # lightweight state management for active org
```

**Rationale:** React Context could work, but zustand avoids prop drilling and persists to localStorage easily.

**Commit:**
```bash
git add package.json package-lock.json
git commit -m "chore: install zustand for active org state"
```

### Task 2: Create active org store

**Create:** `src/lib/stores/active-org.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface OrgOption {
  id: string;
  name: string;
  slug: string;
  role?: string;
}

interface ActiveOrgState {
  activeOrg: OrgOption | null;  // null = "All Work"
  setActiveOrg: (org: OrgOption | null) => void;
}

export const useActiveOrgStore = create<ActiveOrgState>()(
  persist(
    (set) => ({
      activeOrg: null,  // null = "All Work" by default
      setActiveOrg: (org) => set({ activeOrg: org }),
    }),
    { name: 'gotakecrm-active-org' }
  )
);
```

**Commit:**
```bash
git add src/lib/stores/active-org.ts
git commit -m "feat: create active org store with zustand"
```

### Task 3: Update /api/auth/me to return role per org

The current response returns organizations without role. Need to include it for role gating.

**Update:** `src/app/api/auth/me/route.ts`

Change the select to include role from UserOrganization:

```typescript
organizations: {
  include: {
    organization: {
      select: { id: true, name: true, slug: true, plan: true },
    },
  },
},
```

→ becomes:

```typescript
organizations: {
  include: {
    organization: {
      select: { id: true, name: true, slug: true, plan: true },
    },
    // role is already on UserOrganization — just select it
  },
},
```

And the response:

```typescript
organizations: user.organizations.map((uo) => ({
  ...uo.organization,
  role: uo.role,
})),
```

**Commit:**
```bash
git add src/app/api/auth/me/route.ts
git commit -m "feat: include user role in /api/auth/me response"
```

### Task 4 (🎯 Tracer bullet): Sidebar fetches orgs from API

**RED — 1 test:** (PC)

`src/__tests__/components/dashboard-sidebar.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import { DashboardSidebar } from '@/components/dashboard-sidebar';

// Mock next/navigation
vi.mock('next/navigation', () => ({ usePathname: vi.fn(() => '/dashboard') }));

// Mock fetch for /api/auth/me
const mockFetch = vi.fn();
global.fetch = mockFetch;

it('renders My Work and orgs from API response', async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      user: { id: 'u1', name: 'João', email: 'joao@email.com', avatar: null },
      organizations: [
        { id: 'org_1', name: 'Studio X', slug: 'studio-x', plan: 'pro', role: 'autonomo' },
        { id: 'org_2', name: 'Studio Y', slug: 'studio-y', plan: 'solo', role: 'admin' },
      ],
    }),
  });

  render(<DashboardSidebar />);

  expect(await screen.findByText('All Work')).toBeInTheDocument();
  expect(await screen.findByText('My Work')).toBeInTheDocument();
  expect(await screen.findByText('Studio X')).toBeInTheDocument();
  expect(await screen.findByText('Studio Y')).toBeInTheDocument();
});
```

Run → FAIL (component doesn't fetch orgs yet).

**GREEN — minimal implementation:**

Update `DashboardSidebar` to fetch `/api/auth/me` on mount and render org list.

```tsx
// Add to DashboardSidebar
const [orgs, setOrgs] = useState<OrgOption[]>([]);
const [user, setUser] = useState<{ name: string; email: string } | null>(null);

useEffect(() => {
  fetch('/api/auth/me')
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (data) {
        setUser(data.user);
        setOrgs(data.organizations.map((o: any) => ({
          id: o.id,
          name: o.name,
          slug: o.slug,
          role: o.role,
        })));
      }
    });
}, []);
```

Render:
```
My Work (always)
Studio X (role: autonomo)
Studio Y (role: admin)
All Work (aggregated)
```

Run → PASS.

**Commit:**
```bash
git add src/components/dashboard-sidebar.tsx
git commit -m "feat: sidebar fetches orgs and shows My Work + org list"
```

---

## Phase 2: Org Switcher & Nav Restructure

### Task 5: Org switcher dropdown in sidebar header

**RED — 1 test:** (PC)

```tsx
it('org switcher shows active org name and toggles dropdown', async () => {
  render(<DashboardSidebar />);
  
  // Default state: "All Work" is active
  expect(screen.getByText('All Work')).toBeInTheDocument();
  
  // Click to open dropdown
  const trigger = screen.getByRole('button', { name: /switch context/i });
  await userEvent.click(trigger);
  
  // Dropdown shows options
  expect(screen.getByText('My Work')).toBeInTheDocument();
  expect(screen.getByText('Studio X')).toBeInTheDocument();
});
```

**GREEN:** Add dropdown at the top of sidebar replacing the brand section. Uses `useActiveOrgStore`.

**Commit:**
```bash
git add src/components/dashboard-sidebar.tsx
git commit -m "feat: add org switcher dropdown to sidebar header"
```

### Task 6: Switching org updates nav items

**RED — 1 test:** (PC)

```tsx
it('switching to an org filters nav items to org-specific routes', async () => {
  render(<DashboardSidebar />);
  
  // Switch to Studio X
  const trigger = screen.getByRole('button', { name: /switch context/i });
  await userEvent.click(trigger);
  await userEvent.click(screen.getByText('Studio X'));
  
  // Nav should show Studio X branding
  expect(screen.getByText('Studio X')).toBeInTheDocument();
  expect(screen.queryByText('My Work')).not.toBeInTheDocument();
});
```

**GREEN:** Update `useActiveOrgStore.setActiveOrg(org)` on selection. Nav items filter based on active org.

**Commit:** Same pattern.

### Task 7: Role badge next to org name in sidebar

**RED — 1 test:** (PC)

```tsx
it('shows role badge for org memberships', async () => {
  render(<DashboardSidebar />);
  
  expect(screen.getByText('autonomo')).toBeInTheDocument();
  expect(screen.getByText('admin')).toBeInTheDocument();
});
```

**GREEN:** Small badge next to each org in the list showing role.

**Commit:** Same pattern.

### Task 8: User section shows real user data

**RED — 1 test:** (PC)

```tsx
it('shows real user name and email in sidebar footer', async () => {
  render(<DashboardSidebar />);
  
  expect(await screen.findByText('João')).toBeInTheDocument();
  expect(await screen.findByText('joao@email.com')).toBeInTheDocument();
});
```

**GREEN:** Replace hardcoded "Studio Pro" with real user data from fetch.

**Commit:** Same pattern.

---

## Phase 3: Role-Based Gating

### Task 9: Autônomo role hides org settings

**RED — 1 test:** (PC)

```tsx
it('autonomo role cannot see org settings nav item', async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      organizations: [{ id: 'org_1', name: 'Studio X', slug: 'studio-x', role: 'autonomo' }],
    }),
  });
  
  render(<DashboardSidebar />);
  
  // Switch to Studio X
  // Settings should NOT be in the nav
  expect(screen.queryByText('Settings')).not.toBeInTheDocument();
});
```

**GREEN:** Filter nav items based on role. `Settings` hidden for `autonomo` and `crm`.

**Commit:** Same pattern.

### Task 10: CRM role hides financials

**RED — 1 test:** (PC)

```tsx
it('crm role cannot see financials nav item', async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      organizations: [{ id: 'org_1', name: 'Studio X', slug: 'studio-x', role: 'crm' }],
    }),
  });
  
  render(<DashboardSidebar />);
  
  expect(screen.queryByText('Financials')).not.toBeInTheDocument();
});
```

**GREEN:** Remove `Financials` from nav when `role === 'crm'`.

**Commit:** Same pattern.

---

## Phase 4: Settings Page with Tabs

### Task 11: Restructure Settings to tabbed layout

**RED — 1 test:** (PC)

```tsx
it('settings page shows Personal tab and org-specific tabs', async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      user: { id: 'u1', name: 'João', email: 'joao@email.com' },
      organizations: [{ id: 'org_1', name: 'Studio X', slug: 'studio-x', role: 'admin' }],
    }),
  });
  
  render(<SettingsPage />);
  
  expect(await screen.findByText('Personal')).toBeInTheDocument();
  expect(await screen.findByText('Studio X')).toBeInTheDocument();
});
```

**GREEN:** Convert Settings to use Tabs component. "Personal" tab always visible. One tab per org (for users with admin role).

**Content per tab:**
- **Personal:** Profile, Appearance, Notifications, Security (from current page)
- **Org tab:** WhatsApp Bot, Stripe Payments, Members (role-gated)

**Commit:**
```bash
git add src/app/\(dashboard\)/settings/page.tsx
git commit -m "feat: restructure settings to tabbed layout"
```

### Task 12: Org settings only visible for admin role

**RED — 1 test:** (PC)

```tsx
it('hides org tab for autonomo role in settings', async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      organizations: [{ id: 'org_1', name: 'Studio X', slug: 'studio-x', role: 'autonomo' }],
    }),
  });
  
  render(<SettingsPage />);
  
  expect(screen.queryByText('Studio X')).not.toBeInTheDocument();
  expect(screen.getByText('Personal')).toBeInTheDocument();
});
```

**GREEN:** Only show org tab if user's role in that org is `admin`.

**Commit:** Same pattern.

---

## Phase 5: All Work Consolidated Views

### Task 13: All Work dashboard shows aggregated data

**RED — 1 test:** (PC — integration)

```tsx
it('/api/dashboard returns aggregated data for all contexts when no org specified', async () => {
  // Mock session with user
  // Mock db queries to return data from multiple orgs + my work
  
  const response = await GET(request);  // no org filter
  const data = await response.json();
  
  expect(response.status).toBe(200);
  expect(data).toHaveProperty('totalClients');
  expect(data).toHaveProperty('totalRevenue');
  expect(data).toHaveProperty('orgs');  // breakdown per org
});
```

**GREEN:** Update dashboard API route. When no orgId in query, aggregate across all orgs the user belongs to.

**Commit:** Same pattern.

### Task 14: All Work financials shows consolidated data

**RED — 1 test:** (PC)

Same approach as Task 13 — aggregate financials across all contexts.

**GREEN:** Update financials API route with same pattern.

**Commit:** Same pattern.

---

## Phase 6: Members Management

### Task 15 (🎯 Phase 6): GET members for an org

**RED — 1 test:** (PC)

`src/__tests__/integration/api-org-members.test.ts`

```tsx
it('returns members list for an org', async () => {
  mockGetServerSession.mockResolvedValue(makeSession('user_1'));
  mockUserOrgFindFirst.mockResolvedValue(membership);  // admin in org
  mockUserOrgFindMany.mockResolvedValue(members);
  
  const response = await GET(request, { params: Promise.resolve({ id: 'org_1' }) });
  const data = await response.json();
  
  expect(response.status).toBe(200);
  expect(data).toHaveLength(2);
  expect(data[0]).toHaveProperty('user');
  expect(data[0]).toHaveProperty('role');
});
```

**GREEN:**

Create: `src/app/api/admin/organizations/[id]/members/route.ts`

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check
  // Membership check (admin only)
  // Return UserOrganization with User data
}
```

**Commit:** Same pattern.

### Task 16: POST invite member

**RED — 1 test:** (PC)

```tsx
it('invites a new member to the org', async () => {
  const response = await POST(request, params);
  expect(response.status).toBe(201);
  expect(mockUserOrgCreate).toHaveBeenCalled();
});
```

**GREEN:** Create invite endpoint. Validates email, finds or creates User, creates UserOrganization.

**Commit:** Same pattern.

### Task 17: PATCH member role

**RED — 1 test:** (PC)

```tsx
it('updates member role', async () => {
  const response = await PATCH(request, params);
  expect(response.status).toBe(200);
  expect(mockUserOrgUpdate).toHaveBeenCalledWith({
    where: { id: 'mem_1' },
    data: { role: 'admin' },
  });
});
```

**GREEN:** Add PATCH endpoint.

**Commit:** Same pattern.

### Task 18: DELETE member

**RED — 1 test:** (PC)

```tsx
it('removes member from org', async () => {
  const response = await DELETE(request, params);
  expect(response.status).toBe(200);
  expect(mockUserOrgDelete).toHaveBeenCalled();
});
```

**GREEN:** Add DELETE endpoint. Cannot remove self if user is last admin.

**Commit:** Same pattern.

### Task 19: Members page UI

**RED — 1 test:** (PC — component)

```tsx
it('renders member list with invite button', async () => {
  render(<OrgMembersPage orgId="org_1" />);
  expect(await screen.findByText('joao@email.com')).toBeInTheDocument();
  expect(screen.getByText('Invite Member')).toBeInTheDocument();
});
```

**GREEN:** Simple page listing members with role badges. Invite form in a dialog.

**Commit:** Same pattern.

---

## Phase 7: Onboarding Flow

### Task 20 (🎯 Phase 7): Redirect to onboarding when user has 0 orgs

**RED — 1 test:** (PC)

```tsx
it('redirects to /onboarding when user has no organizations', async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      user: { id: 'u1', name: 'João', email: 'joao@email.com' },
      organizations: [],
    }),
  });
  
  render(<DashboardSidebar />);
  
  // Should redirect
  expect(mockRouterPush).toHaveBeenCalledWith('/onboarding');
});
```

**GREEN:** In sidebar's fetch effect, if `organizations.length === 0`, redirect to `/onboarding`. Create basic onboarding page.

**Commit:** Same pattern.

### Task 21: Onboarding page — create my work

**RED — 1 test:** (PC)

```tsx
it('creates My Work on onboarding', async () => {
  mockFetch.mockResolvedValueOnce({ ok: true });
  
  await userEvent.click(screen.getByText('Start Working'));
  
  expect(fetch).toHaveBeenCalledWith('/api/auth/onboard', {
    method: 'POST',
    body: JSON.stringify({ name: 'João' }),
  });
});
```

**GREEN:** Simple onboarding page. "Create my workspace" button calls new `/api/auth/onboard` endpoint that creates a personal organization.

**Commit:** Same pattern.

---

## Summary: Files Changed/ Created

| Action | File |
|--------|------|
| **CREATE** | `src/lib/stores/active-org.ts` |
| **UPDATE** | `src/components/dashboard-sidebar.tsx` |
| **UPDATE** | `src/app/api/auth/me/route.ts` |
| **UPDATE** | `src/app/(dashboard)/settings/page.tsx` |
| **UPDATE** | `src/app/api/dashboard/route.ts` |
| **UPDATE** | `src/app/api/revenues/route.ts` |
| **CREATE** | `src/app/api/admin/organizations/[id]/members/route.ts` |
| **CREATE** | `src/app/(dashboard)/members/page.tsx` |
| **CREATE** | `src/app/(dashboard)/onboarding/page.tsx` |
| **CREATE** | `src/app/api/auth/onboard/route.ts` |
| **CREATE** | `src/middleware.ts` (protected routes) |
| **CREATE** | Multiple test files |

## Execution Order

```
Phase 1 (Tasks 1-4):   Infrastructure + tracer bullet → sidebar fetches orgs
Phase 2 (Tasks 5-8):   Org switcher + nav restructure
Phase 3 (Tasks 9-10):  Role-based gating
Phase 4 (Tasks 11-12): Settings tabs
Phase 5 (Tasks 13-14): All Work views
Phase 6 (Tasks 15-19): Members management
Phase 7 (Tasks 20-21): Onboarding flow
```
