'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboard } from '@/app/(dashboard)/layout';

// Dynamic import for heavy component (1195 lines)
const ProposalsView = dynamic(
  () => import('@/components/proposals-view').then(mod => ({ default: mod.ProposalsView })),
  {
    ssr: false,
    loading: () => (
      <div className="p-8 space-y-6 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    ),
  }
);

export default function ProposalsPage() {
  const { clients, deals, fetchDeals, fetchDashboardData } = useDashboard();

  return (
    <div className="flex-1">
      <ProposalsView
        clients={clients}
        initialDeal={null}
        onProposalCreated={() => {
          fetchDeals();
          fetchDashboardData();
        }}
      />
    </div>
  );
}
