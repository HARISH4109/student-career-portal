import type { RoleName } from '@career-portal/shared-types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  ChevronDown,
  Compass,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Route,
  Settings2,
  Shield,
  Target,
  User,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router';

import { useAuth } from '@/features/auth/use-auth';
import { NotificationBell } from '@/features/engagement/components/NotificationBell';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  permission?: string;
  roles?: RoleName[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  {
    label: 'My Profile',
    path: '/dashboard/profile',
    icon: <User className="h-5 w-5" />,
    roles: ['STUDENT'],
  },
  {
    label: 'Resumes',
    path: '/dashboard/resumes',
    icon: <FileText className="h-5 w-5" />,
    roles: ['STUDENT'],
  },
  {
    label: 'Opportunities',
    path: '/dashboard/opportunities',
    icon: <Briefcase className="h-5 w-5" />,
  },
  {
    label: 'Manage Opportunities',
    path: '/dashboard/opportunities/manage',
    icon: <Briefcase className="h-5 w-5" />,
    roles: ['PLACEMENT_FACULTY', 'ADMIN'],
  },
  {
    label: 'Manage Career Catalog',
    path: '/dashboard/careers/manage',
    icon: <Settings2 className="h-5 w-5" />,
    roles: ['PLACEMENT_FACULTY', 'ADMIN'],
    permission: 'career_paths.manage',
  },
  {
    label: 'Academic Programs',
    path: '/dashboard/programs',
    icon: <GraduationCap className="h-5 w-5" />,
    roles: ['ADMIN'],
  },
  {
    label: 'Applications',
    path: '/dashboard/applications',
    icon: <FileText className="h-5 w-5" />,
    roles: ['STUDENT'],
  },
  { label: 'Preparation', path: '/dashboard/preparation', icon: <BookOpen className="h-5 w-5" /> },
  {
    label: 'Career Paths',
    path: '/dashboard/careers',
    icon: <Compass className="h-5 w-5" />,
    permission: 'resources.view',
  },
  {
    label: 'My Roadmap',
    path: '/dashboard/roadmap',
    icon: <Route className="h-5 w-5" />,
    roles: ['STUDENT'],
    permission: 'roadmaps.manage_own',
  },
  {
    label: 'Learning Resources',
    path: '/dashboard/resources',
    icon: <BookOpen className="h-5 w-5" />,
    permission: 'resources.view',
  },
  {
    label: 'Skill Gaps',
    path: '/dashboard/skill-gap',
    icon: <Target className="h-5 w-5" />,
    roles: ['STUDENT'],
    permission: 'skill_gap.analyze_own',
  },
  {
    label: 'Notice Board',
    path: '/dashboard/notices',
    icon: <Bell className="h-5 w-5" />,
    permission: 'notices.view',
  },
  {
    label: 'Analytics',
    path: '/dashboard/analytics',
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    label: 'Administration',
    path: '/dashboard/admin',
    icon: <Shield className="h-5 w-5" />,
    roles: ['ADMIN'],
  },
];

const ROLE_BADGES: Record<string, { label: string; className: string }> = {
  STUDENT: { label: 'Student', className: 'bg-blue-100 text-blue-700' },
  PLACEMENT_FACULTY: { label: 'Faculty', className: 'bg-amber-100 text-amber-700' },
  ADMIN: { label: 'Admin', className: 'bg-purple-100 text-purple-700' },
};

/**
 * Authenticated dashboard shell with sidebar navigation, top bar,
 * user dropdown, and role badges. Content rendered via <Outlet />.
 */
export function DashboardShell(): React.JSX.Element {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Filter nav items by role
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (item.permission && !user?.permissions.includes(item.permission)) return false;
    if (!item.roles) return true;
    return item.roles.some((role) => user?.roles.includes(role));
  });

  const primaryRole = user?.roles[0];
  const roleBadge = primaryRole ? ROLE_BADGES[primaryRole] : null;

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="flex h-screen bg-slate-100">
      {/* ── Sidebar (desktop) ──────────────────────────────────────────── */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col bg-white border-r border-slate-200">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-6 border-b border-slate-100">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-900">Career Portal</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {visibleNavItems.map((item) => {
              const isActive =
                location.pathname === item.path ||
                (item.path !== '/dashboard' &&
                  location.pathname.startsWith(`${item.path}/`) &&
                  !visibleNavItems.some(
                    (other) =>
                      other.path !== item.path &&
                      other.path.startsWith(`${item.path}/`) &&
                      location.pathname.startsWith(other.path),
                  ));
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150
                      ${
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                  >
                    <span className={isActive ? 'text-blue-600' : 'text-slate-400'}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* ── Mobile Sidebar Overlay ─────────────────────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black lg:hidden"
              onClick={() => {
                setSidebarOpen(false);
              }}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl lg:hidden"
            >
              <div className="flex h-16 items-center justify-between px-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
                    <GraduationCap className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-lg font-bold text-slate-900">Career Portal</span>
                </div>
                <button
                  onClick={() => {
                    setSidebarOpen(false);
                  }}
                  aria-label="Close navigation"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="max-h-[calc(100dvh-4rem)] overflow-y-auto px-3 py-4">
                <ul className="space-y-1">
                  {visibleNavItems.map((item) => {
                    const isActive =
                      location.pathname === item.path ||
                      (item.path !== '/dashboard' &&
                        location.pathname.startsWith(`${item.path}/`) &&
                        !visibleNavItems.some(
                          (other) =>
                            other.path !== item.path &&
                            other.path.startsWith(`${item.path}/`) &&
                            location.pathname.startsWith(other.path),
                        ));
                    return (
                      <li key={item.path}>
                        <Link
                          to={item.path}
                          aria-current={isActive ? 'page' : undefined}
                          onClick={() => {
                            setSidebarOpen(false);
                          }}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all
                            ${
                              isActive
                                ? 'bg-blue-50 text-blue-700'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                        >
                          <span className={isActive ? 'text-blue-600' : 'text-slate-400'}>
                            {item.icon}
                          </span>
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main Content Area ──────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-8">
          {/* Mobile menu button */}
          <button
            onClick={() => {
              setSidebarOpen(true);
            }}
            aria-label="Open navigation"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden lg:block" />

          {/* Right actions: Notifications & User menu */}
          <div className="flex items-center gap-3">
            <NotificationBell />

            {/* User menu */}
            <div className="relative z-50">
            <button
              onClick={() => {
                setUserMenuOpen(!userMenuOpen);
              }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-slate-50"
            >
              {/* Avatar */}
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-semibold text-white">
                {user?.fullName.charAt(0).toUpperCase() ?? 'U'}
              </div>
              <div className="hidden items-start gap-1 sm:flex sm:flex-col">
                <span className="text-sm font-medium text-slate-900">
                  {user?.fullName ?? 'User'}
                </span>
                {roleBadge && (
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${roleBadge.className}`}
                  >
                    {roleBadge.label}
                  </span>
                )}
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>

            {/* Dropdown */}
            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-white shadow-lg ring-1 ring-slate-200 z-50"
                >
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-medium text-slate-900">{user?.fullName}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        void handleSignOut();
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Click-away to close user menu */}
      {userMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setUserMenuOpen(false);
          }}
        />
      )}
    </div>
  );
}
