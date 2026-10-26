'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Users,
  Plus,
  Search,
  Filter,
  Edit2,
  AlertCircle,
  Shield,
  GraduationCap,
  Briefcase,
  Eye,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';
import { User, UserRole, AccountStatus, ApiPaginatedResponse } from '@/types';
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

const createUserSchema = z.object({
  email: z.string().email('Valid email address required'),
  password: z.string().min(8, 'Temporary password must be at least 8 characters'),
  role: z.enum(['collegeAdmin', 'faculty', 'student', 'attendanceAuditor', 'superAdmin']),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phone: z.string().optional(),
  studentId: z.string().optional(),
  employeeId: z.string().optional(),
  accountStatus: z.enum(['active', 'inactive', 'suspended', 'pendingVerification']),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const isSuperAdmin = currentUser?.role === 'superAdmin';

  // Users Query
  const { data, isLoading, error, refetch } = useQuery<ApiPaginatedResponse<User>>({
    queryKey: ['users-list', roleFilter, page, search],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '20');
      if (roleFilter) params.set('role', roleFilter);
      if (search) params.set('search', search);
      return apiClient.get(`/users?${params.toString()}`);
    },
  });

  const createMutation = useMutation({
    mutationFn: (formData: CreateUserFormData) => apiClient.post('/users', formData),
    onSuccess: () => {
      toast.success('User account created successfully');
      setIsModalOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create user account');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AccountStatus }) =>
      apiClient.put(`/users/${id}`, { accountStatus: status }),
    onSuccess: () => {
      toast.success('User status updated');
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update user status');
    },
  });

  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      password: '',
      role: 'student',
      firstName: '',
      lastName: '',
      phone: '',
      studentId: '',
      employeeId: '',
      accountStatus: 'active',
    },
  });

  const handleOpenCreate = () => {
    form.reset({
      email: '',
      password: 'TempPassword123!',
      role: 'student',
      firstName: '',
      lastName: '',
      phone: '',
      studentId: '',
      employeeId: '',
      accountStatus: 'active',
    });
    setIsModalOpen(true);
  };

  const onSubmit = (formData: CreateUserFormData) => {
    createMutation.mutate(formData);
  };

  const users = data?.data || [];
  const pagination = data?.pagination;

  const roleBadge = (role: UserRole) => {
    switch (role) {
      case 'superAdmin':
        return <span className="rounded bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/70 dark:text-rose-300">Super Admin</span>;
      case 'collegeAdmin':
        return <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-950/70 dark:text-purple-300">College Admin</span>;
      case 'faculty':
        return <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/70 dark:text-blue-300">Faculty</span>;
      case 'student':
        return <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">Student</span>;
      case 'attendanceAuditor':
        return <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/70 dark:text-amber-300">Auditor</span>;
      default:
        return <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{role}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users & Identity Management"
        description="Provision, configure, and audit administrative, faculty, and student user identities."
        action={
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Provision User
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or institutional ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <option value="">All Roles</option>
            {isSuperAdmin && <option value="superAdmin">Super Admins</option>}
            <option value="collegeAdmin">College Admins</option>
            <option value="faculty">Faculty</option>
            <option value="student">Students</option>
            <option value="attendanceAuditor">Auditors</option>
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
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">Failed to load users</p>
              <p className="text-xs text-slate-500">{(error as any)?.message || 'An error occurred'}</p>
              <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-4">
                Retry
              </Button>
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No users match query"
              description="No user accounts match the current filters or query criteria."
              action={
                <Button onClick={handleOpenCreate} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Provision User
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Institutional ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const fullName = `${u.profile?.firstName || ''} ${u.profile?.lastName || ''}`.trim() || u.email;
                  const instId = u.profile?.studentId || u.profile?.employeeId || '—';

                  return (
                    <TableRow key={u._id}>
                      <TableCell>
                        <div className="font-medium text-slate-900 dark:text-slate-100">{fullName}</div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                      </TableCell>
                      <TableCell>{roleBadge(u.role)}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400">
                        {instId}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                            u.accountStatus === 'active'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                              : u.accountStatus === 'suspended'
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300'
                          }`}
                        >
                          {u.accountStatus}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {formatDate(u.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        {u.accountStatus === 'active' ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => updateStatusMutation.mutate({ id: u._id, status: 'suspended' })}
                            className="text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                          >
                            Suspend
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => updateStatusMutation.mutate({ id: u._id, status: 'active' })}
                            className="text-xs text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                          >
                            Activate
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

      {/* Provision User Modal */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <DialogHeader>
          <DialogTitle>Provision Institutional User</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              placeholder="e.g. John"
              error={form.formState.errors.firstName?.message}
              {...form.register('firstName')}
              required
            />
            <Input
              label="Last Name"
              placeholder="e.g. Doe"
              error={form.formState.errors.lastName?.message}
              {...form.register('lastName')}
              required
            />
          </div>

          <Input
            label="Institutional Email"
            type="email"
            placeholder="e.g. student@college.edu"
            error={form.formState.errors.email?.message}
            {...form.register('email')}
            required
          />

          <Input
            label="Initial Temporary Password"
            type="password"
            placeholder="Minimum 8 characters"
            error={form.formState.errors.password?.message}
            {...form.register('password')}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                User Role <span className="text-rose-500">*</span>
              </label>
              <select
                {...form.register('role')}
                className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {isSuperAdmin && <option value="superAdmin">Super Admin</option>}
                <option value="collegeAdmin">College Administrator</option>
                <option value="faculty">Faculty Member</option>
                <option value="student">Student</option>
                <option value="attendanceAuditor">Attendance Auditor</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Initial Account Status
              </label>
              <select
                {...form.register('accountStatus')}
                className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="active">Active</option>
                <option value="pendingVerification">Pending Verification</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Student ID (if Student)"
              placeholder="e.g. STU-2024-001"
              error={form.formState.errors.studentId?.message}
              {...form.register('studentId')}
            />
            <Input
              label="Employee ID (if Staff)"
              placeholder="e.g. EMP-904"
              error={form.formState.errors.employeeId?.message}
              {...form.register('employeeId')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Provision User
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
