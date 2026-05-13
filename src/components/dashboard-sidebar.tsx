'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  DollarSign,
  Calendar,
  FileText,
  Menu,
  X,
  Settings,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SettingsPanel } from '@/components/settings-panel';

// Navigation items with route paths
const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { id: 'clients', label: 'Clients', icon: Users, href: '/clients' },
  { id: 'pipeline', label: 'Pipeline', icon: FolderKanban, href: '/pipeline' },
  { id: 'proposals', label: 'Proposals', icon: FileText, href: '/proposals' },
  { id: 'financials', label: 'Financials', icon: DollarSign, href: '/financials' },
  { id: 'calendar', label: 'Calendar', icon: Calendar, href: '/calendar' },
];

export function DashboardSidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();

  // Determine active nav item based on current path
  const getActiveView = () => {
    if (pathname === '/dashboard' || pathname === '/') return 'dashboard';
    const match = navItems.find(item => pathname.startsWith(item.href));
    return match ? match.id : 'dashboard';
  };
  const activeView = getActiveView();

  return (
    <aside
      className={`glass-sidebar fixed left-0 top-0 h-full z-50 transition-all duration-500 ease-in-out ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="p-6 flex items-center justify-between border-b border-white/10">
          {sidebarOpen && (
            <div className="flex items-center gap-3 animate-fade-in-up">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center shadow-lg shadow-gold/30 relative overflow-hidden">
                <span className="text-white font-bold text-lg relative z-10">W</span>
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
              <div>
                <span className="text-white font-semibold text-lg block">WhatsApp</span>
                <span className="text-white/50 text-xs">CRM Dashboard</span>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item, index) => (
            <Link
              key={item.id}
              href={item.href}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                activeView === item.id
                  ? 'bg-gold text-warm-950 font-medium shadow-lg shadow-gold/20'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && (
                <span className="animate-fade-in-up whitespace-nowrap">{item.label}</span>
              )}
              {activeView === item.id && (
                <div className="ml-auto w-2 h-2 rounded-full bg-white animate-pulse" />
              )}
            </Link>
          ))}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-gold/30 ring-2 ring-gold/10">
              <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=studio" />
              <AvatarFallback className="bg-gold text-warm-950">ST</AvatarFallback>
            </Avatar>
            {sidebarOpen && (
              <div className="animate-fade-in-up flex-1">
                <p className="text-white font-medium text-sm">Studio Pro</p>
                <p className="text-white/50 text-xs">Admin</p>
              </div>
            )}
            {sidebarOpen && (
              <SettingsPanel
                trigger={
                  <button className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white">
                    <Settings className="w-5 h-5" />
                  </button>
                }
              />
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
