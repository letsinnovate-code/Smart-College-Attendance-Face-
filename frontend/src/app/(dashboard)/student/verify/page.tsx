'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Camera,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  FileCheck2,
} from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { apiClient } from '@/lib/api-client';
import { ApiResponse, AttendanceSession, AttendanceStatus, FaceEnrollmentStatus } from '@/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, SessionStateBadge, AttendanceStatusBadge } from '@/components/ui/badge';
import { CameraCapture } from '@/components/features/biometrics/camera-capture';
import { formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';

interface VerificationResult {
  result: string;
  status: AttendanceStatus | 'rejected';
  markedAt?: string;
  sessionId?: string;
}

function AttendanceVerificationContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const studentId = user?._id || user?.id || '';

  const initialSessionId = searchParams.get('sessionId') || '';
  const [selectedSessionId, setSelectedSessionId] = useState(initialSessionId);
  const [verificationOutcome, setVerificationOutcome] = useState<VerificationResult | null>(null);

  // 1. Check biometric enrollment status first
  const { data: faceStatusData } = useQuery({
    queryKey: ['face-status', studentId],
    queryFn: () => apiClient<ApiResponse<FaceEnrollmentStatus>>(`/face/students/${studentId}/face-enrollment/status`),
    enabled: !!studentId,
  });

  // 2. Fetch live open sessions
  const { data: sessionsData, isLoading: loadingSessions } = useQuery({
    queryKey: ['live-open-sessions'],
    queryFn: () => apiClient<ApiResponse<AttendanceSession[]>>('/attendance/sessions?state=open'),
  });

  const liveSessions = Array.isArray(sessionsData?.data) ? sessionsData.data : [];
  const currentSession = liveSessions.find((s) => s._id === selectedSessionId) || liveSessions[0];
  const activeSessionId = selectedSessionId || currentSession?._id;

  // 3. Attendance verification mutation
  const verifyMutation = useMutation({
    mutationFn: async (imageBlob: Blob) => {
      if (!activeSessionId) throw new Error('No session selected');

      // Step 1: Issue attendance challenge token
      const challengeRes = await apiClient<ApiResponse<{ challengeId: string; expiresAt: string }>>(
        `/attendance/sessions/${activeSessionId}/challenge`,
        { method: 'POST' },
      );

      const challengeId = challengeRes.data.challengeId;

      // Step 2: Verify attendance with challenge nonce and selfie
      const formData = new FormData();
      formData.append('image', imageBlob, 'attendance_selfie.jpg');
      formData.append('challengeId', challengeId);

      return apiClient<ApiResponse<VerificationResult>>(
        `/attendance/sessions/${activeSessionId}/verify`,
        {
          method: 'POST',
          body: formData,
        },
      );
    },
    onSuccess: (res) => {
      setVerificationOutcome(res.data);
      if (res.data.status === 'present') {
        toast.success('Attendance recorded as Present!');
      } else if (res.data.status === 'late') {
        toast.warning('Attendance recorded as Late');
      } else {
        toast.error(`Verification result: ${res.data.result}`);
      }
      queryClient.invalidateQueries({ queryKey: ['student-summary', studentId] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Biometric verification failed';
      toast.error(msg);
      setVerificationOutcome({
        result: 'error',
        status: 'rejected',
      });
    },
  });

  const isEnrolled = faceStatusData?.data?.isEnrolled;

  if (isEnrolled === false) {
    return (
      <div className="space-y-6">
        <PageHeader title="Class Attendance Verification" />
        <Card className="border-amber-200 bg-amber-50/50 p-6 text-center dark:border-amber-900/60 dark:bg-amber-950/20">
          <ShieldAlert className="h-10 w-10 text-amber-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Facial Biometric Enrollment Required
          </h3>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto">
            You must register your face template once before you can verify your attendance in class sessions.
          </p>
          <div className="mt-4">
            <Link href="/student/face-enrollment">
              <Button size="sm" variant="primary">
                Proceed to Biometric Enrollment <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Class Attendance Verification"
        description="Verify your attendance in an active session using AI face recognition"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Verify Attendance' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Verification Studio */}
        <div className="lg:col-span-2 space-y-6">
          {verificationOutcome ? (
            /* Outcome Result Display */
            <Card className={verificationOutcome.status === 'present' || verificationOutcome.status === 'late' ? 'border-emerald-200 bg-emerald-50/20' : 'border-rose-200 bg-rose-50/20'}>
              <CardContent className="p-8 text-center space-y-4">
                <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${verificationOutcome.status === 'present' ? 'bg-emerald-100 text-emerald-600' : verificationOutcome.status === 'late' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'}`}>
                  {verificationOutcome.status === 'present' ? (
                    <CheckCircle2 className="h-8 w-8" />
                  ) : verificationOutcome.status === 'late' ? (
                    <Clock className="h-8 w-8" />
                  ) : (
                    <AlertCircle className="h-8 w-8" />
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {verificationOutcome.status === 'present'
                      ? 'Attendance Confirmed: Present'
                      : verificationOutcome.status === 'late'
                      ? 'Attendance Confirmed: Late'
                      : 'Verification Unsuccessful'}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Result code: <code className="font-mono font-semibold">{verificationOutcome.result}</code>
                  </p>
                </div>

                {verificationOutcome.markedAt && (
                  <p className="text-xs text-slate-600">
                    Timestamp: {formatDateTime(verificationOutcome.markedAt)}
                  </p>
                )}

                <div className="flex justify-center gap-3 pt-3">
                  <Button variant="outline" size="sm" onClick={() => setVerificationOutcome(null)}>
                    Try Another Session
                  </Button>
                  {verificationOutcome.status === 'rejected' && (
                    <Link href="/attendance/corrections">
                      <Button variant="primary" size="sm">
                        <FileCheck2 className="h-3.5 w-3.5 mr-1.5" /> File Attendance Correction
                      </Button>
                    </Link>
                  )}
                  <Link href="/student/history">
                    <Button variant="primary" size="sm">
                      View Attendance Record
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Live Camera Capture Form */
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-indigo-600" />
                      Attendance Camera Studio
                    </CardTitle>
                    <CardDescription>
                      {currentSession
                        ? `Ready to record attendance for ${typeof currentSession.subjectId === 'object' ? currentSession.subjectId.name : 'Class'}`
                        : 'No session selected'}
                    </CardDescription>
                  </div>
                  {currentSession && <SessionStateBadge state={currentSession.state} />}
                </div>
              </CardHeader>

              <CardContent>
                {!currentSession ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    No active sessions are open right now. Attendance can only be recorded when a faculty member opens a session.
                  </div>
                ) : (
                  <CameraCapture
                    onCapture={(blob) => verifyMutation.mutate(blob)}
                    isProcessing={verifyMutation.isPending}
                  />
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Active Session Selector & Details */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Available Open Sessions</CardTitle>
              <CardDescription>Select the session you are attending</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSessions ? (
                <div className="space-y-2 py-2">
                  <div className="h-8 bg-slate-100 rounded animate-pulse" />
                  <div className="h-8 bg-slate-100 rounded animate-pulse" />
                </div>
              ) : liveSessions.length === 0 ? (
                <p className="text-xs text-slate-500 py-3">No sessions currently taking attendance.</p>
              ) : (
                <div className="space-y-2">
                  {liveSessions.map((s) => {
                    const isSelected = (activeSessionId || currentSession?._id) === s._id;
                    const subjectName = typeof s.subjectId === 'object' ? s.subjectId.name : 'Class';
                    const subjectCode = typeof s.subjectId === 'object' ? s.subjectId.code : '';

                    return (
                      <button
                        key={s._id}
                        type="button"
                        onClick={() => {
                          setSelectedSessionId(s._id);
                          setVerificationOutcome(null);
                        }}
                        className={`w-full text-left p-3 rounded-lg border text-xs transition-colors ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 font-medium dark:bg-indigo-950/40 dark:text-indigo-200'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{subjectName}</span>
                          <span className="text-[10px] font-mono text-slate-500">{subjectCode}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {s.topic ? `Topic: ${s.topic}` : 'General Lecture'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Anti-Spoofing & Liveness</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 dark:text-slate-400 space-y-2">
              <p>
                Each attendance request requires an encrypted, server-issued nonce valid for 60 seconds to prevent replay attacks.
              </p>
              <p>
                Do not present digital screens, photographs, or pre-recorded video. Spoofing attempts are logged in the audit trail.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AttendanceVerificationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs">Loading attendance verification...</div>}>
      <AttendanceVerificationContent />
    </Suspense>
  );
}
