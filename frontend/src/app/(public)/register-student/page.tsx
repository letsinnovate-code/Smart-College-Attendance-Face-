'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  GraduationCap,
  Camera,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { apiClient, setAccessToken } from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';
import { College, ApiResponse } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const registerStudentSchema = z.object({
  collegeId: z.string().min(1, 'Please select your college/university'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  studentId: z.string().min(1, 'Roll Number / Student ID is required').max(50),
  email: z.string().email('Please enter a valid student email address'),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

type RegisterStudentFormData = z.infer<typeof registerStudentSchema>;

export default function RegisterStudentPage() {
  const router = useRouter();
  const { login: setAuthSession } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch list of active colleges
  const { data: collegesData, isLoading: isLoadingColleges } = useQuery<ApiResponse<College[]>>({
    queryKey: ['public-colleges-list'],
    queryFn: () => apiClient.get('/auth/colleges'),
  });

  const colleges = collegesData?.data || [];

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterStudentFormData>({
    resolver: zodResolver(registerStudentSchema),
    defaultValues: {
      collegeId: '',
      firstName: '',
      lastName: '',
      studentId: '',
      email: '',
      phone: '',
      password: '',
    },
  });

  const onSubmit = async (data: RegisterStudentFormData) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res: any = await apiClient.post('/auth/register-student', data);

      if (res.success && res.data) {
        toast.success(`Welcome ${data.firstName}! Please enroll your face to begin taking attendance.`);
        if (res.data.accessToken) {
          setAccessToken(res.data.accessToken);
        }
        if (setAuthSession && res.data.user) {
          setAuthSession(res.data.accessToken, res.data.user);
        }
        // Redirect directly to Face Biometrics enrollment studio
        router.push('/student/face-enrollment');
      }
    } catch (err: any) {
      const msg = err.message || 'Enrollment failed. Please check your information.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 dark:bg-slate-950">
      <div className="mx-auto max-w-xl">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div className="text-left">
              <span className="block text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                SmartAttend
              </span>
              <span className="block text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Student Self-Enrollment
              </span>
            </div>
          </Link>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Student Account Registration
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Select your college, register your academic credentials, and proceed to the biometric camera studio.
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          {errorMessage && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/70 dark:text-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* College Selection */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Select Your College / University <span className="text-rose-500">*</span>
              </label>
              <select
                {...register('collegeId')}
                disabled={isLoadingColleges}
                className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:bg-slate-100"
              >
                <option value="">
                  {isLoadingColleges ? 'Loading registered colleges...' : 'Choose your institution...'}
                </option>
                {colleges.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.tenantCode})
                  </option>
                ))}
              </select>
              {errors.collegeId && (
                <p className="text-[11px] text-rose-500">{errors.collegeId.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="First Name"
                placeholder="e.g. Rahul"
                error={errors.firstName?.message}
                {...register('firstName')}
                required
              />

              <Input
                label="Last Name"
                placeholder="e.g. Mehta"
                error={errors.lastName?.message}
                {...register('lastName')}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Roll Number / Student ID"
                placeholder="e.g. 01, CS24-102"
                helperText="Assigned by your department or college"
                error={errors.studentId?.message}
                {...register('studentId')}
                required
              />

              <Input
                label="Phone Number"
                type="tel"
                placeholder="e.g. +91 9876543210"
                error={errors.phone?.message}
                {...register('phone')}
              />
            </div>

            <Input
              label="Student Email Address"
              type="email"
              placeholder="e.g. rahul.mehta@apex.edu"
              error={errors.email?.message}
              {...register('email')}
              required
            />

            <Input
              label="Account Password"
              type="password"
              placeholder="Minimum 8 characters"
              error={errors.password?.message}
              {...register('password')}
              required
            />

            {/* Next Step Banner */}
            <div className="rounded-xl bg-emerald-50 p-4 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40">
              <div className="flex items-start gap-3">
                <Camera className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-950 dark:text-emerald-200">
                  <p className="font-semibold">Immediate Next Step: Biometric Enrollment</p>
                  <p className="mt-0.5 text-emerald-800 dark:text-emerald-300">
                    After registration, you will be taken directly to the webcam studio to record your face template with anti-spoofing verification.
                  </p>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full gap-2 font-semibold bg-emerald-600 hover:bg-emerald-700"
              isLoading={isSubmitting}
            >
              Register & Proceed to Camera
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-4 text-center text-xs text-slate-500 dark:border-slate-800">
            Already registered?{' '}
            <Link href="/login" className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400">
              Sign In to Your Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
