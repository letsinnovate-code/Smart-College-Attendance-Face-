'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Building2,
  Plus,
  Search,
  Globe,
  Mail,
  Phone,
  AlertCircle,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Settings,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { College, ApiPaginatedResponse } from '@/types';
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

const collegeSchema = z.object({
  name: z.string().min(2, 'College name must be at least 2 characters').max(200),
  shortName: z.string().max(20).optional(),
  tenantCode: z.string().min(2, 'Tenant code must be at least 2 chars').max(10).toUpperCase(),
  domain: z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, 'Must be a valid domain (e.g. apex.edu)').optional().or(z.literal('')),
  contactEmail: z.string().email('Valid contact email required').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
});

type CollegeFormData = z.infer<typeof collegeSchema>;

export default function CollegesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Colleges Query
  const { data, isLoading, error, refetch } = useQuery<ApiPaginatedResponse<College>>({
    queryKey: ['colleges-list'],
    queryFn: () => apiClient.get('/colleges'),
  });

  const createMutation = useMutation({
    mutationFn: (formData: CollegeFormData) => {
      const payload: any = { ...formData };
      if (!payload.domain) delete payload.domain;
      if (!payload.contactEmail) delete payload.contactEmail;
      return apiClient.post('/colleges', payload);
    },
    onSuccess: () => {
      toast.success('College tenant registered successfully');
      setIsModalOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['colleges-list'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create college');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'suspended' | 'pending' }) =>
      apiClient.patch(`/colleges/${id}/status`, { status }),
    onSuccess: () => {
      toast.success('College tenant status updated');
      queryClient.invalidateQueries({ queryKey: ['colleges-list'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update college status');
    },
  });

  const form = useForm<CollegeFormData>({
    resolver: zodResolver(collegeSchema),
    defaultValues: {
      name: '',
      shortName: '',
      tenantCode: '',
      domain: '',
      contactEmail: '',
      contactPhone: '',
      address: '',
    },
  });

  const handleOpenCreate = () => {
    form.reset({
      name: '',
      shortName: '',
      tenantCode: '',
      domain: '',
      contactEmail: '',
      contactPhone: '',
      address: '',
    });
    setIsModalOpen(true);
  };

  const onSubmit = (formData: CollegeFormData) => {
    createMutation.mutate(formData);
  };

  const colleges = (data?.data || []).filter((c) =>
    search
      ? c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.tenantCode.toLowerCase().includes(search.toLowerCase()) ||
        c.domain?.toLowerCase().includes(search.toLowerCase())
      : true,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="College Tenants & Multi-Institution Management"
        description="Global platform administration for tenant isolation, biometric enrollment quotas, and college lifecycles."
        action={
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Register College
          </Button>
        }
      />

      {/* Search Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search colleges by name, tenant code, or domain..."
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
            <TableSkeleton rows={4} />
          ) : error ? (
            <div className="p-8 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">Failed to load colleges</p>
              <p className="text-xs text-slate-500">{(error as any)?.message || 'An error occurred'}</p>
              <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-4">
                Retry
              </Button>
            </div>
          ) : colleges.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No colleges registered"
              description="Register the first college tenant to begin institutional onboarding."
              action={
                <Button onClick={handleOpenCreate} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Register College
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant Code</TableHead>
                  <TableHead>College Name</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Contact Email</TableHead>
                  <TableHead>Biometric Face Policy</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {colleges.map((college) => (
                  <TableRow key={college._id}>
                    <TableCell className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {college.tenantCode}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900 dark:text-slate-100">{college.name}</div>
                      {college.shortName && (
                        <div className="text-xs text-slate-500">{college.shortName}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                      {college.domain ? (
                        <span className="inline-flex items-center gap-1">
                          <Globe className="h-3 w-3 text-slate-400" />
                          {college.domain}
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {college.contactEmail || '—'}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          college.settings?.allowFaceAttendance
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {college.settings?.allowFaceAttendance ? 'Enabled' : 'Disabled'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                          college.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                            : college.status === 'suspended'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300'
                        }`}
                      >
                        {college.status === 'active' && <CheckCircle2 className="h-3 w-3" />}
                        {college.status === 'suspended' && <ShieldAlert className="h-3 w-3" />}
                        {college.status === 'pending' && <Clock className="h-3 w-3" />}
                        {college.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {formatDate(college.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {college.status === 'active' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateStatusMutation.mutate({ id: college._id, status: 'suspended' })}
                          className="text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                        >
                          Suspend
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateStatusMutation.mutate({ id: college._id, status: 'active' })}
                          className="text-xs text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                        >
                          Activate
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Register College Modal */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <DialogHeader>
          <DialogTitle>Register Institutional College</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Tenant Code (Unique)"
              placeholder="e.g. APEX, MIT, IITD"
              error={form.formState.errors.tenantCode?.message}
              {...form.register('tenantCode')}
              required
            />
            <Input
              label="Short Name / Acronym"
              placeholder="e.g. Apex Univ"
              error={form.formState.errors.shortName?.message}
              {...form.register('shortName')}
            />
          </div>

          <Input
            label="Full College Name"
            placeholder="e.g. Apex Institute of Technology & Science"
            error={form.formState.errors.name?.message}
            {...form.register('name')}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Institutional Domain"
              placeholder="e.g. apex.edu"
              error={form.formState.errors.domain?.message}
              {...form.register('domain')}
            />
            <Input
              label="Official Contact Email"
              type="email"
              placeholder="admin@apex.edu"
              error={form.formState.errors.contactEmail?.message}
              {...form.register('contactEmail')}
            />
          </div>

          <Input
            label="Campus Address"
            placeholder="e.g. 104 University Ave, Innovation Park"
            error={form.formState.errors.address?.message}
            {...form.register('address')}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Register College
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
