'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarDays,
  Users,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Camera,
  ArrowRight,
  TrendingUp,
  FileCheck2,
  Sparkles,
  BarChart3,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { apiClient } from '@/lib/api-client';
import {
  ApiResponse,
  DailyOverviewData,
  StudentAttendanceSummary,
  FaceEnrollmentStatus,
  AttendanceSession,
} from '@/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, AttendanceStatusBadge, SessionStateBadge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime, formatPercentage } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  if (user.role === 'student') {
    return <StudentDashboard studentId={user._id || user.id || ''} />;
  }

  if (user.role === 'faculty') {
    return <FacultyDashboard user={user} />;
  }

  if (user.role === 'superAdmin') {
    return <SuperAdminDashboard />;
  }

  // collegeAdmin and attendanceAuditor
  return <CollegeAdminDashboard user={user} isAuditor={user.role === 'attendanceAuditor'} />;
}

// ==========================================
// 1. STUDENT DASHBOARD
// ==========================================
function StudentDashboard({ studentId }: { studentId: string }) {
  const { data: summaryData, isLoading: loadingSummary } = useQuery({
    queryKey: ['student-summary', studentId],
    queryFn: () => apiClient<ApiResponse<StudentAttendanceSummary>>(`/reports/students/${studentId}`),
    enabled: !!studentId,
  });

  const { data: faceStatusData, isLoading: loadingFace } = useQuery({
    queryKey: ['face-status', studentId],
    queryFn: () => apiClient<ApiResponse<FaceEnrollmentStatus>>(`/face/students/${studentId}/face-enrollment/status`),
    enabled: !!studentId,
  });

  const { data: liveSessionsData } = useQuery({
    queryKey: ['live-sessions'],
    queryFn: () => apiClient<ApiResponse<AttendanceSession[]>>('/attendance/sessions?state=open&limit=5'),
  });

  const summary = summaryData?.data?.summary;
  const history = summaryData?.data?.history || [];
  const faceStatus = faceStatusData?.data;
  const liveSessions = Array.isArray(liveSessionsData?.data) ? liveSessionsData.data : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Portal"
        description="View your personal attendance progress, face verification status, and live class sessions"
      />

      {/* Biometric Status Alert Card */}
      {!loadingFace && (
        <Card className={faceStatus?.isEnrolled ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/60 dark:bg-emerald-950/20' : 'border-amber-200 bg-amber-50/50 dark:border-amber-900/60 dark:bg-amber-950/20'}>
          <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className={`p-2.5 rounded-lg shrink-0 ${faceStatus?.isEnrolled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'}`}>
                <Camera className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {faceStatus?.isEnrolled ? 'Biometric Face Enrolled' : 'Face Biometric Enrollment Required'}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  {faceStatus?.isEnrolled
                    ? `Enrolled template model: ${faceStatus.provider || 'ONNX/ArcFace'}. You can attend live attendance sessions.`
                    : 'You must enroll your facial template once to verify your attendance during class sessions.'}
                </p>
              </div>
            </div>
            <Link href="/student/face-enrollment">
              <Button size="sm" variant={faceStatus?.isEnrolled ? 'outline' : 'primary'}>
                {faceStatus?.isEnrolled ? 'Manage Biometrics' : 'Enroll Face Now'}
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Attendance Rate</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center justify-between">
              {loadingSummary ? <Skeleton className="h-8 w-16" /> : formatPercentage(summary?.attendancePercentage)}
              <TrendingUp className="h-5 w-5 text-indigo-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full bg-slate-100 rounded-full h-1.5 dark:bg-slate-800 overflow-hidden">
              <div
                className="bg-indigo-600 h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.max(0, summary?.attendancePercentage || 0))}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Present Classes</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600 flex items-center justify-between">
              {loadingSummary ? <Skeleton className="h-8 w-12" /> : summary?.present ?? 0}
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-slate-500">Verified attendance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Late Classes</CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600 flex items-center justify-between">
              {loadingSummary ? <Skeleton className="h-8 w-12" /> : summary?.late ?? 0}
              <Clock className="h-5 w-5 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-slate-500">Within lateness grace window</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Missed / Absent</CardDescription>
            <CardTitle className="text-2xl font-bold text-rose-600 flex items-center justify-between">
              {loadingSummary ? <Skeleton className="h-8 w-12" /> : summary?.absent ?? 0}
              <AlertTriangle className="h-5 w-5 text-rose-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-slate-500">Can request correction</p>
          </CardContent>
        </Card>
      </div>

      {/* Live Open Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Live Attendance Sessions</CardTitle>
              <CardDescription>Sessions currently open for verification</CardDescription>
            </div>
            <Badge variant="success">Live Now</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {liveSessions.length === 0 ? (
            <p className="text-xs text-slate-500 py-3">No active sessions open right now. Check back when class starts.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {liveSessions.map((s) => (
                <div key={s._id} className="py-3 flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {typeof s.subjectId === 'object' ? s.subjectId.name : 'Class Session'}
                    </h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {s.topic ? `Topic: ${s.topic} • ` : ''}
                      Window: {s.attendanceWindowMinutes} min
                    </p>
                  </div>
                  <Link href={`/student/verify?sessionId=${s._id}`}>
                    <Button size="sm" variant="primary">
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                      Mark Attendance
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent History Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Recent Attendance Records</CardTitle>
              <CardDescription>Your latest class verifications</CardDescription>
            </div>
            <Link href="/student/history" className="text-xs font-medium text-indigo-600 hover:underline">
              View All History →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loadingSummary ? (
            <div className="space-y-2 py-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No attendance records recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 pb-2">
                    <th className="py-2">Date & Time</th>
                    <th className="py-2">Subject</th>
                    <th className="py-2">Method</th>
                    <th className="py-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {history.slice(0, 5).map((h) => (
                    <tr key={h.recordId} className="hover:bg-slate-50/50">
                      <td className="py-2.5 text-slate-700 dark:text-slate-300">{formatDateTime(h.date)}</td>
                      <td className="py-2.5 font-medium text-slate-900 dark:text-slate-100">{h.subject || 'Subject'}</td>
                      <td className="py-2.5 capitalize text-slate-500">{h.verificationMethod}</td>
                      <td className="py-2.5 text-right">
                        <AttendanceStatusBadge status={h.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ==========================================
// 2. FACULTY DASHBOARD
// ==========================================
function FacultyDashboard({ user }: { user: { fullName?: string; email: string } }) {
  const { data: sessionsData, isLoading: loadingSessions } = useQuery({
    queryKey: ['faculty-sessions'],
    queryFn: () => apiClient<ApiResponse<AttendanceSession[]>>('/attendance/sessions?limit=5'),
  });

  const { data: overviewData } = useQuery({
    queryKey: ['daily-overview'],
    queryFn: () => apiClient<ApiResponse<DailyOverviewData>>('/reports/overview'),
  });

  const sessions = Array.isArray(sessionsData?.data) ? sessionsData.data : [];
  const overview = overviewData?.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user.fullName || 'Faculty Member'}`}
        description="Schedule attendance sessions, manage live attendance windows, and review rosters"
        actions={
          <Link href="/attendance/sessions?create=1">
            <Button size="sm" variant="primary">
              <CalendarDays className="h-4 w-4 mr-1.5" />
              Create Attendance Session
            </Button>
          </Link>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Today&apos;s Live Sessions</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600">
              {overview?.sessions?.open ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-slate-500">Currently taking attendance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Closed Sessions</CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-700 dark:text-slate-300">
              {overview?.sessions?.closed ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-slate-500">Completed today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Attendance Verified</CardDescription>
            <CardTitle className="text-2xl font-bold text-indigo-600">
              {overview?.totalAttendanceMarkedToday ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-slate-500">Biometric submissions today</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">My Attendance Sessions</CardTitle>
              <CardDescription>Scheduled and active sessions</CardDescription>
            </div>
            <Link href="/attendance/sessions" className="text-xs font-medium text-indigo-600 hover:underline">
              View All Sessions →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loadingSessions ? (
            <div className="space-y-2 py-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-xs text-slate-500 mb-3">No sessions scheduled yet.</p>
              <Link href="/attendance/sessions?create=1">
                <Button size="sm" variant="outline">Schedule First Session</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 pb-2">
                    <th className="py-2">Date</th>
                    <th className="py-2">Subject</th>
                    <th className="py-2">Topic</th>
                    <th className="py-2">Present</th>
                    <th className="py-2">State</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sessions.map((s) => (
                    <tr key={s._id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 text-slate-700 dark:text-slate-300">{formatDateTime(s.sessionDate)}</td>
                      <td className="py-2.5 font-medium text-slate-900 dark:text-slate-100">
                        {typeof s.subjectId === 'object' ? s.subjectId.name : 'Subject'}
                      </td>
                      <td className="py-2.5 text-slate-500">{s.topic || '—'}</td>
                      <td className="py-2.5 font-semibold text-emerald-600">{s.presentCount ?? 0}</td>
                      <td className="py-2.5">
                        <SessionStateBadge state={s.state} />
                      </td>
                      <td className="py-2.5 text-right">
                        <Link href={`/attendance/sessions?sessionId=${s._id}`}>
                          <Button size="sm" variant="outline">Manage</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ==========================================
// 3. COLLEGE ADMIN DASHBOARD
// ==========================================
function CollegeAdminDashboard({ user, isAuditor }: { user: { fullName?: string }; isAuditor?: boolean }) {
  const { data: overviewData, isLoading } = useQuery({
    queryKey: ['daily-overview'],
    queryFn: () => apiClient<ApiResponse<DailyOverviewData>>('/reports/overview'),
  });

  const overview = overviewData?.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isAuditor ? 'Attendance Audit & Inspection' : 'College Administration Portal'}
        description="Comprehensive overview of academic attendance, session activities, and enrollment statistics"
        actions={
          !isAuditor && (
            <div className="flex gap-2">
              <Link href="/academic/classes">
                <Button size="sm" variant="outline">Manage Academic Classes</Button>
              </Link>
              <Link href="/reports">
                <Button size="sm" variant="primary">Attendance Reports</Button>
              </Link>
            </div>
          )
        }
      />

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Enrolled Students</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center justify-between">
              {isLoading ? <Skeleton className="h-8 w-16" /> : overview?.totalStudents ?? 0}
              <Users className="h-5 w-5 text-indigo-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-slate-500">Across all academic sections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Attendance Marked Today</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600 flex items-center justify-between">
              {isLoading ? <Skeleton className="h-8 w-16" /> : overview?.totalAttendanceMarkedToday ?? 0}
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-slate-500">Verified biometric records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open Live Sessions</CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600 flex items-center justify-between">
              {isLoading ? <Skeleton className="h-8 w-12" /> : overview?.sessions?.open ?? 0}
              <Clock className="h-5 w-5 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-slate-500">Currently active sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Sessions Today</CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between">
              {isLoading ? <Skeleton className="h-8 w-12" /> : overview?.sessions?.total ?? 0}
              <CalendarDays className="h-5 w-5 text-slate-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-slate-500">
              {overview?.sessions?.closed ?? 0} closed • {overview?.sessions?.draft ?? 0} draft
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/reports" className="block">
          <Card className="hover:border-indigo-400 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-indigo-600" /> Attendance Reports & CSV
              </CardTitle>
              <CardDescription>
                Generate student-wise and class-wise attendance percentages, safe formula-injection-free CSV exports.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/attendance/corrections" className="block">
          <Card className="hover:border-indigo-400 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-emerald-600" /> Correction Review Requests
              </CardTitle>
              <CardDescription>
                Review and approve or reject attendance correction disputes filed by students and faculty.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/audit" className="block">
          <Card className="hover:border-indigo-400 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-purple-600" /> Immutable Audit Trail
              </CardTitle>
              <CardDescription>
                Inspect tamper-proof audit events for biometric verification, authentication, and session closures.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}

// ==========================================
// 4. SUPER ADMIN DASHBOARD
// ==========================================
function SuperAdminDashboard() {
  const { data: collegesData, isLoading } = useQuery({
    queryKey: ['colleges-list'],
    queryFn: () => apiClient<ApiResponse<any[]>>('/colleges?limit=5'),
  });

  const colleges = Array.isArray(collegesData?.data) ? collegesData.data : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="SuperAdmin Platform Dashboard"
        description="Global multi-tenant administration, college provisioning, and tenant state control"
        actions={
          <Link href="/colleges">
            <Button size="sm" variant="primary">
              <Building2 className="h-4 w-4 mr-1.5" />
              Manage All Colleges
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Registered Tenants</CardDescription>
            <CardTitle className="text-2xl font-bold text-indigo-600">
              {isLoading ? <Skeleton className="h-8 w-12" /> : colleges.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-slate-500">Autonomous institutions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Security Model</CardDescription>
            <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100">
              AES-256-GCM
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-slate-500">Biometric template encryption at rest</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Audit Policy</CardDescription>
            <CardTitle className="text-base font-bold text-emerald-600">
              365-Day Retention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-slate-500">Automated MongoDB TTL pruning</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Registered Colleges</CardTitle>
              <CardDescription>Active tenant institutions</CardDescription>
            </div>
            <Link href="/colleges" className="text-xs font-medium text-indigo-600 hover:underline">
              View All Colleges →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2 py-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : colleges.length === 0 ? (
            <p className="text-xs text-slate-500 py-4">No colleges registered yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 pb-2">
                    <th className="py-2">College Name</th>
                    <th className="py-2">Tenant Code</th>
                    <th className="py-2">Domain</th>
                    <th className="py-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {colleges.map((c: any) => (
                    <tr key={c._id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 font-medium text-slate-900 dark:text-slate-100">{c.name}</td>
                      <td className="py-2.5 font-mono text-slate-600 dark:text-slate-400">{c.tenantCode}</td>
                      <td className="py-2.5 text-slate-500">{c.domain || '—'}</td>
                      <td className="py-2.5 text-right">
                        <Badge variant={c.status === 'active' ? 'success' : 'destructive'}>{c.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
