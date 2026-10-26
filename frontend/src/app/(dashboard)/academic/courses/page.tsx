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
  Edit2,
  AlertCircle,
  GraduationCap,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Course, Department, ApiPaginatedResponse } from '@/types';
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

const courseSchema = z.object({
  departmentId: z.string().min(1, 'Department is required'),
  name: z.string().min(2, 'Course name must be at least 2 characters').max(200),
  code: z.string().min(1, 'Course code is required').max(20),
  credits: z.coerce.number().min(0).max(10),
  level: z.enum(['undergraduate', 'postgraduate', 'diploma', 'certificate', 'phd']),
  durationSemesters: z.coerce.number().int().min(1).max(12),
  description: z.string().max(2000).optional(),
});

type CourseFormData = z.infer<typeof courseSchema>;

export default function CoursesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  // Courses Query
  const { data: coursesData, isLoading, error, refetch } = useQuery<ApiPaginatedResponse<Course>>({
    queryKey: ['academic-courses'],
    queryFn: () => apiClient.get('/academic/courses?limit=100'),
  });

  // Departments Query for selector
  const { data: deptsData } = useQuery<ApiPaginatedResponse<Department>>({
    queryKey: ['academic-departments'],
    queryFn: () => apiClient.get('/academic/departments?limit=100'),
  });

  const departments = deptsData?.data || [];

  const saveMutation = useMutation({
    mutationFn: (formData: CourseFormData) => {
      if (editingCourse) {
        return apiClient.put(`/academic/courses/${editingCourse._id}`, formData);
      }
      return apiClient.post('/academic/courses', formData);
    },
    onSuccess: () => {
      toast.success(editingCourse ? 'Course updated successfully' : 'Course created successfully');
      setIsModalOpen(false);
      setEditingCourse(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['academic-courses'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save course');
    },
  });

  const form = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      departmentId: '',
      name: '',
      code: '',
      credits: 4,
      level: 'undergraduate',
      durationSemesters: 8,
      description: '',
    },
  });

  const handleOpenCreate = () => {
    setEditingCourse(null);
    form.reset({
      departmentId: departments[0]?._id || '',
      name: '',
      code: '',
      credits: 4,
      level: 'undergraduate',
      durationSemesters: 8,
      description: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (course: Course) => {
    setEditingCourse(course);
    const deptId = typeof course.departmentId === 'object' ? course.departmentId._id : course.departmentId;
    form.reset({
      departmentId: deptId,
      name: course.name,
      code: course.code,
      credits: course.credits,
      level: course.level,
      durationSemesters: course.durationSemesters,
      description: course.description || '',
    });
    setIsModalOpen(true);
  };

  const onSubmit = (formData: CourseFormData) => {
    saveMutation.mutate(formData);
  };

  const courses = (coursesData?.data || []).filter((c) =>
    search ? c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase()) : true,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Degree & Academic Courses"
        description="Manage curriculum degree programs (B.Tech, M.Tech, BCA, PhD) and their credit configurations."
        action={
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Course
          </Button>
        }
      />

      {/* Search Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search courses by name or code..."
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
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">Failed to load courses</p>
              <p className="text-xs text-slate-500">{(error as any)?.message || 'An error occurred'}</p>
              <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-4">
                Retry
              </Button>
            </div>
          ) : courses.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No courses configured"
              description="Define your degree programs to enable class and subject scheduling."
              action={
                <Button onClick={handleOpenCreate} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Course
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Course Name</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead className="text-center">Credits</TableHead>
                  <TableHead className="text-center">Semesters</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => {
                  const dept = typeof course.departmentId === 'object' ? course.departmentId : null;
                  return (
                    <TableRow key={course._id}>
                      <TableCell className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {course.code}
                      </TableCell>
                      <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                        {course.name}
                      </TableCell>
                      <TableCell>
                        <span className="capitalize rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {course.level}
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-semibold text-slate-800 dark:text-slate-200">
                        {course.credits}
                      </TableCell>
                      <TableCell className="text-center text-xs text-slate-600 dark:text-slate-400">
                        {course.durationSemesters} Sems
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                        {dept?.name || 'Department'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEdit(course)}
                          className="h-8 w-8 p-0"
                          title="Edit course"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <DialogHeader>
          <DialogTitle>{editingCourse ? 'Edit Degree Course' : 'Create Degree Course'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Course Code"
              placeholder="e.g. BTECH-CSE"
              error={form.formState.errors.code?.message}
              {...form.register('code')}
              required
            />
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Academic Level <span className="text-rose-500">*</span>
              </label>
              <select
                {...form.register('level')}
                className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="undergraduate">Undergraduate</option>
                <option value="postgraduate">Postgraduate</option>
                <option value="diploma">Diploma</option>
                <option value="certificate">Certificate</option>
                <option value="phd">PhD</option>
              </select>
            </div>
          </div>

          <Input
            label="Course / Degree Name"
            placeholder="e.g. Bachelor of Technology in Computer Science"
            error={form.formState.errors.name?.message}
            {...form.register('name')}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Total Credits"
              type="number"
              min="0"
              max="10"
              error={form.formState.errors.credits?.message}
              {...form.register('credits')}
              required
            />
            <Input
              label="Duration (Semesters)"
              type="number"
              min="1"
              max="12"
              error={form.formState.errors.durationSemesters?.message}
              {...form.register('durationSemesters')}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saveMutation.isPending}>
              {editingCourse ? 'Update Course' : 'Create Course'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
