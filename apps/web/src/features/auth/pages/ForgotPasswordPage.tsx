import { forgotPasswordSchema, type ForgotPasswordDto } from '@career-portal/shared-types';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';

import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { apiClient } from '@/shared/lib/api-client';
import { Button } from '@/shared/components/ui';

export function ForgotPasswordPage(): React.JSX.Element {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordDto>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordDto) => {
    setIsLoading(true);
    setServerError(null);
    try {
      await apiClient.post('/api/v1/auth/forgot-password', data);
      setIsSubmitted(true);
    } catch {
      // Always show success to prevent email enumeration
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <AuthLayout
        title="Check your email"
        subtitle="We've sent you a password reset link"
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
          <p className="text-xs text-slate-300 leading-relaxed">
            If an account exists with that email, you&apos;ll receive a password
            reset link shortly. Check your inbox and spam folder.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </motion.div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a reset link"
      showTabs={false}
    >
      <form onSubmit={(event) => { void (handleSubmit(onSubmit))(event); }} className="space-y-4">
        {serverError && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {serverError}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-xs font-medium text-slate-400 mb-1.5">
            Email address
          </label>
          <input
            {...register('email')}
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@university.edu"
            className={`w-full rounded-xl border px-4 py-2.5 text-sm text-white placeholder:text-slate-500
              outline-none transition-colors duration-150
              focus:border-primary focus:ring-2 focus:ring-primary/25
              ${errors.email ? 'border-destructive bg-destructive/10' : 'border-slate-700/60 bg-slate-900/60'}`}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <Button
          type="submit"
          loading={isLoading}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm active:scale-[0.98]"
          size="lg"
        >
          Send reset link
        </Button>

        <p className="text-center text-xs text-slate-400 pt-1">
          <Link
            to="/login"
            className="inline-flex items-center gap-1 font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
