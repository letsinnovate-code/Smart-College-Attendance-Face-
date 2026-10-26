'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';
import {
  AttendanceCorrectionRequest,
  AttendanceStatus,
  ApiPaginatedResponse,
} from '@/types';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { AttendanceStatusBadge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

// Form Schemas
const reviewSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  comment: z.string().min(2, 'Please provide review notes/comment'),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

const createCorrectionSchema = z.object({
  attendanceRecordId: z.string().min(1, 'Attendance Record ID is required'),
  requestedStatus: z.enum(['present', 'late', 'excused']),
  reason: z.string().min(5, 'Reason must be at least 5 characters').max(1000),
});

type CreateCorrectionFormData = z.infer<typeof createCorrectionSchema>;

export default function AttendanceCorrectionsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [selectedCorrection, setSelectedCorrection] = useState<AttendanceCorrectionRequest | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const canReview = user?.role === 'collegeAdmin' || user?.role === 'faculty' || user?.role === 'superAdmin';

  // Fetch correction requests
  const { data, isLoading, error, refetch } = useQuery<ApiPaginatedResponse<AttendanceCorrectionRequest>>({
    queryKey: ['attendance-corrections', statusFilter, page],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '20');
      if (statusFilter) params.set('status', statusFilter);
      return apiClient.get(`/attendance/corrections?${params.toString()}`);
    },
    enabled: canReview, // Backend requires at least faculty role for GET /attendance/corrections
  });

  // Review Mutation
  const reviewMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReviewFormData }) =>
      apiClient.patch(`/attendance/corrections/${id}/review`, data),
    onSuccess: () => {
      toast.success('Correction request reviewed successfully');
      setIsReviewOpen(false);
      setSelectedCorrection(null);
      queryClient.invalidateQueries({ queryKey: ['attendance-corrections'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to review correction request');
    },
  });

  // Create Correction Mutation (student or faculty/admin on behalf)
  const createMutation = useMutation({
    mutationFn: (data: CreateCorrectionFormData) =>
      apiClient.post('/attendance/corrections', data),
    onSuccess: () => {
      toast.success('Correction request submitted for review');
      setIsCreateOpen(false);
      createForm.reset();
      queryClient.invalidateQueries({ queryKey: ['attendance-corrections'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to submit correction request');
    },
  });

  // Review Form
  const reviewForm = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { decision: 'approved', comment: '' },
  });

  // Create Form
  const createForm = useForm<CreateCorrectionFormData>({
    resolver: zodResolver(createCorrectionSchema),
    defaultValues: {
      attendanceRecordId: '',
      requestedStatus: 'present',
      reason: '',
    },
  });

  const handleOpenReview = (correction: AttendanceCorrectionRequest) => {
    setSelectedCorrection(correction);
    reviewForm.reset({ decision: 'approved', comment: '' });
    setIsReviewOpen(true);
  };

  const onReviewSubmit = (formData: ReviewFormData) => {
    if (!selectedCorrection) return;
    reviewMutation.mutate({ id: selectedCorrection._id, data: formData });
  };

  const onCreateSubmit = (formData: CreateCorrectionFormData) => {
    createMutation.mutate(formData);
  };

  const corrections = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Corrections & Disputes"
        description="Formal audit workflow for reviewing, approving, or correcting discrepancy requests."
        action={
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            File Correction
          </Button>
        }
      />

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
          {[
            { label: 'All Requests', value: '' },
            { label: 'Pending Review', value: 'pending' },
            { label: 'Approved', value: 'approved' },
            { label: 'Rejected', value: 'rejected' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setPage(1);
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === tab.value
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-500">
          Showing {corrections.length} request{corrections.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* Main Data Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : error ? (
            <div className="p-8 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">Failed to load correction requests</p>
              <p className="text-xs text-slate-500">{(error as any)?.message || 'An error occurred'}</p>
              <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-4">
                Retry
              </Button>
            </div>
          ) : corrections.length === 0 ? (
            <EmptyState
              icon={FileCheck2}
              title="No correction requests found"
              description={statusFilter ? `No requests matching the "${statusFilter}" filter.` : 'No attendance dispute or correction requests have been filed yet.'}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Original</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {corrections.map((req) => {
                  const student = typeof req.studentId === 'object' ? req.studentId : null;
                  const studentName = student
                    ? `${student.profile?.firstName || ''} ${student.profile?.lastName || ''}`.trim() || student.email
                    : 'Student';
                  const studentCode = student?.profile?.studentId || '';

                  return (
                    <TableRow key={req._id}>
                      <TableCell>
                        <div className="font-medium text-slate-900 dark:text-slate-100">{studentName}</div>
                        {studentCode && (
                          <div className="text-xs text-slate-500 dark:text-slate-400">ID: {studentCode}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <AttendanceStatusBadge status={req.originalStatus} />
                      </TableCell>
                      <TableCell>
                        <AttendanceStatusBadge status={req.requestedStatus} />
                      </TableCell>
                      <TableCell className="max-w-xs truncate" title={req.reason}>
                        <span className="text-xs text-slate-700 dark:text-slate-300">{req.reason}</span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {formatDate(req.createdAt)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            req.reviewStatus === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                              : req.reviewStatus === 'rejected'
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300'
                          }`}
                        >
                          {req.reviewStatus === 'approved' && <CheckCircle2 className="h-3 w-3" />}
                          {req.reviewStatus === 'rejected' && <XCircle className="h-3 w-3" />}
                          {req.reviewStatus === 'pending' && <Clock className="h-3 w-3" />}
                          <span className="capitalize">{req.reviewStatus}</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {canReview && req.reviewStatus === 'pending' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenReview(req)}
                            className="gap-1.5 text-xs"
                          >
                            <FileCheck2 className="h-3.5 w-3.5 text-indigo-600" />
                            Review
                          </Button>
                        ) : req.reviewComment ? (
                          <span className="text-xs text-slate-400 italic" title={req.reviewComment}>
                            Notes provided
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={isReviewOpen} onClose={() => setIsReviewOpen(false)}>
        <DialogHeader>
          <DialogTitle>Review Attendance Correction</DialogTitle>
        </DialogHeader>

        {selectedCorrection && (
          <form onSubmit={reviewForm.handleSubmit(onReviewSubmit)} className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3.5 dark:bg-slate-800/60 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Original Status:</span>
                <AttendanceStatusBadge status={selectedCorrection.originalStatus} />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Requested Status:</span>
                <AttendanceStatusBadge status={selectedCorrection.requestedStatus} />
              </div>
              <div className="text-xs">
                <span className="text-slate-500">Student Reason:</span>
                <p className="mt-1 rounded bg-white p-2 text-slate-800 dark:bg-slate-900 dark:text-slate-200 border border-slate-200 dark:border-slate-800">
                  {selectedCorrection.reason}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Decision <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => reviewForm.setValue('decision', 'approved')}
                  className={`flex items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-colors ${
                    reviewForm.watch('decision') === 'approved'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve Correction
                </button>
                <button
                  type="button"
                  onClick={() => reviewForm.setValue('decision', 'rejected')}
                  className={`flex items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-colors ${
                    reviewForm.watch('decision') === 'rejected'
                      ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                      : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
                  }`}
                >
                  <XCircle className="h-4 w-4" />
                  Reject Request
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Review Notes / Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                {...reviewForm.register('comment')}
                rows={3}
                placeholder="Explain the approval justification or grounds for rejection..."
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              {reviewForm.formState.errors.comment && (
                <p className="text-[11px] text-rose-500">{reviewForm.formState.errors.comment.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsReviewOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={reviewMutation.isPending}>
                Submit Decision
              </Button>
            </DialogFooter>
          </form>
        )}
      </Dialog>

      {/* Create Correction Dialog */}
      <Dialog open={isCreateOpen} onClose={() => setIsCreateOpen(false)}>
        <DialogHeader>
          <DialogTitle>File Attendance Correction Request</DialogTitle>
        </DialogHeader>

        <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
          <Input
            label="Attendance Record ID"
            placeholder="e.g. 64b8f... (from session or history record)"
            error={createForm.formState.errors.attendanceRecordId?.message}
            {...createForm.register('attendanceRecordId')}
            required
          />

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Requested Status <span className="text-rose-500">*</span>
            </label>
            <select
              {...createForm.register('requestedStatus')}
              className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="present">Present (Present on time)</option>
              <option value="late">Late (Attended with delayed entry)</option>
              <option value="excused">Excused (Medical or official leave)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Justification & Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              {...createForm.register('reason')}
              rows={3}
              placeholder="Provide a detailed explanation for this attendance correction..."
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            {createForm.formState.errors.reason && (
              <p className="text-[11px] text-rose-500">{createForm.formState.errors.reason.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
