'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  GraduationCap,
  Plus,
  Search,
  AlertCircle,
  Users,
  MapPin,
  Calendar,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { AcademicClass, Course, Department, ApiPaginatedResponse } from '@/types';
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

const classSchema = z.object({
  departmentId: z.string().min(1, 'Department is required'),
  courseId: z.string().min(1, 'Course is required'),
  section: z.string().min(1, 'Section is required').max(10),
  academicYear: z.string().regex(/^\d{4}-\d{4}$/, 'Must be in YYYY-YYYY format (e.g. 2024-2025)'),
  semester: z.coerce.number().int().min(1).max(12),
  room: z.string().optional(),
  maxStrength: z.coerce.number().int().min(1).max(500),
});

type ClassFormData = z.infer<typeof classSchema>;

export default function AcademicClassesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Classes Query
  const { data: classesData, isLoading, error, refetch } = useQuery<ApiPaginatedResponse<AcademicClass>>({
    queryKey: ['academic-classes'],
    queryFn: () => apiClient.get('/academic/classes?limit=100'),
  });

  // Departments Query
  const { data: deptsData } = useQuery<ApiPaginatedResponse<Department>>({
    queryKey: ['academic-departments'],
    queryFn: () => apiClient.get('/academic/departments?limit=100'),
  });

  // Courses Query
  const { data: coursesData } = useQuery<ApiPaginatedResponse<Course>>({
    queryKey: ['academic-courses'],
    queryFn: () => apiClient.get('/academic/courses?limit=100'),
  });

  const departments = deptsData?.data || [];
  const courses = coursesData?.data || [];

  const createMutation = useMutation({
    mutationFn: (formData: ClassFormData) => apiClient.post('/academic/classes', formData),
    onSuccess: () => {
      toast.success('Academic class created successfully');
      setIsModalOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['academic-classes'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create academic class');
    },
  });

  const form = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      departmentId: '',
      courseId: '',
      section: 'A',
      academicYear: '2024-2025',
      semester: 1,
      room: 'Hall 101',
      maxStrength: 60,
    },
  });

  const handleOpenCreate = () => {
    form.reset({
      departmentId: departments[0]?._id || '',
      courseId: courses[0]?._id || '',
      section: 'A',
      academicYear: '2024-2025',
      semester: 1,
      room: 'Hall 101',
      maxStrength: 60,
    });
    setIsModalOpen(true);
  };

  const onSubmit = (formData: ClassFormData) => {
    createMutation.mutate(formData);
  };

  const classes = (classesData?.data || []).filter((c) => {
    const course = typeof c.courseId === 'object' ? c.courseId?.name : '';
    const matchSearch =
      c.section.toLowerCase().includes(search.toLowerCase()) ||
      c.academicYear.toLowerCase().includes(search.toLowerCase()) ||
      course?.toLowerCase().includes(search.toLowerCase());
    return search ? matchSearch : true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Classes & Cohorts"
        description="Configure class sections, academic semesters, assigned lecture halls, and capacity ceilings."
        action={
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Class Section
          </Button>
        }
      />

      {/* Search Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search classes by section, year, or program..."
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
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">Failed to load classes</p>
              <p className="text-xs text-slate-500">{(error as any)?.message || 'An error occurred'}</p>
              <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-4">
                Retry
              </Button>
            </div>
          ) : classes.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="No academic classes registered"
              description="Establish your first cohort and class section to schedule student attendance."
              action={
                <Button onClick={handleOpenCreate} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Class Section
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Section</TableHead>
                  <TableHead>Academic Year</TableHead>
                  <TableHead className="text-center">Semester</TableHead>
                  <TableHead>Degree Program</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Lecture Room</TableHead>
                  <TableHead className="text-center">Max Capacity</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((cls) => {
                  const course = typeof cls.courseId === 'object' ? cls.courseId : null;
                  const dept = typeof cls.departmentId === 'object' ? cls.departmentId : null;

                  return (
                    <TableRow key={cls._id}>
                      <TableCell className="font-bold text-slate-900 dark:text-slate-100">
                        Section {cls.section}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400">
                        {cls.academicYear}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-indigo-600 dark:text-indigo-400">
                        Sem {cls.semester}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-800 dark:text-slate-200">
                        {course?.name || course?.code || 'Course'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {dept?.name || dept?.code || 'Department'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          {cls.room || 'TBD'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {cls.maxStrength} seats
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                            cls.isActive
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {cls.isActive ? 'Active' : 'Inactive'}
                        </span>
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
          <DialogTitle>Create Academic Class Section</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Department <span className="text-rose-500">*</span>
              </label>
              <select
                {...form.register('departmentId')}
                className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">Select department...</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
              {form.formState.errors.departmentId && (
                <p className="text-[11px] text-rose-500">{form.formState.errors.departmentId.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Course / Program <span className="text-rose-500">*</span>
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
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Section"
              placeholder="e.g. A, B, C1"
              error={form.formState.errors.section?.message}
              {...form.register('section')}
              required
            />
            <Input
              label="Academic Year"
              placeholder="2024-2025"
              error={form.formState.errors.academicYear?.message}
              {...form.register('academicYear')}
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

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Room / Hall"
              placeholder="e.g. Room 402, Block B"
              error={form.formState.errors.room?.message}
              {...form.register('room')}
            />
            <Input
              label="Max Strength (Seats)"
              type="number"
              min="1"
              max="500"
              error={form.formState.errors.maxStrength?.message}
              {...form.register('maxStrength')}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create Class Section
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
