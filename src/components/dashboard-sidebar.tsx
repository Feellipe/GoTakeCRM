'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  ChevronDown,
  Check,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useActiveOrgStore, OrgOption } from '@/lib/stores/active-org';

// Navigation items with route paths
const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { id: 'clients', label: 'Clients', icon: Users, href: '/clients' },
  { id: 'pipeline', label: 'Pipeline', icon: FolderKanban, href: '/pipeline' },
  { id: 'proposals', label: 'Proposals', icon: FileText, href: '/proposals' },
  { id: 'financials', label: 'Financials', icon: DollarSign, href: '/financials' },
  { id: 'calendar', label: 'Calendar', icon: Calendar, href: '/calendar' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/settings' },
];

interface UserData {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

interface OrgDropdownContentProps {
  orgs: OrgOption[];
  activeOrg: OrgOption | null;
  setActiveOrg: (org: OrgOption | null) => void;
  onClose: () => void;
}

function OrgDropdownContent({ orgs, activeOrg, setActiveOrg, onClose }: OrgDropdownContentProps) {
  return (
    <>
      {/* All Work */}
      <button
        onClick={() => { setActiveOrg(null); onClose(); }}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/10 ${
          !activeOrg ? 'bg-white/10' : ''
        }`}
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">A</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium">All Work</p>
          <p className="text-white/70 text-xs">All contexts</p>
        </div>
        {!activeOrg && <Check className="w-4 h-4 text-gold" />}
      </button>

      {/* My Work */}
      <button
        onClick={() => { setActiveOrg({ id: '__my_work__', name: 'My Work', slug: 'my-work' }); onClose(); }}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/10 ${
          activeOrg?.id === '__my_work__' ? 'bg-white/10' : ''
        }`}
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold to-gold-light flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">M</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium">My Work</p>
          <p className="text-white/70 text-xs">Personal workspace</p>
        </div>
        {activeOrg?.id === '__my_work__' && <Check className="w-4 h-4 text-gold" />}
      </button>

      {/* Divider */}
      <div className="h-px bg-white/10" />

      {/* Orgs from API */}
      {orgs.map((org) => (
        <button
          key={org.id}
          onClick={() => { setActiveOrg(org); onClose(); }}
          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/10 ${
            activeOrg?.id === org.id ? 'bg-white/10' : ''
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">{org.name.charAt(0)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{org.name}</p>
            <p className="text-white/70 text-xs capitalize">{org.role}</p>
          </div>
          {activeOrg?.id === org.id && <Check className="w-4 h-4 text-gold" />}
        </button>
      ))}
    </>
  );
}

export function DashboardSidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [user, setUser] = useState<UserData | null>(null);
  const { activeOrg, setActiveOrg } = useActiveOrgStore();
  const pathname = usePathname();
  const router = useRouter();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
    setOrgDropdownOpen(false);
  }, [pathname]);

  // Fetch user data + orgs on mount
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setUser(data.user);
          setOrgs(
            data.organizations.map((o: OrgOption & { plan?: string }) => ({
              id: o.id,
              name: o.name,
              slug: o.slug,
              role: o.role,
            }))
          );

          // No orgs yet — redirect to onboarding
          if (data.organizations && data.organizations.length === 0) {
            router.push('/onboarding');
          }
        }
      });
  }, []);

  // Determine active nav item
  const getActiveView = () => {
    if (pathname === '/dashboard' || pathname === '/') return 'dashboard';
    const match = navItems.find((item) => pathname.startsWith(item.href));
    return match ? match.id : 'dashboard';
  };
  const activeView = getActiveView();

  const displayName = activeOrg ? activeOrg.name : 'All Work';
  const displaySubtitle = activeOrg ? (activeOrg.role ?? 'member') : 'All contexts';

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  return (
    <>
      {/* Hamburger button — visible on mobile, hidden when sidebar is open */}
      <button
        onClick={() => setSidebarOpen(true)}
        className={`fixed top-4 left-4 z-[60] p-3 rounded-xl bg-gold text-warm-950 shadow-lg shadow-gold/30 lg:hidden hover:opacity-90 transition-all duration-200 min-h-[44px] min-w-[44px] ${
          sidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        aria-label="Open sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Backdrop overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full z-50 transition-all duration-300 ease-in-out ${
          sidebarOpen
            ? 'translate-x-0 w-[66vw] max-w-sm'
            : '-translate-x-full w-[66vw] max-w-sm lg:translate-x-0 lg:w-20'
        }`}
      >
        <div className="flex flex-col h-full bg-sidebar-glass overflow-hidden">
          {/* Org Switcher Header */}
          <div className="p-6 border-b border-white/10 min-h-[4.5rem]">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <button
                  onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
                  className="w-full flex items-center gap-3 text-left"
                  aria-label="Switch context"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center shadow-lg shadow-gold/30 flex-shrink-0">
                    <span className="text-white font-bold text-lg">
                      {displayName.charAt(0)}
                    </span>
                  </div>
                  {(sidebarOpen || orgDropdownOpen) && (
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-[clamp(0.875rem,2.5vw,1.125rem)] truncate">
                        {displayName}
                      </p>
                      <p className="text-white/70 text-[clamp(0.625rem,1.8vw,0.75rem)] capitalize">
                        {displaySubtitle}
                      </p>
                    </div>
                  )}
                  {sidebarOpen && (
                    <ChevronDown
                      className={`w-4 h-4 text-white/50 transition-transform duration-200 ${
                        orgDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  )}
                </button>

                {/* Dropdown menu */}
                {orgDropdownOpen && sidebarOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setOrgDropdownOpen(false)}
                    />
                    <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-gray-900 border border-white/10 rounded-xl shadow-xl overflow-hidden">
                      <OrgDropdownContent
                        orgs={orgs}
                        activeOrg={activeOrg}
                        setActiveOrg={setActiveOrg}
                        onClose={() => setOrgDropdownOpen(false)}
                      />
                    </div>
                  </>
                )}
              </div>
              {/* Close button — only on mobile when sidebar is open */}
              {sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2.5 rounded-lg hover:bg-white/10 transition-colors text-white/80 hover:text-white shrink-0 min-h-[44px] min-w-[44px]"
                  aria-label="Close sidebar"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navItems
              .filter(item => {
                // CRM role cannot see Financials
                if (activeOrg?.role === 'crm' && item.id === 'financials') return false;
                return true;
              })
              .map((item, index) => (
              <Link
                key={item.id}
                href={item.href}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                  activeView === item.id
                    ? 'bg-gold text-warm-950 font-medium shadow-lg shadow-gold/20'
                    : 'text-white/90 hover:bg-white/10 hover:text-white'
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && (
                  <span className="whitespace-nowrap text-[clamp(0.8rem,2.2vw,0.95rem)]">
                    {item.label}
                  </span>
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
              <Avatar className="w-10 h-10 border-2 border-gold/30 ring-2 ring-gold/10 shrink-0">
                <AvatarImage
                  src={
                    user?.avatar ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || 'default'}`
                  }
                />
                <AvatarFallback className="bg-gold text-warm-950">{initials}</AvatarFallback>
              </Avatar>
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-[clamp(0.8rem,2.2vw,0.95rem)] truncate">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-white/70 text-[clamp(0.625rem,1.8vw,0.75rem)] truncate">
                    {user?.email || ''}
                  </p>
                </div>
              )}
              {sidebarOpen && (
                <Link
                  href="/settings"
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/80 hover:text-white inline-flex items-center justify-center shrink-0"
                  aria-label="Settings"
                >
                  <Settings className="w-5 h-5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
