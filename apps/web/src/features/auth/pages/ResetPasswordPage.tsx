import { resetPasswordSchema, type ResetPasswordDto } from '@career-portal/shared-types';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';


import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { apiClient } from '@/shared/lib/api-client';
import { supabase } from '@/shared/lib/supabase';

export function ResetPasswordPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isReset, setIsReset] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordDto>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: ResetPasswordDto) => {
    setIsLoading(true);
    setServerError(null);
    try {
      // Supabase passes the access token in the URL hash after the reset link is clicked.
      // The Supabase client auto-detects this and establishes a session.
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        setServerError('Invalid or expired reset link. Please request a new one.');
        return;
      }

      await apiClient.post(
        '/api/v1/auth/reset-password',
        { password: data.password, confirmPassword: data.confirmPassword },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setIsReset(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reset password';
      setServerError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isReset) {
    return (
      <AuthLayout title="Password reset!" subtitle="Your password has been updated successfully">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <p className="text-sm text-slate-600 mb-6">
            You can now sign in with your new password.
          </p>
          <button
            type="button"
            onClick={() => { void (navigate('/login', { replace: true })); }}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white
              shadow-sm transition-all hover:bg-blue-700 hover:shadow-md"
          >
            Go to sign in
          </button>
        </motion.div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Set new password" subtitle="Enter your new password below">
      <form onSubmit={(event) => { void (handleSubmit(onSubmit))(event); }} className="space-y-5">
        {serverError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            {serverError}
          </motion.div>
        )}

        {/* New Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
            New password
          </label>
          <div className="relative">
            <input
              {...register('password')}
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Min 8 characters"
              className={`w-full rounded-lg border px-4 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400
                outline-none transition-all duration-200
                focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                ${errors.password ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white'}`}
            />
            <button
              type="button"
              onClick={() => { setShowPassword(!showPassword); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
            Confirm new password
          </label>
          <input
            {...register('confirmPassword')}
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Repeat your new password"
            className={`w-full rounded-lg border px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400
              outline-none transition-all duration-200
              focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
              ${errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white'}`}
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white
            shadow-sm transition-all duration-200
            hover:bg-blue-700 hover:shadow-md
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Resetting…
            </>
          ) : (
            'Reset password'
          )}
        </button>

        <p className="text-center text-sm text-slate-500">
          <Link
            to="/login"
            className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
          >
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
