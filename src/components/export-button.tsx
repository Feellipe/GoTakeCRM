'use client';

import * as React from 'react';
import { Download, FileSpreadsheet, FileText, FileImage } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ExportButtonProps {
  data: {
    clients?: unknown[];
    deals?: unknown[];
    bookings?: unknown[];
    kpis?: {
      totalRevenue: number;
      totalExpenses: number;
      profit: number;
      pipelineValue: number;
      activeClients: number;
      totalDeals: number;
      totalClients: number;
    };
  };
}

export function ExportButton({ data }: ExportButtonProps) {
  const exportToCSV = (filename: string, rows: Record<string, unknown>[]) => {
    if (!rows || rows.length === 0) return;
    
    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        headers.map(header => {
          const value = row[header];
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return value ?? '';
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
  };

  const exportClients = () => {
    if (!data.clients || data.clients.length === 0) return;
    
    const rows = (data.clients as Record<string, unknown>[]).map((client: Record<string, unknown>) => ({
      Name: client.name,
      Phone: client.phone,
      Email: client.email || '',
      'Event Type': client.eventType,
      Status: client.status,
      Source: client.source,
      'Total Deals': client.totalDeals,
      'Total Value': client.totalValue,
    }));
    
    exportToCSV('clients', rows);
  };

  const exportDeals = () => {
    if (!data.deals || data.deals.length === 0) return;
    
    const rows = (data.deals as Record<string, unknown>[]).map((deal: Record<string, unknown>) => ({
      Title: deal.title,
      Client: (deal.client as Record<string, unknown>)?.name || '',
      Status: deal.status,
      Value: deal.value,
      'Total Expenses': deal.totalExpenses,
      'Total Revenue': deal.totalRevenue,
      Profit: deal.profit,
    }));
    
    exportToCSV('deals', rows);
  };

  const exportReport = () => {
    const kpis = data.kpis;
    if (!kpis) return;

    const rows = [
      { Metric: 'Total Revenue', Value: kpis.totalRevenue },
      { Metric: 'Total Expenses', Value: kpis.totalExpenses },
      { Metric: 'Net Profit', Value: kpis.profit },
      { Metric: 'Pipeline Value', Value: kpis.pipelineValue },
      { Metric: 'Active Clients', Value: kpis.activeClients },
      { Metric: 'Total Clients', Value: kpis.totalClients },
      { Metric: 'Total Deals', Value: kpis.totalDeals },
    ];
    
    exportToCSV('financial-report', rows);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={exportClients} className="cursor-pointer">
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export Clients
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportDeals} className="cursor-pointer">
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export Deals
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportReport} className="cursor-pointer">
          <FileText className="mr-2 h-4 w-4" />
          Export Report
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
