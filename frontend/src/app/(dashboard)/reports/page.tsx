'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Download,
  Filter,
  Users,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import {
  AcademicClass,
  Subject,
  ClassAttendanceReport,
  DailyOverviewData,
  ApiPaginatedResponse,
  ApiResponse,
} from '@/types';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
import { formatPercentage } from '@/lib/utils';

export default function AttendanceReportsPage() {
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Daily Overview Stats
  const { data: overviewData } = useQuery<ApiResponse<DailyOverviewData>>({
    queryKey: ['reports-overview'],
    queryFn: () => apiClient.get('/reports/overview'),
  });

  // Academic Classes for filter dropdown
  const { data: classesData } = useQuery<ApiPaginatedResponse<AcademicClass>>({
    queryKey: ['academic-classes-list'],
    queryFn: () => apiClient.get('/academic/classes?limit=100'),
  });

  // Subjects for filter dropdown
  const { data: subjectsData } = useQuery<ApiPaginatedResponse<Subject>>({
    queryKey: ['academic-subjects-list'],
    queryFn: () => apiClient.get('/academic/subjects?limit=100'),
  });

  const classes = classesData?.data || [];
  const subjects = subjectsData?.data || [];
  const effectiveClassId = selectedClassId || classes[0]?._id || '';

  // Class Report Query
  const {
    data: reportData,
    isLoading: isReportLoading,
    error: reportError,
    refetch: refetchReport,
  } = useQuery<ApiResponse<ClassAttendanceReport>>({
    queryKey: ['class-attendance-report', effectiveClassId, selectedSubjectId, startDate, endDate],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedSubjectId) params.set('subjectId', selectedSubjectId);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      return apiClient.get(`/reports/classes/${effectiveClassId}?${params.toString()}`);
    },
    enabled: !!effectiveClassId,
  });

  // Safe CSV Export Handler
  const handleExportCsv = async () => {
    if (!effectiveClassId) return;
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      if (selectedSubjectId) params.set('subjectId', selectedSubjectId);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const blob = await apiClient.downloadBlob(
        `/reports/classes/${effectiveClassId}/export/csv?${params.toString()}`,
      );

      // Trigger browser download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-report-${effectiveClassId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Attendance report CSV downloaded successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to export CSV report');
    } finally {
      setIsExporting(false);
    }
  };

  const report = reportData?.data;
  const students = report?.students || [];
  const overview = overviewData?.data;

  // Chart data: Top 15 students by roll number or code
  const chartData = students.slice(0, 15).map((s) => ({
    name: s.rollNumber && s.rollNumber !== 'N/A' ? `Roll ${s.rollNumber}` : s.studentCode || s.studentName.slice(0, 10),
    percentage: s.attendancePercentage,
    fullName: s.studentName,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Analytics & Reports"
        description="Comprehensive institutional attendance aggregation, student compliance breakdown, and official CSV exports."
        action={
          <Button
            variant="outline"
            onClick={handleExportCsv}
            disabled={!effectiveClassId || isExporting || students.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4 text-emerald-600" />
            {isExporting ? 'Generating CSV...' : 'Export Class CSV'}
          </Button>
        }
      />

      {/* Daily Overview Metric Cards */}
      {overview && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-indigo-600">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Enrolled</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{overview.totalStudents}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Active institutional students</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                <Users className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-600">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Attendance Today</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{overview.totalAttendanceMarkedToday}</p>
                <p className="text-[11px] text-emerald-600 mt-0.5 font-medium">Verifications logged</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-600">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Sessions</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{overview.sessions?.open || 0}</p>
                <p className="text-[11px] text-amber-600 mt-0.5 font-medium">Accepting verification</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                <Clock className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-slate-600">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Sessions Today</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{overview.sessions?.total || 0}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{overview.sessions?.closed || 0} closed / archived</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Calendar className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter Control Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Academic Class <span className="text-rose-500">*</span>
              </label>
              <select
                value={effectiveClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {classes.length === 0 && <option value="">No classes found</option>}
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>
                    Sec {c.section} (Sem {c.semester}, {c.academicYear})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Subject Filter
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">All Subjects</option>
                {subjects.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visualization: Student Compliance Bar Chart */}
      {students.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Attendance Rate Distribution (%)</span>
              <span className="text-xs font-normal text-slate-500">
                Minimum Policy Requirement: 75%
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: any, name: any, item: any) => [`${value}%`, item.payload.fullName]}
                    contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                  />
                  <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.percentage >= 75 ? '#10b981' : entry.percentage >= 60 ? '#f59e0b' : '#ef4444'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Tabular Report */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-200 dark:border-slate-800 py-3">
          <CardTitle className="text-sm font-semibold">
            Student Attendance Roster
          </CardTitle>
          {report && (
            <div className="text-xs text-slate-500">
              Total Recorded Sessions: <span className="font-bold text-slate-900 dark:text-white">{report.totalSessions}</span>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {isReportLoading ? (
            <TableSkeleton rows={6} />
          ) : reportError ? (
            <div className="p-8 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">Failed to load class report</p>
              <p className="text-xs text-slate-500">{(reportError as any)?.message || 'An error occurred'}</p>
              <Button onClick={() => refetchReport()} variant="outline" size="sm" className="mt-4">
                Retry
              </Button>
            </div>
          ) : students.length === 0 ? (
            <EmptyState
              icon={FileSpreadsheet}
              title="No student records found"
              description="No active students are enrolled in this class or no sessions match the selected date filter."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Roll No</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Student Code</TableHead>
                  <TableHead className="text-center">Present</TableHead>
                  <TableHead className="text-center">Late</TableHead>
                  <TableHead className="text-center">Absent</TableHead>
                  <TableHead className="text-center">Total Sessions</TableHead>
                  <TableHead className="text-right">Attendance %</TableHead>
                  <TableHead className="text-right">Compliance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => {
                  const isCompliant = student.attendancePercentage >= 75;
                  const isAtRisk = student.attendancePercentage >= 60 && student.attendancePercentage < 75;

                  return (
                    <TableRow key={student.studentId}>
                      <TableCell className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {student.rollNumber || '—'}
                      </TableCell>
                      <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                        {student.studentName}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-slate-500">
                        {student.studentCode || '—'}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-emerald-600">
                        {student.presentCount}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-amber-600">
                        {student.lateCount}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-rose-600">
                        {student.absentCount}
                      </TableCell>
                      <TableCell className="text-center text-xs text-slate-500">
                        {student.totalClasses}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        {formatPercentage(student.attendancePercentage)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            isCompliant
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                              : isAtRisk
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300'
                          }`}
                        >
                          {isCompliant ? 'Eligible' : isAtRisk ? 'At Risk' : 'Critical Shortage'}
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
    </div>
  );
}
