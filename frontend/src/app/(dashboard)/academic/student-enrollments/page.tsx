'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  ClipboardList,
  Plus,
  Search,
  AlertCircle,
  Filter,
  CheckCircle2,
  Clock,
  UserX,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import {
  StudentEnrollment,
  AcademicClass,
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
import { Input } from '@/components/ui/input';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate } from '@/lib/utils';

const existingSchema = z.object({
  studentId: z.string().min(1, 'Student is required'),
  classId: z.string().min(1, 'Class section is required'),
  rollNumber: z.string().optional(),
});

const newStudentSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  studentId: z.string().min(1, 'Student ID / Roll code is required'),
  classId: z.string().min(1, 'Class section is required'),
  rollNumber: z.string().optional(),
});

type ExistingFormData = z.infer<typeof existingSchema>;
type NewStudentFormData = z.infer<typeof newStudentSchema>;

export default function StudentEnrollmentsPage() {
  const queryClient = useQueryClient();
  const [selectedClassFilter, setSelectedClassFilter] = useState('');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [enrollMode, setEnrollMode] = useState<'existing' | 'new'>('existing');
  const [isCreatingNewStudent, setIsCreatingNewStudent] = useState(false);

  // Student Enrollments Query
  const { data: enrollmentsData, isLoading, error, refetch } = useQuery<ApiPaginatedResponse<StudentEnrollment>>({
    queryKey: ['academic-student-enrollments', selectedClassFilter],
    queryFn: () => {
      const url = selectedClassFilter
        ? `/academic/student-enrollments?classId=${selectedClassFilter}&limit=100`
        : '/academic/student-enrollments?limit=100';
      return apiClient.get(url);
    },
  });

  // Students List Query for dropdown
  const { data: studentsData } = useQuery<ApiPaginatedResponse<User>>({
    queryKey: ['users-students-list'],
    queryFn: () => apiClient.get('/users?role=student&limit=100'),
  });

  // Classes Query for filter and dropdown
  const { data: classesData } = useQuery<ApiPaginatedResponse<AcademicClass>>({
    queryKey: ['academic-classes-list'],
    queryFn: () => apiClient.get('/academic/classes?limit=100'),
  });

  const studentsList = studentsData?.data || [];
  const classesList = classesData?.data || [];

  const existingForm = useForm<ExistingFormData>({
    resolver: zodResolver(existingSchema),
    defaultValues: { studentId: '', classId: '', rollNumber: '' },
  });

  const newForm = useForm<NewStudentFormData>({
    resolver: zodResolver(newStudentSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: 'StudentPass123!',
      studentId: '',
      classId: '',
      rollNumber: '',
    },
  });

  const enrollMutation = useMutation({
    mutationFn: (formData: ExistingFormData) => apiClient.post('/academic/student-enrollments', formData),
    onSuccess: () => {
      toast.success('Student enrolled into class successfully');
      setIsModalOpen(false);
      existingForm.reset();
      queryClient.invalidateQueries({ queryKey: ['academic-student-enrollments'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to enroll student');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiClient.patch(`/academic/student-enrollments/${id}/status`, { status }),
    onSuccess: () => {
      toast.success('Enrollment status updated');
      queryClient.invalidateQueries({ queryKey: ['academic-student-enrollments'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update enrollment status');
    },
  });

  const handleOpenCreate = () => {
    existingForm.reset({
      studentId: studentsList[0]?._id || '',
      classId: classesList[0]?._id || '',
      rollNumber: '',
    });
    newForm.reset({
      firstName: '',
      lastName: '',
      email: '',
      password: 'StudentPass123!',
      studentId: '',
      classId: classesList[0]?._id || '',
      rollNumber: '',
    });
    setEnrollMode('existing');
    setIsModalOpen(true);
  };

  const onSubmitExisting = (formData: ExistingFormData) => {
    enrollMutation.mutate(formData);
  };

  const onSubmitNew = async (formData: NewStudentFormData) => {
    setIsCreatingNewStudent(true);
    try {
      // 1. Create the student user account
      const userRes: any = await apiClient.post('/users', {
        email: formData.email,
        password: formData.password,
        role: 'student',
        firstName: formData.firstName,
        lastName: formData.lastName,
        studentId: formData.studentId,
      });

      const newUserId = userRes?.data?._id || userRes?._id;
      if (!newUserId) {
        throw new Error('Student account created but no identifier was returned.');
      }

      // 2. Enroll student into class section
      await apiClient.post('/academic/student-enrollments', {
        studentId: newUserId,
        classId: formData.classId,
        rollNumber: formData.rollNumber || formData.studentId,
      });

      toast.success(`Student ${formData.firstName} ${formData.lastName} created and enrolled!`);
      setIsModalOpen(false);
      newForm.reset();
      queryClient.invalidateQueries({ queryKey: ['academic-student-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['users-students-list'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to create and enroll student');
    } finally {
      setIsCreatingNewStudent(false);
    }
  };

  const enrollments = (enrollmentsData?.data || []).filter((e) => {
    const student = typeof e.studentId === 'object' ? e.studentId : null;
    const name = student ? `${student.profile?.firstName || ''} ${student.profile?.lastName || ''}`.trim() : '';
    const matchSearch =
      name.toLowerCase().includes(search.toLowerCase()) ||
      student?.email?.toLowerCase().includes(search.toLowerCase()) ||
      e.rollNumber?.toLowerCase().includes(search.toLowerCase());
    return search ? matchSearch : true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Class Enrollments"
        description="Enroll admitted students into designated class cohorts, assign roll numbers, and track active statuses."
        action={
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Enroll Student
          </Button>
        }
      />

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student name, email, or roll no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <option value="">All Class Sections</option>
            {classesList.map((c) => (
              <option key={c._id} value={c._id}>
                Section {c.section} (Sem {c.semester}, {c.academicYear})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : error ? (
            <div className="p-8 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">Failed to load student enrollments</p>
              <p className="text-xs text-slate-500">{(error as any)?.message || 'An error occurred'}</p>
              <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-4">
                Retry
              </Button>
            </div>
          ) : enrollments.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No student enrollments found"
              description="Enroll students to grant them eligibility for taking attendance in this cohort."
              action={
                <Button onClick={handleOpenCreate} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Enroll Student
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Roll No</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Class Section</TableHead>
                  <TableHead>Enrolled On</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((enrollment) => {
                  const student = typeof enrollment.studentId === 'object' ? enrollment.studentId : null;
                  const cls = typeof enrollment.classId === 'object' ? enrollment.classId : null;
                  const name = student
                    ? `${student.profile?.firstName || ''} ${student.profile?.lastName || ''}`.trim() || student.email
                    : 'Student';

                  return (
                    <TableRow key={enrollment._id}>
                      <TableCell className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                        {enrollment.rollNumber || '—'}
                      </TableCell>
                      <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                        {name}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {student?.email}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {cls ? `Section ${cls.section} (Sem ${cls.semester})` : 'Class'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {formatDate(enrollment.enrolledAt)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                            enrollment.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                              : enrollment.status === 'dropped'
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {enrollment.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {enrollment.status === 'active' ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => statusMutation.mutate({ id: enrollment._id, status: 'dropped' })}
                            className="text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                          >
                            Drop
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => statusMutation.mutate({ id: enrollment._id, status: 'active' })}
                            className="text-xs text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                          >
                            Reactivate
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

      {/* Enroll Modal */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <DialogHeader>
          <DialogTitle>Enroll Student into Academic Class</DialogTitle>
        </DialogHeader>

        {/* Toggle Mode Segmented Control */}
        <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setEnrollMode('existing')}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${
              enrollMode === 'existing'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Existing Student Directory
          </button>
          <button
            type="button"
            onClick={() => setEnrollMode('new')}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${
              enrollMode === 'new'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            + Register & Enroll New Student
          </button>
        </div>

        {enrollMode === 'existing' ? (
          <form onSubmit={existingForm.handleSubmit(onSubmitExisting)} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Student <span className="text-rose-500">*</span>
              </label>
              <select
                {...existingForm.register('studentId')}
                className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">Select student...</option>
                {studentsList.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.profile?.firstName} {s.profile?.lastName} ({s.email})
                  </option>
                ))}
              </select>
              {existingForm.formState.errors.studentId && (
                <p className="text-[11px] text-rose-500">{existingForm.formState.errors.studentId.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Academic Class Section <span className="text-rose-500">*</span>
              </label>
              <select
                {...existingForm.register('classId')}
                className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">Select class section...</option>
                {classesList.map((c) => (
                  <option key={c._id} value={c._id}>
                    Section {c.section} (Sem {c.semester}, {c.academicYear})
                  </option>
                ))}
              </select>
              {existingForm.formState.errors.classId && (
                <p className="text-[11px] text-rose-500">{existingForm.formState.errors.classId.message}</p>
              )}
            </div>

            <Input
              label="Roll Number / Class Rank"
              placeholder="e.g. 01, 104, CS-24-001"
              error={existingForm.formState.errors.rollNumber?.message}
              {...existingForm.register('rollNumber')}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={enrollMutation.isPending}>
                Enroll Student
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={newForm.handleSubmit(onSubmitNew)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First Name"
                placeholder="e.g. Alex"
                error={newForm.formState.errors.firstName?.message}
                {...newForm.register('firstName')}
              />
              <Input
                label="Last Name"
                placeholder="e.g. Rivera"
                error={newForm.formState.errors.lastName?.message}
                {...newForm.register('lastName')}
              />
            </div>

            <Input
              label="Student Institutional Email"
              type="email"
              placeholder="alex.rivera@college.edu"
              error={newForm.formState.errors.email?.message}
              {...newForm.register('email')}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Student ID / Code"
                placeholder="e.g. CS2024-042"
                error={newForm.formState.errors.studentId?.message}
                {...newForm.register('studentId')}
              />
              <Input
                label="Roll Number in Class"
                placeholder="e.g. 42"
                error={newForm.formState.errors.rollNumber?.message}
                {...newForm.register('rollNumber')}
              />
            </div>

            <Input
              label="Initial Password"
              type="password"
              placeholder="Min 8 characters"
              error={newForm.formState.errors.password?.message}
              {...newForm.register('password')}
            />

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Assign Class Section <span className="text-rose-500">*</span>
              </label>
              <select
                {...newForm.register('classId')}
                className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">Select class section...</option>
                {classesList.map((c) => (
                  <option key={c._id} value={c._id}>
                    Section {c.section} (Sem {c.semester}, {c.academicYear})
                  </option>
                ))}
              </select>
              {newForm.formState.errors.classId && (
                <p className="text-[11px] text-rose-500">{newForm.formState.errors.classId.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isCreatingNewStudent}>
                Create & Enroll Student
              </Button>
            </DialogFooter>
          </form>
        )}
      </Dialog>
    </div>
  );
}
