'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  BookOpen,
  Plus,
  Search,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Subject, Course, ApiPaginatedResponse } from '@/types';
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

const subjectSchema = z.object({
  courseId: z.string().min(1, 'Course is required'),
  name: z.string().min(2, 'Subject name must be at least 2 characters').max(200),
  code: z.string().min(1, 'Subject code is required').max(20),
  credits: z.coerce.number().min(0).max(10),
  weeklyHours: z.coerce.number().int().min(1).max(40).optional(),
  semester: z.coerce.number().int().min(1).max(12),
  isElective: z.boolean().default(false),
  description: z.string().max(2000).optional(),
});

type SubjectFormData = z.infer<typeof subjectSchema>;

export default function SubjectsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Subjects Query
  const { data: subjectsData, isLoading, error, refetch } = useQuery<ApiPaginatedResponse<Subject>>({
    queryKey: ['academic-subjects'],
    queryFn: () => apiClient.get('/academic/subjects?limit=100'),
  });

  // Courses Query for selector
  const { data: coursesData } = useQuery<ApiPaginatedResponse<Course>>({
    queryKey: ['academic-courses'],
    queryFn: () => apiClient.get('/academic/courses?limit=100'),
  });

  const courses = coursesData?.data || [];

  const createMutation = useMutation({
    mutationFn: (formData: SubjectFormData) => apiClient.post('/academic/subjects', formData),
    onSuccess: () => {
      toast.success('Subject registered successfully');
      setIsModalOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['academic-subjects'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create subject');
    },
  });

  const form = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      courseId: '',
      name: '',
      code: '',
      credits: 4,
      weeklyHours: 4,
      semester: 1,
      isElective: false,
      description: '',
    },
  });

  const handleOpenCreate = () => {
    form.reset({
      courseId: courses[0]?._id || '',
      name: '',
      code: '',
      credits: 4,
      weeklyHours: 4,
      semester: 1,
      isElective: false,
      description: '',
    });
    setIsModalOpen(true);
  };

  const onSubmit = (formData: SubjectFormData) => {
    createMutation.mutate(formData);
  };

  const subjects = (subjectsData?.data || []).filter((s) =>
    search ? s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase()) : true,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Curriculum Subjects"
        description="Maintain the catalog of theory, practical, and elective subjects taught across departments."
        action={
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Subject
          </Button>
        }
      />

      {/* Search Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search subjects by code or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
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
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">Failed to load subjects</p>
              <p className="text-xs text-slate-500">{(error as any)?.message || 'An error occurred'}</p>
              <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-4">
                Retry
              </Button>
            </div>
          ) : subjects.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No subjects registered"
              description="Populate your subjects catalog to assign faculty and record class attendance."
              action={
                <Button onClick={handleOpenCreate} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Subject
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Subject Name</TableHead>
                  <TableHead className="text-center">Semester</TableHead>
                  <TableHead className="text-center">Credits</TableHead>
                  <TableHead className="text-center">Weekly Hours</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Course</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map((sub) => {
                  const course = typeof sub.courseId === 'object' ? sub.courseId : null;
                  return (
                    <TableRow key={sub._id}>
                      <TableCell className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {sub.code}
                      </TableCell>
                      <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                        {sub.name}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-slate-800 dark:text-slate-200">
                        Sem {sub.semester}
                      </TableCell>
                      <TableCell className="text-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {sub.credits}
                      </TableCell>
                      <TableCell className="text-center text-xs text-slate-500">
                        {sub.weeklyHours || 4} hrs/wk
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            sub.isElective
                              ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300'
                              : 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300'
                          }`}
                        >
                          {sub.isElective ? 'Elective' : 'Core'}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                        {course?.code || course?.name || 'Course'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <DialogHeader>
          <DialogTitle>Add Curriculum Subject</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Course / Degree <span className="text-rose-500">*</span>
            </label>
            <select
              {...form.register('courseId')}
              className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">Select course...</option>
              {courses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
            {form.formState.errors.courseId && (
              <p className="text-[11px] text-rose-500">{form.formState.errors.courseId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Subject Code"
              placeholder="e.g. CS501"
              error={form.formState.errors.code?.message}
              {...form.register('code')}
              required
            />
            <Input
              label="Semester"
              type="number"
              min="1"
              max="12"
              error={form.formState.errors.semester?.message}
              {...form.register('semester')}
              required
            />
          </div>

          <Input
            label="Subject Title"
            placeholder="e.g. Operating Systems & System Programming"
            error={form.formState.errors.name?.message}
            {...form.register('name')}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Credits"
              type="number"
              min="0"
              max="10"
              error={form.formState.errors.credits?.message}
              {...form.register('credits')}
              required
            />
            <Input
              label="Weekly Hours"
              type="number"
              min="1"
              max="40"
              error={form.formState.errors.weeklyHours?.message}
              {...form.register('weeklyHours')}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isElective"
              {...form.register('isElective')}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="isElective" className="text-xs text-slate-700 dark:text-slate-300">
              This is an elective or open-curriculum subject
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Register Subject
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
