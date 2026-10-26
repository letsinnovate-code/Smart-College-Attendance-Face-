'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, CheckCircle2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid academic email address'),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [devResetToken, setDevResetToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordValues) => {
    try {
      const res = await apiClient<{ success: boolean; data: { message: string; devToken?: string } }>(
        '/auth/forgot-password',
        {
          method: 'POST',
          body: { email: data.email },
          skipAuth: true,
        },
      );

      setSubmitted(true);
      if (res.data?.devToken) {
        setDevResetToken(res.data.devToken);
      }
      toast.success('Reset instructions processed');
    } catch {
      // Even if network fails, don't reveal existence
      setSubmitted(true);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8 dark:bg-slate-950">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
        </Link>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Reset Your Password
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Enter your institutional email to receive reset instructions
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          {submitted ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Check Your Email
              </h3>
              <p className="text-xs text-slate-500">
                If the email address exists in the college system, password reset instructions have been dispatched.
              </p>

              {devResetToken && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left dark:border-amber-900/60 dark:bg-amber-950/40">
                  <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300">
                    Development Mode Reset Token:
                  </p>
                  <code className="mt-1 block break-all text-[10px] text-amber-900 dark:text-amber-200 font-mono">
                    {devResetToken}
                  </code>
                  <Link
                    href={`/reset-password?token=${devResetToken}`}
                    className="mt-2 block text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    Click to Reset Password Immediately →
                  </Link>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full mt-4"
                onClick={() => setSubmitted(false)}
              >
                Send Another Request
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Institutional Email"
                type="email"
                placeholder="e.g. user@apex.edu"
                leftIcon={<Mail className="h-4 w-4" />}
                required
                error={errors.email?.message}
                {...register('email')}
              />

              <Button type="submit" variant="primary" className="w-full" isLoading={isSubmitting}>
                Request Reset Link
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
