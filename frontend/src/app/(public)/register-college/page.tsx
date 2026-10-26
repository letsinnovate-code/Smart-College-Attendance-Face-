'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { apiClient, setAccessToken } from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const registerCollegeSchema = z.object({
  collegeName: z.string().min(2, 'College name must be at least 2 characters').max(200),
  tenantCode: z.string().min(2, 'Tenant code must be at least 2 characters').max(10).toUpperCase(),
  domain: z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, 'Must be a valid domain (e.g. apex.edu)').optional().or(z.literal('')),
  contactEmail: z.string().email('Please enter a valid official email').optional().or(z.literal('')),
  adminFirstName: z.string().min(1, 'Administrator first name is required').max(100),
  adminLastName: z.string().min(1, 'Administrator last name is required').max(100),
  adminEmail: z.string().email('Please enter a valid administrator email'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

type RegisterCollegeFormData = z.infer<typeof registerCollegeSchema>;

export default function RegisterCollegePage() {
  const router = useRouter();
  const { login: setAuthSession } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterCollegeFormData>({
    resolver: zodResolver(registerCollegeSchema),
    defaultValues: {
      collegeName: '',
      tenantCode: '',
      domain: '',
      contactEmail: '',
      adminFirstName: '',
      adminLastName: '',
      adminEmail: '',
      password: '',
    },
  });

  const onSubmit = async (data: RegisterCollegeFormData) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: any = { ...data };
      if (!payload.domain) delete payload.domain;
      if (!payload.contactEmail) delete payload.contactEmail;

      const res: any = await apiClient.post('/auth/register-college', payload);

      if (res.success && res.data) {
        toast.success(`Welcome! ${data.collegeName} has been registered.`);
        if (res.data.accessToken) {
          setAccessToken(res.data.accessToken);
        }
        if (setAuthSession && res.data.user) {
          setAuthSession(res.data.accessToken, res.data.user);
        }
        router.push('/dashboard');
      }
    } catch (err: any) {
      const msg = err.message || 'Registration failed. Please check your details.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 dark:bg-slate-950">
      <div className="mx-auto max-w-2xl">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="text-left">
              <span className="block text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                SmartAttend
              </span>
              <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Institutional Onboarding
              </span>
            </div>
          </Link>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Register Your College or University
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Set up isolated campus tenancy, configure biometric verification policies, and start conducting automated face attendance in minutes.
          </p>
        </div>

        {/* Registration Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          {errorMessage && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/70 dark:text-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Step 1: Institutional Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
                <Building2 className="h-4 w-4 text-indigo-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  1. Institution Details
                </h2>
              </div>

              <Input
                label="Full College / University Name"
                placeholder="e.g. Apex Institute of Engineering & Technology"
                error={errors.collegeName?.message}
                {...register('collegeName')}
                required
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Tenant Code (Unique Short ID)"
                  placeholder="e.g. APEX, MIT, IITD"
                  helperText="Used as the tenant code for student and class IDs"
                  error={errors.tenantCode?.message}
                  {...register('tenantCode')}
                  required
                />

                <Input
                  label="Campus Web Domain"
                  placeholder="e.g. apex.edu"
                  helperText="Optional institutional web domain"
                  error={errors.domain?.message}
                  {...register('domain')}
                />
              </div>

              <Input
                label="Official Contact Email"
                type="email"
                placeholder="e.g. registrar@apex.edu"
                error={errors.contactEmail?.message}
                {...register('contactEmail')}
              />
            </div>

            {/* Step 2: Primary Administrator */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  2. Primary College Administrator Account
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Admin First Name"
                  placeholder="e.g. Rajesh"
                  error={errors.adminFirstName?.message}
                  {...register('adminFirstName')}
                  required
                />

                <Input
                  label="Admin Last Name"
                  placeholder="e.g. Sharma"
                  error={errors.adminLastName?.message}
                  {...register('adminLastName')}
                  required
                />
              </div>

              <Input
                label="Administrator Login Email"
                type="email"
                placeholder="e.g. admin@apex.edu"
                error={errors.adminEmail?.message}
                {...register('adminEmail')}
                required
              />

              <Input
                label="Create Master Password"
                type="password"
                placeholder="Minimum 8 characters"
                error={errors.password?.message}
                {...register('password')}
                required
              />
            </div>

            {/* Guarantees Box */}
            <div className="rounded-xl bg-indigo-50/60 p-4 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-950 dark:text-indigo-200">
                  <p className="font-semibold">Automatic Institutional Setup</p>
                  <p className="mt-0.5 text-indigo-800 dark:text-indigo-300">
                    Registration automatically establishes tenant data isolation, default 30-minute attendance windows, and 75% accredited compliance tracking.
                  </p>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full gap-2 font-semibold"
              isLoading={isSubmitting}
            >
              Complete College Registration
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-4 text-center text-xs text-slate-500 dark:border-slate-800">
            Already have an active account?{' '}
            <Link href="/login" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
              Sign In Here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
