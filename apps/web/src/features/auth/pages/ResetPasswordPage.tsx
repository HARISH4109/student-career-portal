import { resetPasswordSchema, type ResetPasswordDto } from '@career-portal/shared-types';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';

import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { apiClient } from '@/shared/lib/api-client';
import { supabase } from '@/shared/lib/supabase';
import { Button } from '@/shared/components/ui';

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
      <AuthLayout
        title="Password reset"
        subtitle="Your password has been updated successfully"
        showTabs={false}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-2"
        >
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <p className="text-xs text-slate-300 mb-6">
            You can now sign in with your new password.
          </p>
          <Button
            type="button"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm active:scale-[0.98]"
            onClick={() => { void (navigate('/login', { replace: true })); }}
          >
            Go to sign in
          </Button>
        </motion.div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Set new password"
      subtitle="Enter your new password below"
      showTabs={false}
    >
      <form onSubmit={(event) => { void (handleSubmit(onSubmit))(event); }} className="space-y-4">
        {serverError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{serverError}</span>
          </motion.div>
        )}

        {/* New Password */}
        <div>
          <label htmlFor="password" className="block text-xs font-medium text-slate-400 mb-1.5">
            New password
          </label>
          <div className="relative">
            <input
              {...register('password')}
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Min 8 characters"
              className={`w-full rounded-xl border px-4 py-2.5 pr-10 text-sm text-white placeholder:text-slate-500
                outline-none transition-colors duration-150
                focus:border-primary focus:ring-2 focus:ring-primary/25
                ${errors.password ? 'border-destructive bg-destructive/10' : 'border-slate-700/60 bg-slate-900/60'}`}
            />
            <button
              type="button"
              onClick={() => { setShowPassword(!showPassword); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-xs font-medium text-slate-400 mb-1.5">
            Confirm new password
          </label>
          <input
            {...register('confirmPassword')}
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Repeat your new password"
            className={`w-full rounded-xl border px-4 py-2.5 text-sm text-white placeholder:text-slate-500
              outline-none transition-colors duration-150
              focus:border-primary focus:ring-2 focus:ring-primary/25
              ${errors.confirmPassword ? 'border-destructive bg-destructive/10' : 'border-slate-700/60 bg-slate-900/60'}`}
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button
          type="submit"
          loading={isLoading}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm active:scale-[0.98]"
          size="lg"
        >
          Update password
        </Button>

        <p className="text-center text-xs text-slate-400 pt-1">
          <Link
            to="/login"
            className="font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
