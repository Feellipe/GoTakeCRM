import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface OrgOption {
  id: string;
  name: string;
  slug: string;
  role?: string;
}

interface ActiveOrgState {
  activeOrg: OrgOption | null; // null = "All Work"
  setActiveOrg: (org: OrgOption | null) => void;
}

export const useActiveOrgStore = create<ActiveOrgState>()(
  persist(
    (set) => ({
      activeOrg: null,
      setActiveOrg: (org) => set({ activeOrg: org }),
    }),
    { name: 'gotakecrm-active-org' }
  )
);
