import { signInSchema, type SignInDto } from '@career-portal/shared-types';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router';
import { z } from 'zod';

import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { useAuth } from '@/features/auth/use-auth';
import { Button } from '@/shared/components/ui';

// Registration schema with confirm password validation
const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Full name is required').max(200),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export interface AuthLandingPageProps {
  initialMode?: 'login' | 'register';
  initialModalOpen?: boolean;
}

/**
 * Unified Collegiate Gothic Hero Landing & Authentication Gateway.
 *
 * Provides:
 * 1. State 1: Academic hero courtyard canvas with live drifting network badges and dual CTAs.
 * 2. Instantaneous mode switching between Login ("Welcome Back") and Register ("Create Your Account")
 *    with zero route delay, zero layout unmounting, and zero flash of previous form states.
 * 3. Deep-link synchronization with /, /login, /register, and /signup.
 */
export function AuthLandingPage({
  initialMode,
  initialModalOpen,
}: AuthLandingPageProps): React.JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine initial mode from props or pathname
  const resolvedMode =
    initialMode ??
    (location.pathname === '/register' || location.pathname === '/signup'
      ? 'register'
      : 'login');

  // Determine initial modal visibility from props or pathname
  const resolvedModalOpen =
    initialModalOpen ??
    (location.pathname === '/login' ||
      location.pathname === '/register' ||
      location.pathname === '/signup');

  const [authMode, setAuthMode] = useState<'login' | 'register'>(resolvedMode);
  const [isModalOpen, setIsModalOpen] = useState(resolvedModalOpen);

  const { signIn, signUp, isLoading, error, clearError } = useAuth();

  // Form toggle states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Sync mode and open state when location changes externally
  useEffect(() => {
    if (location.pathname === '/register' || location.pathname === '/signup') {
      setAuthMode('register');
      setIsModalOpen(true);
      clearError();
    } else if (location.pathname === '/login') {
      setAuthMode('login');
      setIsModalOpen(true);
      clearError();
    } else if (location.pathname === '/' && initialModalOpen === undefined) {
      setIsModalOpen(false);
      clearError();
    }
  }, [location.pathname, initialModalOpen, clearError]);

  // Sign In Form Hook
  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm<SignInDto>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  // Sign Up Form Hook
  const {
    register: registerSignUp,
    handleSubmit: handleSignUpSubmit,
    formState: { errors: registerErrors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  const onLoginSubmit = async (data: SignInDto) => {
    clearError();
    const result = await signIn(data.email, data.password);
    if (result.meta.requestStatus === 'fulfilled') {
      void navigate('/dashboard', { replace: true });
    }
  };

  const onSignUpSubmit = async (data: RegisterForm) => {
    clearError();
    const result = await signUp(data.email, data.password, data.fullName);
    if (result.meta.requestStatus === 'fulfilled') {
      void navigate('/dashboard', { replace: true });
    }
  };

  const handleOpenLogin = () => {
    clearError();
    setAuthMode('login');
    setIsModalOpen(true);
  };

  const handleOpenRegister = () => {
    clearError();
    setAuthMode('register');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    clearError();
    if (location.pathname !== '/') {
      void navigate('/', { replace: true });
    }
  };

  const switchToRegister = (e?: React.MouseEvent) => {
    e?.preventDefault();
    clearError();
    setAuthMode('register');
    if (location.pathname !== '/' && location.pathname !== '/register') {
      void navigate('/register', { replace: true });
    }
  };

  const switchToLogin = (e?: React.MouseEvent) => {
    e?.preventDefault();
    clearError();
    setAuthMode('login');
    if (location.pathname !== '/' && location.pathname !== '/login') {
      void navigate('/login', { replace: true });
    }
  };

  const title = authMode === 'login' ? 'Welcome Back' : 'Create Your Account';
  const subtitle =
    authMode === 'login'
      ? 'Sign in to continue your journey'
      : 'Join your university campus placement cohort';

  return (
    <AuthLayout
      title={title}
      subtitle={subtitle}
      isModalOpen={isModalOpen}
      onOpenLogin={handleOpenLogin}
      onOpenRegister={handleOpenRegister}
      onCloseModal={handleCloseModal}
    >
      {/* Server error banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/15 px-4 py-2.5 text-xs text-destructive mb-4"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}

      {/* ── Mode 1: Sign In Form ─────────────────────────────────────────── */}
      {authMode === 'login' ? (
        <form
          key="signin-form"
          onSubmit={(event) => {
            void handleLoginSubmit(onLoginSubmit)(event);
          }}
          className="space-y-4"
        >
          {/* Email Address / College ID */}
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-[#F4F1EA] mb-1.5">
              Email Address / College ID
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#F4F1EA]/60">
                <Mail className="h-4 w-4 text-[#F4F1EA]/60" />
              </div>
              <input
                {...registerLogin('email')}
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@college.edu or 2026CS101"
                className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm text-[#F4F1EA] placeholder:text-[#F4F1EA]/40
                  outline-none transition-colors duration-150
                  focus:border-[#B9903B] focus:ring-1 focus:ring-[#B9903B]/50
                  ${loginErrors.email ? 'border-destructive bg-destructive/10' : 'border-[#F4F1EA]/20 bg-[#092749]/70 hover:border-[#F4F1EA]/35'}`}
              />
            </div>
            {loginErrors.email && (
              <p className="mt-1 text-xs text-destructive">{loginErrors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block text-xs font-medium text-[#F4F1EA]">
                Password
              </label>
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#F4F1EA]/60">
                <Lock className="h-4 w-4 text-[#F4F1EA]/60" />
              </div>
              <input
                {...registerLogin('password')}
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                className={`w-full rounded-xl border pl-10 pr-10 py-2.5 text-sm text-[#F4F1EA] placeholder:text-[#F4F1EA]/40
                  outline-none transition-colors duration-150
                  focus:border-[#B9903B] focus:ring-1 focus:ring-[#B9903B]/50
                  ${loginErrors.password ? 'border-destructive bg-destructive/10' : 'border-[#F4F1EA]/20 bg-[#092749]/70 hover:border-[#F4F1EA]/35'}`}
              />
              <button
                type="button"
                onClick={() => {
                  setShowPassword(!showPassword);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#F4F1EA]/60 hover:text-[#F4F1EA] transition-colors cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {loginErrors.password && (
              <p className="mt-1 text-xs text-destructive">{loginErrors.password.message}</p>
            )}
          </div>

          {/* Options Row: Remember Me & Forgot Password */}
          <div className="flex items-center justify-between pt-0.5">
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-[#F4F1EA]/85 hover:text-[#F4F1EA] transition-colors select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => {
                  setRememberMe(e.target.checked);
                }}
                className="h-4 w-4 rounded border-[#F4F1EA]/30 bg-[#092749] text-[#065F43] focus:ring-[#B9903B]/40 accent-[#065F43] cursor-pointer"
              />
              <span>Remember Me</span>
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-[#B9903B] hover:underline transition-colors"
            >
              Forgot Password?
            </Link>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            loading={isLoading}
            className="w-full bg-[#065F43] hover:bg-[#04422E] text-[#F4F1EA] font-semibold shadow-lg shadow-black/40 border border-[#B9903B]/30 active:scale-[0.98] transition-colors cursor-pointer flex items-center justify-center gap-2"
            size="lg"
          >
            <span>Sign In</span>
            <ArrowRight className="h-4 w-4" />
          </Button>

          {/* Toggle to Register mode — Instant zero-flash transition */}
          <p className="text-center text-xs text-[#F4F1EA]/70 pt-1">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={switchToRegister}
              className="font-medium text-[#F4F1EA] hover:text-[#B9903B] underline underline-offset-4 decoration-[#B9903B]/50 transition-colors cursor-pointer"
            >
              Register here
            </button>
          </p>
        </form>
      ) : (
        /* ── Mode 2: Sign Up / New User Form ────────────────────────────── */
        <form
          key="signup-form"
          onSubmit={(event) => {
            void handleSignUpSubmit(onSignUpSubmit)(event);
          }}
          className="space-y-3.5"
        >
          {/* Full Name */}
          <div>
            <label htmlFor="fullName" className="block text-xs font-medium text-[#F4F1EA] mb-1">
              Full name
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#F4F1EA]/60">
                <User className="h-4 w-4 text-[#F4F1EA]/60" />
              </div>
              <input
                {...registerSignUp('fullName')}
                id="fullName"
                type="text"
                autoComplete="name"
                placeholder="John Doe"
                className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm text-[#F4F1EA] placeholder:text-[#F4F1EA]/40
                  outline-none transition-colors duration-150
                  focus:border-[#B9903B] focus:ring-1 focus:ring-[#B9903B]/50
                  ${registerErrors.fullName ? 'border-destructive bg-destructive/10' : 'border-[#F4F1EA]/20 bg-[#092749]/70 hover:border-[#F4F1EA]/35'}`}
              />
            </div>
            {registerErrors.fullName && (
              <p className="mt-1 text-xs text-destructive">{registerErrors.fullName.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-[#F4F1EA] mb-1">
              Email address
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#F4F1EA]/60">
                <Mail className="h-4 w-4 text-[#F4F1EA]/60" />
              </div>
              <input
                {...registerSignUp('email')}
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@college.edu"
                className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm text-[#F4F1EA] placeholder:text-[#F4F1EA]/40
                  outline-none transition-colors duration-150
                  focus:border-[#B9903B] focus:ring-1 focus:ring-[#B9903B]/50
                  ${registerErrors.email ? 'border-destructive bg-destructive/10' : 'border-[#F4F1EA]/20 bg-[#092749]/70 hover:border-[#F4F1EA]/35'}`}
              />
            </div>
            {registerErrors.email && (
              <p className="mt-1 text-xs text-destructive">{registerErrors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-xs font-medium text-[#F4F1EA] mb-1">
              Password
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#F4F1EA]/60">
                <Lock className="h-4 w-4 text-[#F4F1EA]/60" />
              </div>
              <input
                {...registerSignUp('password')}
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Min 8 characters"
                className={`w-full rounded-xl border pl-10 pr-10 py-2.5 text-sm text-[#F4F1EA] placeholder:text-[#F4F1EA]/40
                  outline-none transition-colors duration-150
                  focus:border-[#B9903B] focus:ring-1 focus:ring-[#B9903B]/50
                  ${registerErrors.password ? 'border-destructive bg-destructive/10' : 'border-[#F4F1EA]/20 bg-[#092749]/70 hover:border-[#F4F1EA]/35'}`}
              />
              <button
                type="button"
                onClick={() => {
                  setShowPassword(!showPassword);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#F4F1EA]/60 hover:text-[#F4F1EA] transition-colors cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {registerErrors.password && (
              <p className="mt-1 text-xs text-destructive">{registerErrors.password.message}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-xs font-medium text-[#F4F1EA] mb-1">
              Confirm password
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#F4F1EA]/60">
                <Lock className="h-4 w-4 text-[#F4F1EA]/60" />
              </div>
              <input
                {...registerSignUp('confirmPassword')}
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Repeat your password"
                className={`w-full rounded-xl border pl-10 pr-10 py-2.5 text-sm text-[#F4F1EA] placeholder:text-[#F4F1EA]/40
                  outline-none transition-colors duration-150
                  focus:border-[#B9903B] focus:ring-1 focus:ring-[#B9903B]/50
                  ${registerErrors.confirmPassword ? 'border-destructive bg-destructive/10' : 'border-[#F4F1EA]/20 bg-[#092749]/70 hover:border-[#F4F1EA]/35'}`}
              />
              <button
                type="button"
                onClick={() => {
                  setShowConfirmPassword(!showConfirmPassword);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#F4F1EA]/60 hover:text-[#F4F1EA] transition-colors cursor-pointer"
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {registerErrors.confirmPassword && (
              <p className="mt-1 text-xs text-destructive">{registerErrors.confirmPassword.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            loading={isLoading}
            className="w-full bg-[#065F43] hover:bg-[#04422E] text-[#F4F1EA] font-semibold shadow-lg shadow-black/40 border border-[#B9903B]/30 active:scale-[0.98] transition-colors cursor-pointer flex items-center justify-center gap-2 mt-2"
            size="lg"
          >
            <span>Create Account</span>
          </Button>

          {/* Toggle to Login mode — Instant zero-flash transition */}
          <p className="text-center text-xs text-[#F4F1EA]/70 pt-1">
            Already have an account?{' '}
            <button
              type="button"
              onClick={switchToLogin}
              className="font-medium text-[#F4F1EA] hover:text-[#B9903B] underline underline-offset-4 decoration-[#B9903B]/50 transition-colors cursor-pointer"
            >
              Log in here
            </button>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
