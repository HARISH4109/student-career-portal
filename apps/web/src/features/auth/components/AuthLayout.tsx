import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

import { StudentSuccessLogo } from '@/shared/components/ui/StudentSuccessLogo';
import { AuthCanvas, LIVING_NETWORK_NODES } from './AuthCanvas';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  activeTab?: 'signin' | 'signup';
  showTabs?: boolean;
  initialModalOpen?: boolean;
  isModalOpen?: boolean;
  onOpenLogin?: () => void;
  onOpenRegister?: () => void;
  onCloseModal?: () => void;
}




/**
 * Classic Academic & Trusted Career Portal Auth & Landing Experience.
 *
 * Implements:
 * - State 1: Outdoor collegiate Gothic university courtyard background with students studying at wooden tables,
 *            dignified serif headline "Build Your Career, Shape Your Future",
 *            dual CTAs (Academic Forest Green + Light Cream), and 6 Living Network Pill Badges
 *            interconnected with delicate luminous filaments.
 * - State 2: Translucent Frosted Glass centered login board (background visible through glass),
 *            standalone without tabs, with Academic Gold caustics and Light Cream (#F4F1EA) typography.
 */
export function AuthLayout({
  children,
  title,
  subtitle,
  initialModalOpen,
  isModalOpen: controlledModalOpen,
  onOpenLogin,
  onOpenRegister,
  onCloseModal,
}: AuthLayoutProps): React.JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const defaultOpen = initialModalOpen ?? (location.pathname !== '/');
  const [internalModalOpen, setInternalModalOpen] = useState(defaultOpen);
  const isModalOpen = controlledModalOpen !== undefined ? controlledModalOpen : internalModalOpen;
  const modalRef = React.useRef<HTMLDivElement>(null);
  const previousActiveElement = React.useRef<HTMLElement | null>(null);

  // Sync modal state on route navigation if initialModalOpen is not explicitly provided and not controlled
  useEffect(() => {
    if (initialModalOpen === undefined && controlledModalOpen === undefined) {
      setInternalModalOpen(location.pathname !== '/');
    }
  }, [location.pathname, initialModalOpen, controlledModalOpen]);

  // Handle modal close with route synchronization
  const handleCloseModal = () => {
    if (onCloseModal) {
      onCloseModal();
      return;
    }
    setInternalModalOpen(false);
    if (location.pathname !== '/') {
      void navigate('/', { replace: true });
    }
  };

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen, location.pathname]);

  // Accessible focus trap and focus restoration for State 2 modal
  useEffect(() => {
    if (!isModalOpen) return;

    previousActiveElement.current = document.activeElement as HTMLElement | null;
    modalRef.current?.focus();

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !modalRef.current) return;
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first || document.activeElement === modalRef.current) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleTabKey);
    return () => {
      window.removeEventListener('keydown', handleTabKey);
      previousActiveElement.current?.focus();
    };
  }, [isModalOpen]);

  const handleOpenLogin = () => {
    if (onOpenLogin) {
      onOpenLogin();
      return;
    }
    if (location.pathname === '/') {
      setInternalModalOpen(true);
    } else if (location.pathname !== '/login') {
      void navigate('/login');
    } else {
      setInternalModalOpen(true);
    }
  };

  const handleOpenRegister = () => {
    if (onOpenRegister) {
      onOpenRegister();
      return;
    }
    if (location.pathname !== '/register') {
      void navigate('/register');
    } else {
      setInternalModalOpen(true);
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#06192E] text-[#F4F1EA] flex flex-col justify-between selection:bg-[#B9903B]/30 selection:text-[#F4F1EA]">
      {/* ── Background: Outdoor Collegiate Gothic University Courtyard Photography ── */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute inset-0 bg-cover bg-[center_35%] opacity-90 filter saturate-[1.03] contrast-[1.02]"
          style={{
            backgroundImage: `url('/campus-courtyard.jpg')`,
          }}
        />
        {/* Soft Academic Navy & Ivy Vignette — Courtyard Fully Visible */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#092749]/65 via-[#06192E]/40 to-[#092749]/70 backdrop-blur-[0.2px]" />
      </div>

      {/* ── Living Career Pathway & Knowledge Network Filaments Canvas ─────── */}
      <AuthCanvas />

      {/* ── Top Header Bar ───────────────────────────────────────────── */}
      <header
        aria-hidden={isModalOpen ? 'true' : undefined}
        className="relative z-30 flex h-20 w-full items-center justify-between border-b border-[#F4F1EA]/15 px-6 lg:px-12 backdrop-blur-md bg-[#092749]/60 shrink-0"
      >
        {/* Left: Student Success Logo + Title */}
        <Link to="/" className="flex items-center gap-3.5 group cursor-pointer">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#092749]/90 border border-[#B9903B]/40 shadow-md group-hover:scale-105 group-hover:border-[#B9903B] transition-colors">
            <StudentSuccessLogo className="h-9 w-9" />
          </div>
          <div>
            <span className="font-serif text-lg sm:text-xl font-bold tracking-tight text-[#F4F1EA] block">
              Student Success Portal
            </span>
            <p className="text-xs text-[#F4F1EA]/70 font-sans">
              University Placement & Readiness Portal
            </p>
          </div>
        </Link>

        {/* Right: Modal Controller */}
        <div className="flex items-center gap-4">
          {isModalOpen && (
            <button
              onClick={handleCloseModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-[#F4F1EA]/25 px-3 py-1.5 text-xs text-[#F4F1EA] transition-colors cursor-pointer"
              title="Close modal"
              aria-label="Close login modal"
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">Close</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Living Network Pill Badges with Organic Floating Zig-Zag Drift ── */}
      <div
        aria-hidden={isModalOpen ? 'true' : undefined}
        className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
      >
        {LIVING_NETWORK_NODES.map((node, idx) => {
          const xDelta = idx % 2 === 0 ? 6 : -6;
          const yDelta = 7 + (idx % 3) * 2;
          return (
            <motion.div
              key={node.id}
              data-badge-id={node.id}
              style={{
                left: `${node.relX * 100}%`,
                top: `${node.relY * 100}%`,
              }}
              animate={{
                y: [0, -yDelta, 2, -yDelta * 0.6, 0],
                x: [0, xDelta, -xDelta * 0.7, xDelta * 0.4, 0],
              }}
              transition={{
                duration: 5.5 + (idx % 4) * 0.8,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: idx * 0.35,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 rounded-full bg-white/95 backdrop-blur-md px-2.5 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs lg:text-sm font-semibold text-[#092749] shadow-lg border border-white/70 select-none transition-transform hover:scale-105"
            >
              <span>{node.label}</span>
            </motion.div>
          );
        })}
      </div>

      {/* ── State 1: Hero Landing Experience (Non-Scrollable 100vh) ──── */}
      <main
        aria-hidden={isModalOpen ? 'true' : undefined}
        className="relative z-20 flex flex-1 flex-col items-center justify-center px-4 sm:px-6 py-2 text-center overflow-hidden"
      >
        {/* Center Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative z-30 max-w-2xl mx-auto space-y-4 sm:space-y-5 px-4"
        >
          {/* Accent eyebrow pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#B9903B]/50 bg-[#092749]/90 px-4 py-1 text-xs sm:text-[13px] font-medium text-[#F4F1EA] shadow-xs">
            <span>Campus Placement & Career Acceleration</span>
          </div>

          {/* Main Headline in Dignified Serif Font & Warm Light Cream */}
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-[#F4F1EA] leading-[1.12] select-none">
            Build Your Career,<br />
            <span className="block mt-1 text-[#F4F1EA]">
              Shape Your Future
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base md:text-lg text-[#F4F1EA]/85 leading-relaxed max-w-xl mx-auto font-sans">
            Explore opportunities, practice skills, and achieve your career goals with us.
          </p>

          {/* Dual CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-3">
            {/* Primary CTA: Academic Forest Green with subtle gold border */}
            <button
              onClick={handleOpenLogin}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#065F43] hover:bg-[#04422E] px-8 py-3.5 text-sm sm:text-base font-semibold text-[#F4F1EA] shadow-xl shadow-black/40 border border-[#B9903B]/60 active:scale-[0.98] transition-colors cursor-pointer group"
            >
              <span>Log In to Portal</span>
              <span className="text-[#D4AF37] font-bold text-base transition-transform group-hover:translate-x-1">
                →
              </span>
            </button>

            {/* Secondary CTA: Light Cream with dark navy text */}
            <button
              onClick={handleOpenRegister}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#F4F1EA] hover:bg-white px-8 py-3.5 text-sm sm:text-base font-bold text-[#092749] shadow-xl shadow-black/30 border border-white/60 active:scale-[0.98] transition-colors cursor-pointer"
            >
              <span>Sign Up / Join Cohort</span>
            </button>
          </div>
        </motion.div>
      </main>

      {/* ── State 2: Centered Translucent Frosted Glass Login Board ─── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Translucent Soft Backdrop Blur (Courtyard photo remains visible through glass) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={handleCloseModal}
              className="fixed inset-0 bg-[#06192E]/45 backdrop-blur-md"
              aria-hidden="true"
            >
              <div
                className="absolute inset-0 bg-cover bg-center brightness-[0.7] filter saturate-[1.05]"
                style={{ backgroundImage: `url('/campus-courtyard.jpg')` }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[#092749]/60 via-[#06192E]/45 to-[#092749]/70 backdrop-blur-md" />
            </motion.div>

            {/* Standalone Translucent Frosted Glass Card (No Tabs) */}
            <motion.div
              ref={modalRef}
              tabIndex={-1}
              initial={{ opacity: 0, scale: 0.95, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 14 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="relative z-10 w-full max-w-[440px] my-auto overflow-hidden rounded-2xl border border-[#F4F1EA]/20 bg-[#092749]/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl outline-none"
              role="dialog"
              aria-modal="true"
              aria-labelledby="auth-modal-title"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={handleCloseModal}
                className="absolute right-4 top-4 rounded-lg p-1.5 text-[#F4F1EA]/70 hover:bg-white/10 hover:text-[#F4F1EA] transition-colors cursor-pointer"
                aria-label="Close login modal"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Modal Header */}
              <div className="mb-6 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#092749] border border-[#B9903B]/40 shadow-xs">
                    <StudentSuccessLogo className="h-6 w-6" />
                  </div>
                  <span className="text-xs font-medium text-[#B9903B] font-mono">
                    Student Success Portal
                  </span>
                </div>
                <h2 id="auth-modal-title" className="text-2xl font-bold tracking-tight text-[#F4F1EA]">
                  {title}
                </h2>
                {subtitle && (
                  <p className="mt-1 text-sm text-[#F4F1EA]/80">{subtitle}</p>
                )}
              </div>

              {/* Standalone Form Content (Tabs Completely Removed) */}
              <div className="text-left">{children}</div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Footer Bar: Academic Placement Platform & Live Notices ───── */}
      <footer
        aria-hidden={isModalOpen ? 'true' : undefined}
        className="relative z-20 border-t border-[#F4F1EA]/10 py-3 px-6 text-center text-xs text-[#F4F1EA]/65 shrink-0 flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto w-full gap-2"
      >
        <p>Campus Placement & Career Acceleration Platform • Academic Year 2025–2026</p>
        <div className="flex items-center gap-3 text-[11px] text-[#F4F1EA]/70">
          <span className="inline-flex items-center gap-1.5 text-[#D4AF37]">
            <Bell className="h-3 w-3" />
            <span>Notices & Updates</span>
          </span>
          <span>•</span>
          <span>Cohort 2026</span>
        </div>
      </footer>
    </div>
  );
}
