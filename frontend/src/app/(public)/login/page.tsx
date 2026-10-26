'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, ShieldAlert, Sparkles, KeyRound, Building } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid academic email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setErrorMessage(null);
    try {
      await login(data.email, data.password);
      toast.success('Successfully authenticated');
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid email or password';
      setErrorMessage(msg);
      toast.error(msg);
    }
  };

  const setDemoCredentials = (email: string, pass: string) => {
    setValue('email', email, { shouldValidate: false, shouldDirty: true });
    setValue('password', pass, { shouldValidate: false, shouldDirty: true });
    clearErrors();
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8 dark:bg-slate-950">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
          <Camera className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-center text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Smart Attendance Portal
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500 dark:text-slate-400">
          Sign in to access college attendance operations & biometrics
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          {errorMessage && (
            <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
              <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Institutional Email"
              type="email"
              placeholder="e.g. faculty.sharma@apex.edu"
              required
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••••••"
              required
              error={errors.password?.message}
              {...register('password')}
            />

            <div className="flex items-center justify-end">
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
              >
                Forgot password?
              </Link>
            </div>

            <Button type="submit" variant="primary" className="w-full" isLoading={isSubmitting}>
              Sign In to Account
            </Button>
          </form>

          {/* Quick Demo Logins Bar */}
          <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-center">
              Quick Role Selection (Development Seed)
            </p>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setDemoCredentials('superadmin@system.local', 'AdminPass123!')}
                className="flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
              >
                <KeyRound className="h-3 w-3 text-purple-600" /> SuperAdmin
              </button>

              <button
                type="button"
                onClick={() => setDemoCredentials('admin@apex.edu', 'ApexPass123!')}
                className="flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
              >
                <Building className="h-3 w-3 text-indigo-600" /> CollegeAdmin
              </button>

              <button
                type="button"
                onClick={() => setDemoCredentials('faculty.sharma@apex.edu', 'FacultyPass123!')}
                className="flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
              >
                <Sparkles className="h-3 w-3 text-emerald-600" /> Faculty
              </button>

              <button
                type="button"
                onClick={() => setDemoCredentials('rahul.mehta@apex.edu', 'StudentPass123!')}
                className="flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
              >
                <Camera className="h-3 w-3 text-amber-600" /> Student
              </button>
            </div>
          </div>

          {/* Registration Links */}
          <div className="mt-5 border-t border-slate-100 pt-4 text-center text-xs text-slate-500 dark:border-slate-800">
            <p>
              New Institution?{' '}
              <Link href="/register-college" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
                Register Your College
              </Link>
            </p>
            <p className="mt-1">
              New Student?{' '}
              <Link href="/register-student" className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400">
                Enroll / Register Here
              </Link>
            </p>
            <div className="mt-3">
              <Link href="/" className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                ← Return to Homepage
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
