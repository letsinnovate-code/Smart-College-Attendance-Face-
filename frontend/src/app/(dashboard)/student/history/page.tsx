'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, CheckCircle2, Clock, AlertTriangle, FileCheck2, Filter } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { apiClient } from '@/lib/api-client';
import { ApiResponse, StudentAttendanceSummary } from '@/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { AttendanceStatusBadge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/ui/skeleton';
import { formatDateTime, formatPercentage } from '@/lib/utils';

export default function StudentAttendanceHistoryPage() {
  const { user } = useAuth();
  const studentId = user?._id || user?.id || '';
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: summaryData, isLoading } = useQuery({
    queryKey: ['student-summary', studentId],
    queryFn: () => apiClient<ApiResponse<StudentAttendanceSummary>>(`/reports/students/${studentId}`),
    enabled: !!studentId,
  });

  const summary = summaryData?.data?.summary;
  const history = summaryData?.data?.history || [];

  const filteredHistory = history.filter((h) => {
    if (statusFilter === 'all') return true;
    return h.status === statusFilter;
  });

  const percentage = summary?.attendancePercentage ?? 0;
  const isCompliant = percentage >= 75;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Attendance History"
        description="Detailed record of all marked classes, subject breakdown, and verification methods"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Attendance History' },
        ]}
        actions={
          <Link href="/attendance/corrections">
            <Button size="sm" variant="outline">
              <FileCheck2 className="h-4 w-4 mr-1.5" /> View Correction Requests
            </Button>
          </Link>
        }
      />

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Overall Rate</CardDescription>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isCompliant ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                {isCompliant ? '≥ 75% Eligible' : '< 75% Shortage'}
              </span>
            </div>
            <CardTitle className="text-2xl font-bold flex items-center justify-between mt-1">
              {formatPercentage(percentage)}
              <TrendingUp className="h-5 w-5 text-indigo-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-slate-500">Based on {summary?.total || 0} total sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Present Count</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600">
              {summary?.present ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-slate-500">Verified via face recognition</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Late Count</CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600">
              {summary?.late ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-slate-500">Marked after grace period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Absent Count</CardDescription>
            <CardTitle className="text-2xl font-bold text-rose-600">
              {summary?.absent ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-slate-500">Disputed? Request a correction</p>
          </CardContent>
        </Card>
      </div>

      {/* History Table with Status Filter */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base">Class Attendance History</CardTitle>
              <CardDescription>Comprehensive audit log of every session attended</CardDescription>
            </div>
            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs dark:bg-slate-800">
              <span className="px-2 text-slate-400 font-medium">Filter:</span>
              {['all', 'present', 'late', 'absent'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md capitalize font-medium transition-colors ${
                    statusFilter === st
                      ? 'bg-white text-slate-900 shadow-xs font-semibold dark:bg-slate-900 dark:text-slate-100'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : filteredHistory.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No records found matching status filter &ldquo;{statusFilter}&rdquo;.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class Date</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Verification Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map((record) => (
                  <TableRow key={record.recordId}>
                    <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                      {formatDateTime(record.date)}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {record.subject || 'Subject'}
                      </span>
                      {record.subjectCode && (
                        <span className="ml-1.5 text-[11px] font-mono text-slate-400">
                          ({record.subjectCode})
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="capitalize text-slate-600 dark:text-slate-400">
                      {record.verificationMethod}
                    </TableCell>
                    <TableCell>
                      <AttendanceStatusBadge status={record.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {record.status !== 'present' && (
                        <Link href={`/attendance/corrections?recordId=${record.recordId}&originalStatus=${record.status}`}>
                          <Button size="sm" variant="outline">
                            Request Correction
                          </Button>
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
