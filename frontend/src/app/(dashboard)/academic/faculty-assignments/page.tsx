'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  UserCheck,
  Plus,
  Trash2,
  AlertCircle,
  GraduationCap,
  BookOpen,
  Calendar,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import {
  FacultyAssignment,
  AcademicClass,
  Subject,
  User,
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
import { ConfirmDialog } from '@/components/ui/dialog';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate } from '@/lib/utils';

const assignSchema = z.object({
  facultyId: z.string().min(1, 'Faculty member is required'),
  classId: z.string().min(1, 'Class section is required'),
  subjectId: z.string().min(1, 'Subject is required'),
});

type AssignFormData = z.infer<typeof assignSchema>;

export default function FacultyAssignmentsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<string | null>(null);

  // Faculty Assignments Query
  const { data: assignmentsData, isLoading, error, refetch } = useQuery<ApiPaginatedResponse<FacultyAssignment>>({
    queryKey: ['academic-faculty-assignments'],
    queryFn: () => apiClient.get('/academic/faculty-assignments?limit=100'),
  });

  // Faculty Users Query
  const { data: facultyUsersData } = useQuery<ApiPaginatedResponse<User>>({
    queryKey: ['users-faculty-list'],
    queryFn: () => apiClient.get('/users?role=faculty&limit=100'),
  });

  // Classes Query
  const { data: classesData } = useQuery<ApiPaginatedResponse<AcademicClass>>({
    queryKey: ['academic-classes-list'],
    queryFn: () => apiClient.get('/academic/classes?limit=100'),
  });

  // Subjects Query
  const { data: subjectsData } = useQuery<ApiPaginatedResponse<Subject>>({
    queryKey: ['academic-subjects-list'],
    queryFn: () => apiClient.get('/academic/subjects?limit=100'),
  });

  const facultyList = facultyUsersData?.data || [];
  const classesList = classesData?.data || [];
  const subjectsList = subjectsData?.data || [];

  const createMutation = useMutation({
    mutationFn: (formData: AssignFormData) => apiClient.post('/academic/faculty-assignments', formData),
    onSuccess: () => {
      toast.success('Faculty member assigned to class successfully');
      setIsModalOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['academic-faculty-assignments'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to assign faculty member');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/academic/faculty-assignments/${id}`),
    onSuccess: () => {
      toast.success('Faculty assignment deactivated');
      setAssignmentToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['academic-faculty-assignments'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to deactivate assignment');
    },
  });

  const form = useForm<AssignFormData>({
    resolver: zodResolver(assignSchema),
    defaultValues: { facultyId: '', classId: '', subjectId: '' },
  });

  const handleOpenCreate = () => {
    form.reset({
      facultyId: facultyList[0]?._id || '',
      classId: classesList[0]?._id || '',
      subjectId: subjectsList[0]?._id || '',
    });
    setIsModalOpen(true);
  };

  const onSubmit = (formData: AssignFormData) => {
    createMutation.mutate(formData);
  };

  const assignments = assignmentsData?.data || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faculty Course & Class Assignments"
        description="Authorize faculty members to teach subjects and conduct biometric attendance sessions for assigned classes."
        action={
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Assign Faculty
          </Button>
        }
      />

      {/* Main Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : error ? (
            <div className="p-8 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">Failed to load faculty assignments</p>
              <p className="text-xs text-slate-500">{(error as any)?.message || 'An error occurred'}</p>
              <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-4">
                Retry
              </Button>
            </div>
          ) : assignments.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title="No faculty assignments registered"
              description="Assign teaching faculty to academic classes and subjects to allow them to create attendance sessions."
              action={
                <Button onClick={handleOpenCreate} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Assign Faculty
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Faculty Member</TableHead>
                  <TableHead>Class Section</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Assigned Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => {
                  const faculty = typeof assignment.facultyId === 'object' ? assignment.facultyId : null;
                  const cls = typeof assignment.classId === 'object' ? assignment.classId : null;
                  const subject = typeof assignment.subjectId === 'object' ? assignment.subjectId : null;

                  const facultyName = faculty
                    ? `${faculty.profile?.firstName || ''} ${faculty.profile?.lastName || ''}`.trim() || faculty.email
                    : 'Faculty Member';

                  return (
                    <TableRow key={assignment._id}>
                      <TableCell>
                        <div className="font-medium text-slate-900 dark:text-slate-100">{facultyName}</div>
                        <div className="text-xs text-slate-500">{faculty?.email}</div>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {cls ? `Section ${cls.section} (Sem ${cls.semester})` : 'Class'}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {subject?.code || 'SUB'}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-300">
                          {subject?.name || 'Subject'}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {formatDate(assignment.createdAt)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                            assignment.isActive
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {assignment.isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {assignment.isActive && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setAssignmentToDelete(assignment._id)}
                            className="h-8 w-8 p-0 hover:bg-rose-50 hover:text-rose-600"
                            title="Deactivate assignment"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-slate-500" />
                          </Button>
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

      {/* Assign Modal */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <DialogHeader>
          <DialogTitle>Assign Faculty to Class & Subject</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Faculty Member <span className="text-rose-500">*</span>
            </label>
            <select
              {...form.register('facultyId')}
              className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">Select faculty member...</option>
              {facultyList.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.profile?.firstName} {f.profile?.lastName} ({f.email})
                </option>
              ))}
            </select>
            {form.formState.errors.facultyId && (
              <p className="text-[11px] text-rose-500">{form.formState.errors.facultyId.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Academic Class Section <span className="text-rose-500">*</span>
            </label>
            <select
              {...form.register('classId')}
              className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">Select class section...</option>
              {classesList.map((c) => (
                <option key={c._id} value={c._id}>
                  Section {c.section} (Sem {c.semester}, {c.academicYear})
                </option>
              ))}
            </select>
            {form.formState.errors.classId && (
              <p className="text-[11px] text-rose-500">{form.formState.errors.classId.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Subject <span className="text-rose-500">*</span>
            </label>
            <select
              {...form.register('subjectId')}
              className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">Select subject...</option>
              {subjectsList.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.code} - {s.name}
                </option>
              ))}
            </select>
            {form.formState.errors.subjectId && (
              <p className="text-[11px] text-rose-500">{form.formState.errors.subjectId.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Assign Faculty
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Confirm Deactivation Dialog */}
      <ConfirmDialog
        open={!!assignmentToDelete}
        onClose={() => setAssignmentToDelete(null)}
        title="Deactivate Faculty Assignment"
        description="Are you sure you want to deactivate this faculty assignment? The faculty member will no longer be authorized to take attendance for this section."
        confirmText="Deactivate"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (assignmentToDelete) deleteMutation.mutate(assignmentToDelete);
        }}
      />
    </div>
  );
}
