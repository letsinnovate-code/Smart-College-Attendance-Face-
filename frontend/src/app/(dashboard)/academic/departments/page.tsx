'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Layers,
  Plus,
  Search,
  Edit2,
  AlertCircle,
  Building,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Department, ApiPaginatedResponse } from '@/types';
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

const departmentSchema = z.object({
  name: z.string().min(2, 'Department name must be at least 2 characters').max(200),
  code: z.string().min(1, 'Code is required').max(20),
  description: z.string().max(1000).optional(),
});

type DepartmentFormData = z.infer<typeof departmentSchema>;

export default function DepartmentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  const { data, isLoading, error, refetch } = useQuery<ApiPaginatedResponse<Department>>({
    queryKey: ['academic-departments'],
    queryFn: () => apiClient.get('/academic/departments?limit=100'),
  });

  const saveMutation = useMutation({
    mutationFn: (formData: DepartmentFormData) => {
      if (editingDept) {
        return apiClient.put(`/academic/departments/${editingDept._id}`, formData);
      }
      return apiClient.post('/academic/departments', formData);
    },
    onSuccess: () => {
      toast.success(editingDept ? 'Department updated successfully' : 'Department created successfully');
      setIsModalOpen(false);
      setEditingDept(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['academic-departments'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save department');
    },
  });

  const form = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
    defaultValues: { name: '', code: '', description: '' },
  });

  const handleOpenCreate = () => {
    setEditingDept(null);
    form.reset({ name: '', code: '', description: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setEditingDept(dept);
    form.reset({
      name: dept.name,
      code: dept.code,
      description: dept.description || '',
    });
    setIsModalOpen(true);
  };

  const onSubmit = (formData: DepartmentFormData) => {
    saveMutation.mutate(formData);
  };

  const departments = (data?.data || []).filter((d) =>
    search ? d.name.toLowerCase().includes(search.toLowerCase()) || d.code.toLowerCase().includes(search.toLowerCase()) : true,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Departments"
        description="Organize institutional colleges into faculty divisions, departments, and academic units."
        action={
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Department
          </Button>
        }
      />

      {/* Search Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search departments by name or code..."
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
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">Failed to load departments</p>
              <p className="text-xs text-slate-500">{(error as any)?.message || 'An error occurred'}</p>
              <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-4">
                Retry
              </Button>
            </div>
          ) : departments.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No departments found"
              description="Get started by defining your college's first academic department."
              action={
                <Button onClick={handleOpenCreate} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Department
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Department Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((dept) => (
                  <TableRow key={dept._id}>
                    <TableCell className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {dept.code}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                      {dept.name}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 max-w-xs truncate">
                      {dept.description || '—'}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          dept.isActive
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {dept.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {formatDate(dept.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenEdit(dept)}
                        className="h-8 w-8 p-0"
                        title="Edit department"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <DialogHeader>
          <DialogTitle>{editingDept ? 'Edit Academic Department' : 'Create Academic Department'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Department Code"
            placeholder="e.g. CS, MECH, EEE"
            error={form.formState.errors.code?.message}
            {...form.register('code')}
            required
          />

          <Input
            label="Department Name"
            placeholder="e.g. Computer Science & Engineering"
            error={form.formState.errors.name?.message}
            {...form.register('name')}
            required
          />

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Description</label>
            <textarea
              {...form.register('description')}
              rows={3}
              placeholder="Brief summary of department academic programs..."
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saveMutation.isPending}>
              {editingDept ? 'Update Department' : 'Create Department'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
