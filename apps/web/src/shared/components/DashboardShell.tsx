import type { RoleName } from '@career-portal/shared-types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
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
import { useState, type ReactNode } from 'react';
import { Link, Outlet, useLocation } from 'react-router';

import { useAuth } from '@/features/auth/use-auth';
import { NotificationBell } from '@/features/engagement/components/NotificationBell';
import { StudentSuccessLogo } from '@/shared/components/ui/StudentSuccessLogo';
import { cn } from '@/shared/lib/utils';

/* ═════════════════════════════════════════════════════════
 * Navigation Configuration
 * ═════════════════════════════════════════════════════════ */

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
  permission?: string;
  roles?: RoleName[];
  section?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_ITEMS: NavItem[] = [
  // ── Core ────────────────
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="h-[18px] w-[18px]" />, section: 'Core' },
  { label: 'Notice Board', path: '/dashboard/notices', icon: <Bell className="h-[18px] w-[18px]" />, permission: 'notices.view', section: 'Core' },
  { label: 'My Profile', path: '/dashboard/profile', icon: <User className="h-[18px] w-[18px]" />, roles: ['STUDENT'], section: 'Core' },

  // ── Career ──────────────
  { label: 'Opportunities', path: '/dashboard/opportunities', icon: <Briefcase className="h-[18px] w-[18px]" />, section: 'Career' },
  { label: 'Manage Opportunities', path: '/dashboard/opportunities/manage', icon: <Briefcase className="h-[18px] w-[18px]" />, roles: ['PLACEMENT_FACULTY', 'ADMIN'], section: 'Career' },
  { label: 'Applications', path: '/dashboard/applications', icon: <FileText className="h-[18px] w-[18px]" />, roles: ['STUDENT'], section: 'Career' },
  { label: 'Resumes', path: '/dashboard/resumes', icon: <FileText className="h-[18px] w-[18px]" />, roles: ['STUDENT'], section: 'Career' },

  // ── Growth ──────────────
  { label: 'Preparation', path: '/dashboard/preparation', icon: <BookOpen className="h-[18px] w-[18px]" />, section: 'Growth' },
  { label: 'Career Paths', path: '/dashboard/careers', icon: <Compass className="h-[18px] w-[18px]" />, permission: 'resources.view', section: 'Growth' },
  { label: 'My Roadmap', path: '/dashboard/roadmap', icon: <Route className="h-[18px] w-[18px]" />, roles: ['STUDENT'], permission: 'roadmaps.manage_own', section: 'Growth' },
  { label: 'Learning Resources', path: '/dashboard/resources', icon: <BookOpen className="h-[18px] w-[18px]" />, permission: 'resources.view', section: 'Growth' },
  { label: 'Skill Gaps', path: '/dashboard/skill-gap', icon: <Target className="h-[18px] w-[18px]" />, roles: ['STUDENT'], permission: 'skill_gap.analyze_own', section: 'Growth' },

  // ── Management ──────────
  { label: 'Manage Career Catalog', path: '/dashboard/careers/manage', icon: <Settings2 className="h-[18px] w-[18px]" />, roles: ['PLACEMENT_FACULTY', 'ADMIN'], permission: 'career_paths.manage', section: 'Management' },
  { label: 'Academic Programs', path: '/dashboard/programs', icon: <GraduationCap className="h-[18px] w-[18px]" />, roles: ['ADMIN'], section: 'Management' },
  { label: 'Analytics', path: '/dashboard/analytics', icon: <BarChart3 className="h-[18px] w-[18px]" />, section: 'Management' },
  { label: 'Administration', path: '/dashboard/admin', icon: <Shield className="h-[18px] w-[18px]" />, roles: ['ADMIN'], section: 'Management' },
];

const ROLE_BADGES: Record<string, { label: string; className: string }> = {
  STUDENT: { label: 'Student', className: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/20' },
  PLACEMENT_FACULTY: { label: 'Faculty', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/20' },
  ADMIN: { label: 'Admin', className: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 ring-1 ring-indigo-500/20' },
};

/* ═════════════════════════════════════════════════════════
 * Breadcrumbs
 * ═════════════════════════════════════════════════════════ */

function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length <= 1) return null;

  const crumbs = segments.map((segment, index) => {
    const path = '/' + segments.slice(0, index + 1).join('/');
    const label = segment
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    const isLast = index === segments.length - 1;
    return { label, path, isLast };
  });

  return (
    <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-1.5 text-xs">
      {crumbs.map((crumb, i) => (
        <span key={crumb.path} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-sidebar-muted-foreground/40">/</span>}
          {crumb.isLast ? (
            <span className="font-semibold text-sidebar-foreground">{crumb.label}</span>
          ) : (
            <Link
              to={crumb.path}
              className="text-sidebar-muted-foreground hover:text-sidebar-foreground transition-colors duration-150"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

/* ═════════════════════════════════════════════════════════
 * Sidebar Navigation Link
 * ═════════════════════════════════════════════════════════ */

interface SidebarLinkProps {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  onClick?: (() => void) | undefined;
}

function SidebarLink({ item, isActive, collapsed, onClick }: SidebarLinkProps) {
  return (
    <Link
      to={item.path}
      aria-label={item.label}
      aria-current={isActive ? 'page' : undefined}
      onClick={onClick}
      className={cn(
        'group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-150 cursor-pointer',
        collapsed && 'justify-center px-2',
        isActive
          ? 'bg-primary/10 text-primary shadow-xs font-semibold'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      <span
        className={cn(
          'flex-shrink-0 transition-colors duration-150',
          isActive ? 'text-primary' : 'text-muted-foreground/70 group-hover:text-foreground',
        )}
      >
        {item.icon}
      </span>
      <span className={cn('truncate', collapsed && 'sr-only')}>{item.label}</span>
    </Link>
  );
}

/* ═════════════════════════════════════════════════════════
 * DashboardShell — Main Layout
 * ═════════════════════════════════════════════════════════ */

export function DashboardShell(): React.JSX.Element {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Filter nav items by role & permission
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (item.permission && !user?.permissions.includes(item.permission)) return false;
    if (!item.roles) return true;
    return item.roles.some((role) => user?.roles.includes(role));
  });

  // Group items into sections
  const sections: NavSection[] = [];
  const sectionOrder = ['Core', 'Career', 'Growth', 'Management'];
  for (const sectionTitle of sectionOrder) {
    const items = visibleNavItems.filter((item) => item.section === sectionTitle);
    if (items.length > 0) {
      sections.push({ title: sectionTitle, items });
    }
  }

  const isActive = (item: NavItem) =>
    location.pathname === item.path ||
    (item.path !== '/dashboard' &&
      location.pathname.startsWith(`${item.path}/`) &&
      !visibleNavItems.some(
        (other) =>
          other.path !== item.path &&
          other.path.startsWith(`${item.path}/`) &&
          location.pathname.startsWith(other.path),
      ));

  const primaryRole = user?.roles[0];
  const roleBadge = primaryRole ? ROLE_BADGES[primaryRole] : null;

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    await signOut();
  };

  /* ── Sidebar Navigation Items (shared between desktop & mobile) ── */
  const renderNavLinks = (collapsed: boolean, onClick?: () => void) => (
    <nav className="flex-1 overflow-hidden px-2.5 py-3 space-y-3">
      {sections.map((section) => (
        <div key={section.title}>
          {!collapsed && (
            <p className="mb-1 px-2.5 text-[10px] font-semibold tracking-wider text-sidebar-muted-foreground/80 uppercase">
              {section.title}
            </p>
          )}
          <ul className="space-y-0.5">
            {section.items.map((item) => (
              <li key={item.path}>
                <SidebarLink
                  item={item}
                  isActive={isActive(item)}
                  collapsed={collapsed}
                  onClick={onClick}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Skip to content */}
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      {/* ── Top Bar (Spans full width in sidebar color: Student Success Portal brand ALWAYS visible) ──── */}
      <header className="flex h-14 items-center justify-between border-b border-sidebar-border bg-sidebar text-sidebar-foreground px-4 lg:px-6 shrink-0 z-40 select-none shadow-xs">
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
            className="rounded-lg p-2 text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors lg:hidden cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Student Success Portal Logo & Title — ALWAYS VISIBLE ON TOP */}
          <Link
            to="/dashboard"
            aria-label="Student Success Portal Dashboard"
            className="flex items-center gap-2.5 mr-2 group select-none cursor-pointer"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#092749] border border-[#B9903B]/60 shadow-xs group-hover:scale-105 transition-transform">
              <StudentSuccessLogo className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-sidebar-foreground leading-tight tracking-tight">Student Success Portal</span>
              <span className="text-[10px] text-[#D4AF37]/90 leading-tight hidden sm:inline font-mono">University Placement & Readiness</span>
            </div>
          </Link>

          <div className="hidden sm:block h-5 w-[1px] bg-sidebar-border mx-1" />
          <Breadcrumbs />
        </div>

        {/* Right actions: Contextual Status Pill + Notifications + User Menu */}
        <div className="flex items-center gap-3">
          <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-[#06192E]/70 border border-sidebar-border text-sidebar-foreground shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Academic Year 2025–2026 • Cohort 2026
          </span>

          <NotificationBell />

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/10 cursor-pointer text-sidebar-foreground"
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
            >
              {/* Avatar with dynamic initials (HP for Harish P) */}
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#065F43] text-xs font-semibold text-[#F4F1EA] shadow-xs border border-[#B9903B]/40">
                {user?.fullName
                  ? user.fullName
                    .split(' ')
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()
                  : 'HP'}
              </div>
              <div className="hidden items-start gap-0.5 sm:flex sm:flex-col">
                <span className="text-sm font-medium text-sidebar-foreground leading-tight">
                  {user?.fullName || 'Harish P'}
                </span>
                {roleBadge && (
                  <span className={cn('inline-flex items-center rounded-full px-1.5 py-px text-[10px] font-medium', roleBadge.className)}>
                    {roleBadge.label}
                  </span>
                )}
              </div>
            </button>

            {/* Dropdown */}
            <AnimatePresence>
              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-xl border border-border bg-popover shadow-lg"
                  >
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-medium text-foreground">{user?.fullName}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                    <div className="p-1">
                      {/* Profile button shown strictly for Student role; removed for Faculty and Admin */}
                      {user?.roles?.includes('STUDENT') && (
                        <Link
                          to="/dashboard/profile"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                        >
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>My Profile</span>
                        </Link>
                      )}
                      <button
                        onClick={() => void handleSignOut()}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* ── Main Workspace: Sidebar (Options Only) + Content Area ──── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* ── Desktop Sidebar: ONLY the options expand on hover, non-scrollable ──── */}
        <aside
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={cn(
            'hidden lg:flex lg:flex-col bg-sidebar border-r border-sidebar-border transition-[width] duration-200 ease-out overflow-hidden select-none z-30 shadow-xs shrink-0',
            isHovered ? 'lg:w-64 shadow-xl' : 'lg:w-[68px]',
          )}
        >
          {renderNavLinks(!isHovered)}
        </aside>

        {/* ── Mobile Sidebar Overlay ─────────────────────── */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
                onClick={() => setSidebarOpen(false)}
                aria-hidden="true"
              />
              <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 left-0 z-50 w-72 bg-sidebar shadow-2xl lg:hidden flex flex-col"
              >
                {/* Mobile Drawer Header */}
                <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5 select-none">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#092749] border border-[#B9903B]/40 shadow-xs">
                      <StudentSuccessLogo className="h-7 w-7" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-sidebar-foreground leading-tight">Student Success Portal</span>
                      <span className="text-[11px] text-sidebar-muted-foreground leading-tight">Placement & Readiness</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Close navigation"
                    className="rounded-lg p-1.5 text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                {renderNavLinks(false, () => setSidebarOpen(false))}
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* ── Main Content Area: Takes full remaining width and utilizes all space ──── */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 outline-none w-full"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
