'use client';

import React, { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  CalendarDays,
  Plus,
  Play,
  Square,
  XCircle,
  Users,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { apiClient } from '@/lib/api-client';
import {
  ApiResponse,
  AttendanceSession,
  AttendanceRecord,
  AcademicClass,
  Subject,
  SessionState,
} from '@/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { SessionStateBadge, AttendanceStatusBadge } from '@/components/ui/badge';
import { Dialog, ConfirmDialog } from '@/components/ui/dialog';
import { TableSkeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';

const sessionFormSchema = z.object({
  classId: z.string().min(1, 'Academic Class is required'),
  subjectId: z.string().min(1, 'Subject curriculum is required'),
  sessionDate: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  attendanceWindowMinutes: z.coerce.number().min(1).max(180).default(30),
  topic: z.string().optional(),
  notes: z.string().optional(),
});

type SessionFormValues = z.infer<typeof sessionFormSchema>;

function AttendanceSessionsContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const [createDialogOpen, setCreateDialogOpen] = useState(searchParams.get('create') === '1');
  const [selectedSessionForRoster, setSelectedSessionForRoster] = useState<AttendanceSession | null>(null);
  const [sessionToClose, setSessionToClose] = useState<AttendanceSession | null>(null);
  const [sessionToCancel, setSessionToCancel] = useState<AttendanceSession | null>(null);
  const [stateFilter, setStateFilter] = useState<string>('all');

  // 1. Fetch sessions
  const { data: sessionsData, isLoading: loadingSessions } = useQuery({
    queryKey: ['attendance-sessions', stateFilter],
    queryFn: () => {
      const q = stateFilter === 'all' ? '' : `?state=${stateFilter}`;
      return apiClient<ApiResponse<AttendanceSession[]>>(`/attendance/sessions${q}`);
    },
  });

  // 2. Fetch classes & subjects for creation form
  const { data: classesData } = useQuery({
    queryKey: ['academic-classes-list'],
    queryFn: () => apiClient<ApiResponse<AcademicClass[]>>('/academic/classes'),
    enabled: createDialogOpen,
  });

  const { data: subjectsData } = useQuery({
    queryKey: ['academic-subjects-list'],
    queryFn: () => apiClient<ApiResponse<Subject[]>>('/academic/subjects'),
    enabled: createDialogOpen,
  });

  // 3. Roster records query
  const { data: recordsData, isLoading: loadingRoster } = useQuery({
    queryKey: ['session-records', selectedSessionForRoster?._id],
    queryFn: () =>
      apiClient<ApiResponse<AttendanceRecord[]>>(
        `/attendance/sessions/${selectedSessionForRoster?._id}/records`,
      ),
    enabled: !!selectedSessionForRoster,
  });

  const sessions = Array.isArray(sessionsData?.data) ? sessionsData.data : [];
  const classes = Array.isArray(classesData?.data) ? classesData.data : [];
  const subjects = Array.isArray(subjectsData?.data) ? subjectsData.data : [];
  const rosterRecords = Array.isArray(recordsData?.data) ? recordsData.data : [];

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      attendanceWindowMinutes: 30,
      sessionDate: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '10:00',
    },
  });

  // Create Session Mutation
  const createMutation = useMutation({
    mutationFn: async (data: SessionFormValues) => {
      const startDateTime = new Date(`${data.sessionDate}T${data.startTime}:00`).toISOString();
      const endDateTime = new Date(`${data.sessionDate}T${data.endTime}:00`).toISOString();

      return apiClient<ApiResponse<AttendanceSession>>('/attendance/sessions', {
        method: 'POST',
        body: {
          classId: data.classId,
          subjectId: data.subjectId,
          sessionDate: new Date(data.sessionDate).toISOString(),
          scheduledStartTime: startDateTime,
          scheduledEndTime: endDateTime,
          attendanceWindowMinutes: Number(data.attendanceWindowMinutes),
          topic: data.topic,
          notes: data.notes,
        },
      });
    },
    onSuccess: () => {
      toast.success('Attendance session created in draft mode');
      setCreateDialogOpen(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ['attendance-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['daily-overview'] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to schedule attendance session');
    },
  });

  // Open Session Mutation
  const openMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return apiClient<ApiResponse<AttendanceSession>>(`/attendance/sessions/${sessionId}/open`, {
        method: 'PATCH',
      });
    },
    onSuccess: () => {
      toast.success('Attendance session is now LIVE and accepting biometric submissions');
      queryClient.invalidateQueries({ queryKey: ['attendance-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['daily-overview'] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to open session');
    },
  });

  // Close Session Mutation
  const closeMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return apiClient<ApiResponse<AttendanceSession>>(`/attendance/sessions/${sessionId}/close`, {
        method: 'PATCH',
      });
    },
    onSuccess: () => {
      toast.success('Attendance session closed successfully');
      setSessionToClose(null);
      queryClient.invalidateQueries({ queryKey: ['attendance-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['daily-overview'] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to close session');
    },
  });

  // Cancel Session Mutation
  const cancelMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return apiClient<ApiResponse<AttendanceSession>>(`/attendance/sessions/${sessionId}/cancel`, {
        method: 'PATCH',
      });
    },
    onSuccess: () => {
      toast.success('Session marked as cancelled');
      setSessionToCancel(null);
      queryClient.invalidateQueries({ queryKey: ['attendance-sessions'] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel session');
    },
  });

  const canManage = user?.role === 'faculty' || user?.role === 'collegeAdmin';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Sessions"
        description="Schedule class sessions, open biometric verification windows, and review student rosters"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Sessions' },
        ]}
        actions={
          canManage && (
            <Button size="sm" variant="primary" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Schedule New Session
            </Button>
          )
        }
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base">All Attendance Sessions</CardTitle>
              <CardDescription>Filter sessions by lifecycle state</CardDescription>
            </div>
            {/* Filter pills */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs dark:bg-slate-800">
              <span className="px-2 text-slate-400 font-medium">State:</span>
              {['all', 'draft', 'open', 'closed', 'cancelled'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStateFilter(st)}
                  className={`px-2.5 py-1 rounded-md capitalize font-medium transition-colors ${
                    stateFilter === st
                      ? 'bg-white text-slate-900 shadow-xs font-semibold dark:bg-slate-900 dark:text-slate-100'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loadingSessions ? (
            <TableSkeleton rows={5} cols={6} />
          ) : sessions.length === 0 ? (
            <div className="py-10 text-center">
              <CalendarDays className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No attendance sessions found in this view.</p>
              {canManage && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  Schedule First Session
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class & Section</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Present</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => {
                  const classObj = typeof s.classId === 'object' ? s.classId : null;
                  const subjectObj = typeof s.subjectId === 'object' ? s.subjectId : null;

                  return (
                    <TableRow key={s._id}>
                      <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                        Section {classObj?.section || '—'}
                        <span className="block text-[11px] font-normal text-slate-500">
                          Sem {classObj?.semester || '—'} ({classObj?.academicYear || '—'})
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {subjectObj?.name || 'Subject'}
                        </span>
                        {subjectObj?.code && (
                          <span className="ml-1.5 text-[10px] font-mono text-slate-400">
                            {subjectObj.code}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-300">
                        {formatDateTime(s.sessionDate)}
                        <span className="block text-[11px] text-slate-400">
                          Window: {s.attendanceWindowMinutes} min
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-400 max-w-[160px] truncate">
                        {s.topic || '—'}
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-emerald-600">{s.presentCount ?? 0}</span>
                        {s.absentCount !== undefined && s.absentCount > 0 && (
                          <span className="text-[11px] text-slate-400 ml-1">/ {s.absentCount} abs</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <SessionStateBadge state={s.state} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Inspect Roster Button */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedSessionForRoster(s)}
                            title="Inspect Student Roster"
                          >
                            <Users className="h-3.5 w-3.5 mr-1" /> Roster
                          </Button>

                          {/* Open Session Action */}
                          {canManage && s.state === 'draft' && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => openMutation.mutate(s._id)}
                              isLoading={openMutation.isPending}
                            >
                              <Play className="h-3 w-3 mr-1" /> Open
                            </Button>
                          )}

                          {/* Close Session Action */}
                          {canManage && s.state === 'open' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-amber-600 hover:text-amber-700 border-amber-300"
                              onClick={() => setSessionToClose(s)}
                            >
                              <Square className="h-3 w-3 mr-1" /> Close
                            </Button>
                          )}

                          {/* Cancel Action */}
                          {canManage && (s.state === 'draft' || s.state === 'open') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-rose-500 hover:text-rose-700"
                              onClick={() => setSessionToCancel(s)}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Creation Modal Dialog */}
      <Dialog
        isOpen={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        title="Schedule Attendance Session"
        description="Configure academic class section, subject curriculum, and biometric verification window"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Academic Class / Section <span className="text-rose-500">*</span>
              </label>
              <select
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                {...register('classId')}
              >
                <option value="">Select an enrolled class</option>
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>
                    Section {c.section} (Sem {c.semester}, {c.academicYear})
                  </option>
                ))}
              </select>
              {errors.classId && <p className="text-xs text-rose-600 mt-1">{errors.classId.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Subject Curriculum <span className="text-rose-500">*</span>
              </label>
              <select
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                {...register('subjectId')}
              >
                <option value="">Select subject</option>
                {subjects.map((sub) => (
                  <option key={sub._id} value={sub._id}>
                    {sub.name} ({sub.code})
                  </option>
                ))}
              </select>
              {errors.subjectId && <p className="text-xs text-rose-600 mt-1">{errors.subjectId.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Session Date"
              type="date"
              required
              error={errors.sessionDate?.message}
              {...register('sessionDate')}
            />

            <Input
              label="Start Time"
              type="time"
              required
              error={errors.startTime?.message}
              {...register('startTime')}
            />

            <Input
              label="End Time"
              type="time"
              required
              error={errors.endTime?.message}
              {...register('endTime')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Attendance Window (Minutes)"
              type="number"
              min={1}
              max={180}
              hint="How long biometric submission remains open after opening"
              error={errors.attendanceWindowMinutes?.message}
              {...register('attendanceWindowMinutes')}
            />

            <Input
              label="Lecture Topic"
              type="text"
              placeholder="e.g. Distributed Consensus & Raft"
              error={errors.topic?.message}
              {...register('topic')}
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={createMutation.isPending || isSubmitting}>
              Schedule Session
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Roster & Attendance Records Drawer/Modal */}
      <Dialog
        isOpen={!!selectedSessionForRoster}
        onClose={() => setSelectedSessionForRoster(null)}
        title="Session Attendance Roster"
        description={
          selectedSessionForRoster
            ? `Verified biometric roster for ${typeof selectedSessionForRoster.subjectId === 'object' ? selectedSessionForRoster.subjectId.name : 'Class'} on ${formatDateTime(selectedSessionForRoster.sessionDate)}`
            : ''
        }
        maxWidth="xl"
      >
        <div className="space-y-4">
          {loadingRoster ? (
            <TableSkeleton rows={4} cols={4} />
          ) : rosterRecords.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No attendance records recorded for this session yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Marked At</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rosterRecords.map((r) => {
                  const studentObj = typeof r.studentId === 'object' ? r.studentId : null;
                  return (
                    <TableRow key={r._id}>
                      <TableCell>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {studentObj?.fullName || studentObj?.email || 'Student'}
                        </span>
                        {studentObj?.profile?.studentId && (
                          <span className="block text-[11px] font-mono text-slate-400">
                            ID: {studentObj.profile.studentId}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                        {formatDateTime(r.markedAt)}
                      </TableCell>
                      <TableCell className="capitalize text-xs text-slate-600 dark:text-slate-400">
                        {r.verificationMethod}
                      </TableCell>
                      <TableCell className="text-right">
                        <AttendanceStatusBadge status={r.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedSessionForRoster(null)}>
              Close Roster
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Confirmation to Close Session */}
      <ConfirmDialog
        isOpen={!!sessionToClose}
        onClose={() => setSessionToClose(null)}
        onConfirm={() => sessionToClose && closeMutation.mutate(sessionToClose._id)}
        title="Close Attendance Window?"
        description="Closing the session immediately terminates the biometric submission window. Subsequent face verification attempts will be rejected."
        confirmText="Close Session"
        isLoading={closeMutation.isPending}
      />

      {/* Confirmation to Cancel Session */}
      <ConfirmDialog
        isOpen={!!sessionToCancel}
        onClose={() => setSessionToCancel(null)}
        onConfirm={() => sessionToCancel && cancelMutation.mutate(sessionToCancel._id)}
        title="Cancel Attendance Session?"
        description="Are you sure you want to cancel this scheduled session? This action is recorded in the immutable audit trail."
        confirmText="Cancel Session"
        isDestructive
        isLoading={cancelMutation.isPending}
      />
    </div>
  );
}

export default function AttendanceSessionsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs">Loading sessions...</div>}>
      <AttendanceSessionsContent />
    </Suspense>
  );
}
