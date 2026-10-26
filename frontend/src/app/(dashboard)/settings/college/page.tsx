'use client';

import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Settings,
  Clock,
  ShieldCheck,
  Camera,
  Percent,
  Globe,
  Save,
  AlertCircle,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';
import { College, ApiResponse } from '@/types';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const settingsSchema = z.object({
  attendanceWindowMinutes: z.coerce.number().int().min(5).max(180),
  latenessWindowMinutes: z.coerce.number().int().min(1).max(60),
  minAttendancePercentage: z.coerce.number().min(0).max(100),
  allowFaceAttendance: z.boolean(),
  allowManualAttendance: z.boolean(),
  requireBiometricConsent: z.boolean(),
  timezone: z.string().min(1, 'Timezone is required'),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function CollegeSettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const collegeId = typeof user?.collegeId === 'object' ? user.collegeId._id : user?.collegeId;

  // College details query
  const { data, isLoading, error } = useQuery<ApiResponse<College>>({
    queryKey: ['college-settings', collegeId],
    queryFn: () => apiClient.get(`/colleges/${collegeId}`),
    enabled: !!collegeId,
  });

  const saveMutation = useMutation({
    mutationFn: (formData: SettingsFormData) =>
      apiClient.put(`/colleges/${collegeId}`, { settings: formData }),
    onSuccess: () => {
      toast.success('Institutional attendance policies saved');
      queryClient.invalidateQueries({ queryKey: ['college-settings', collegeId] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update settings');
    },
  });

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      attendanceWindowMinutes: 30,
      latenessWindowMinutes: 10,
      minAttendancePercentage: 75,
      allowFaceAttendance: true,
      allowManualAttendance: true,
      requireBiometricConsent: true,
      timezone: 'Asia/Kolkata',
    },
  });

  useEffect(() => {
    if (data?.data?.settings) {
      const s = data.data.settings;
      form.reset({
        attendanceWindowMinutes: s.attendanceWindowMinutes ?? 30,
        latenessWindowMinutes: s.latenessWindowMinutes ?? 10,
        minAttendancePercentage: s.minAttendancePercentage ?? 75,
        allowFaceAttendance: s.allowFaceAttendance ?? true,
        allowManualAttendance: s.allowManualAttendance ?? true,
        requireBiometricConsent: s.requireBiometricConsent ?? true,
        timezone: s.timezone || 'Asia/Kolkata',
      });
    }
  }, [data, form]);

  const onSubmit = (formData: SettingsFormData) => {
    saveMutation.mutate(formData);
  };

  const college = data?.data;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="College Attendance Policies" description="Loading configuration..." />
        <div className="h-64 rounded-xl border border-slate-200 bg-white p-6 animate-pulse dark:border-slate-800 dark:bg-slate-900" />
      </div>
    );
  }

  if (error || !college) {
    return (
      <div className="space-y-6">
        <PageHeader title="College Attendance Policies" description="Manage institutional compliance rules" />
        <Card className="p-8 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
          <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">Failed to load college settings</p>
          <p className="text-xs text-slate-500">{(error as any)?.message || 'Tenant configuration not accessible'}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title={`${college.name} — Attendance Policies`}
        description={`Tenant Code: ${college.tenantCode} • Configure campus-wide time limits, compliance thresholds, and biometric enforcement.`}
      />

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Time Windows & Thresholds */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-600" />
              Session Lifecycle & Lateness Thresholds
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Attendance Window (Minutes)"
                type="number"
                min="5"
                max="180"
                helperText="How long the biometric verification window remains open after session initiation"
                error={form.formState.errors.attendanceWindowMinutes?.message}
                {...form.register('attendanceWindowMinutes')}
                required
              />

              <Input
                label="Lateness Grace Period (Minutes)"
                type="number"
                min="1"
                max="60"
                helperText="Minutes after session start before student is marked 'Late' instead of 'Present'"
                error={form.formState.errors.latenessWindowMinutes?.message}
                {...form.register('latenessWindowMinutes')}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Minimum Attendance Compliance (%)"
                type="number"
                min="0"
                max="100"
                helperText="Academic threshold required for semester exam eligibility (standard: 75%)"
                error={form.formState.errors.minAttendancePercentage?.message}
                {...form.register('minAttendancePercentage')}
                required
              />

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Campus Timezone <span className="text-rose-500">*</span>
                </label>
                <select
                  {...form.register('timezone')}
                  className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST +05:30)</option>
                  <option value="UTC">UTC (Universal Coordinated Time)</option>
                  <option value="America/New_York">America/New_York (EST/EDT)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST +04:00)</option>
                  <option value="Asia/Singapore">Asia/Singapore (SGT +08:00)</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Biometrics & Privacy Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Biometric Verification & Consent Enforcement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-3.5 dark:border-slate-800">
              <input
                type="checkbox"
                id="allowFaceAttendance"
                {...form.register('allowFaceAttendance')}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <label htmlFor="allowFaceAttendance" className="text-xs font-semibold text-slate-900 dark:text-white cursor-pointer">
                  Enable Face Recognition Biometrics
                </label>
                <p className="text-[11px] text-slate-500">
                  Allow students to verify attendance in real-time via classroom webcam and 3D liveness detection.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-3.5 dark:border-slate-800">
              <input
                type="checkbox"
                id="requireBiometricConsent"
                {...form.register('requireBiometricConsent')}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <label htmlFor="requireBiometricConsent" className="text-xs font-semibold text-slate-900 dark:text-white cursor-pointer">
                  Mandate Affirmative Biometric Consent
                </label>
                <p className="text-[11px] text-slate-500">
                  Enforce strict institutional privacy policy consent prior to capturing and storing biometric templates.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-3.5 dark:border-slate-800">
              <input
                type="checkbox"
                id="allowManualAttendance"
                {...form.register('allowManualAttendance')}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <label htmlFor="allowManualAttendance" className="text-xs font-semibold text-slate-900 dark:text-white cursor-pointer">
                  Allow Manual Faculty Overrides
                </label>
                <p className="text-[11px] text-slate-500">
                  Permit professors to manually mark attendance or adjust statuses in case of physical device absence.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="submit" isLoading={saveMutation.isPending} className="gap-2">
            <Save className="h-4 w-4" />
            Save Institutional Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
