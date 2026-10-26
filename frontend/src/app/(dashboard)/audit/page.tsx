'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheck,
  Search,
  Filter,
  AlertCircle,
  Clock,
  Terminal,
  Activity,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { AuditLog, ApiPaginatedResponse } from '@/types';
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
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate, formatDateTime } from '@/lib/utils';

export default function AuditLogsPage() {
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);

  // Audit Logs Query
  const { data, isLoading, error, refetch } = useQuery<ApiPaginatedResponse<AuditLog>>({
    queryKey: ['security-audit-logs', actionFilter, page],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '25');
      if (actionFilter) params.set('action', actionFilter);
      return apiClient.get(`/audit?${params.toString()}`);
    },
  });

  const logs = data?.data || [];
  const pagination = data?.pagination;

  const actionColor = (action: string) => {
    if (action.includes('created') || action.includes('enrolled') || action.includes('verified') || action.includes('approved')) {
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300';
    }
    if (action.includes('revoked') || action.includes('rejected') || action.includes('deleted') || action.includes('failed')) {
      return 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300';
    }
    if (action.includes('opened') || action.includes('closed') || action.includes('updated')) {
      return 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300';
    }
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security & Compliance Audit Trail"
        description="Immutable chronological record of administrative actions, biometric operations, session state changes, and security events."
      />

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <option value="">All Security Events</option>
            <option value="user.login">user.login</option>
            <option value="face.enrolled">face.enrolled</option>
            <option value="face.revoked">face.revoked</option>
            <option value="attendance.verified">attendance.verified</option>
            <option value="session.created">session.created</option>
            <option value="session.opened">session.opened</option>
            <option value="session.closed">session.closed</option>
            <option value="attendance.correction.requested">attendance.correction.requested</option>
            <option value="attendance.correction.approved">attendance.correction.approved</option>
            <option value="attendance.correction.rejected">attendance.correction.rejected</option>
          </select>
        </div>

        {pagination && (
          <div className="text-xs text-slate-500">
            Page {pagination.page} of {pagination.pages || 1} • {pagination.total} Total Events
          </div>
        )}
      </div>

      {/* Main Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton rows={8} />
          ) : error ? (
            <div className="p-8 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">Failed to load audit logs</p>
              <p className="text-xs text-slate-500">{(error as any)?.message || 'An error occurred'}</p>
              <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-4">
                Retry
              </Button>
            </div>
          ) : logs.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No audit events found"
              description="No audit logs matched the selected action filter."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Event Action</TableHead>
                  <TableHead>Target Entity</TableHead>
                  <TableHead>Request ID</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const actor = typeof log.actor === 'object' ? log.actor : null;
                  const actorEmail = actor?.email || (typeof log.actor === 'string' ? log.actor : 'System');

                  return (
                    <TableRow key={log._id}>
                      <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {formatDateTime(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-xs text-slate-900 dark:text-slate-100">{actorEmail}</div>
                        {actor?.role && (
                          <div className="text-[10px] uppercase font-bold text-slate-400">{actor.role}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-mono font-semibold ${actionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                        {log.targetType ? (
                          <span className="font-mono">
                            {log.targetType}
                            {log.targetId ? `:${log.targetId.slice(-6)}` : ''}
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-slate-400 max-w-[140px] truncate" title={log.requestId}>
                        {log.requestId || '—'}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">
                        {log.ipAddress || '127.0.0.1'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
          <Button
            variant="outline"
            size="sm"
            disabled={!pagination.hasPrev}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-xs text-slate-500">
            Page {pagination.page} of {pagination.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!pagination.hasNext}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
