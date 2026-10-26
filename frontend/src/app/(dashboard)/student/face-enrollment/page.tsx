'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, CheckCircle2, Shield, Trash2, AlertCircle, Info, Lock } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { apiClient } from '@/lib/api-client';
import { ApiResponse, FaceEnrollmentStatus } from '@/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/dialog';
import { CameraCapture } from '@/components/features/biometrics/camera-capture';
import { formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';

export default function FaceEnrollmentPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const studentId = user?._id || user?.id || '';

  const [hasConsented, setHasConsented] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);

  // 1. Fetch current biometric enrollment status
  const { data: statusData, isLoading } = useQuery({
    queryKey: ['face-status', studentId],
    queryFn: () => apiClient<ApiResponse<FaceEnrollmentStatus>>(`/face/students/${studentId}/face-enrollment/status`),
    enabled: !!studentId,
  });

  const enrollmentStatus = statusData?.data;

  // 2. Enrollment challenge mutation
  const enrollMutation = useMutation({
    mutationFn: async (imageBlob: Blob) => {
      // Step A: Request a fresh anti-replay challenge nonce
      const challengeRes = await apiClient<ApiResponse<{ challengeId: string; expiresAt: string }>>(
        `/face/students/${studentId}/face-enrollment`,
        { method: 'POST' },
      );

      const challengeId = challengeRes.data.challengeId;

      // Step B: Submit image with challenge nonce and explicit consent
      const formData = new FormData();
      formData.append('image', imageBlob, 'enrollment_selfie.jpg');
      formData.append('challengeId', challengeId);
      formData.append('consent', 'true');

      return apiClient<ApiResponse<{ templateId: string; provider: string; enrolledAt: string }>>(
        `/face/students/${studentId}/face-enrollment/confirm`,
        {
          method: 'POST',
          body: formData,
        },
      );
    },
    onSuccess: (data) => {
      toast.success('Face template successfully enrolled and encrypted');
      setIsCapturing(false);
      queryClient.invalidateQueries({ queryKey: ['face-status', studentId] });
      queryClient.invalidateQueries({ queryKey: ['student-summary', studentId] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Face enrollment failed. Please ensure single frontal face.';
      toast.error(msg);
    },
  });

  // 3. Template revocation mutation
  const revokeMutation = useMutation({
    mutationFn: async () => {
      return apiClient(`/face/students/${studentId}/face-template`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast.success('Biometric face template revoked and deleted');
      setRevokeDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['face-status', studentId] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to revoke biometric template');
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Biometric Face Enrollment"
        description="Manage your facial recognition template used for automated classroom attendance verification"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Biometrics' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Enrollment Studio */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Camera className="h-4 w-4 text-indigo-600" />
                    Biometric Capture Studio
                  </CardTitle>
                  <CardDescription>
                    Follow the on-screen guides to register or update your face template
                  </CardDescription>
                </div>
                {enrollmentStatus?.isEnrolled ? (
                  <Badge variant="success">Enrolled & Active</Badge>
                ) : (
                  <Badge variant="warning">Not Enrolled</Badge>
                )}
              </div>
            </CardHeader>

            <CardContent>
              {isCapturing ? (
                <div className="py-2">
                  <CameraCapture
                    onCapture={(blob) => enrollMutation.mutate(blob)}
                    isProcessing={enrollMutation.isPending}
                  />
                  <div className="mt-4 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsCapturing(false)}
                      disabled={enrollMutation.isPending}
                    >
                      Cancel Capture
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Privacy & Purpose Policy */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-850 text-xs text-slate-600 dark:text-slate-300 space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                      <Lock className="h-4 w-4 text-indigo-600" />
                      Biometric Data & Privacy Policy
                    </div>
                    <p>
                      Your facial imagery is converted into a mathematical 512-dimensional vector embedding.
                      Raw photographs are <strong>never stored</strong> in any database. Embeddings are secured
                      using authenticated <strong>AES-256-GCM encryption</strong> and used exclusively for verifying
                      attendance in your enrolled academic sessions.
                    </p>
                    <p>
                      You retain full control over your biometric data and may exercise your right-to-be-forgotten by revoking
                      your template at any time.
                    </p>
                  </div>

                  {/* Consent Gate */}
                  {!enrollmentStatus?.isEnrolled && (
                    <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 cursor-pointer dark:border-slate-800 dark:hover:bg-slate-800/60 transition-colors">
                      <input
                        type="checkbox"
                        checked={hasConsented}
                        onChange={(e) => setHasConsented(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                        I hereby give affirmative consent to enroll my facial biometric template for academic attendance verification.
                      </span>
                    </label>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => setIsCapturing(true)}
                      disabled={!enrollmentStatus?.isEnrolled && !hasConsented}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      {enrollmentStatus?.isEnrolled ? 'Re-enroll / Update Face' : 'Start Camera & Enroll Face'}
                    </Button>

                    {enrollmentStatus?.isEnrolled && (
                      <Button
                        variant="destructive"
                        size="md"
                        onClick={() => setRevokeDialogOpen(true)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Revoke Biometric Template
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Template Info & Instructions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Active Template Metadata</CardTitle>
              <CardDescription>Server-authoritative status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Status</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {enrollmentStatus?.isEnrolled ? 'Active' : 'Unenrolled'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Provider</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {enrollmentStatus?.provider || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Enrolled At</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {enrollmentStatus?.enrolledAt ? formatDateTime(enrollmentStatus.enrolledAt) : '—'}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Quality Score</span>
                <span className="font-semibold text-emerald-600">
                  {enrollmentStatus?.qualityScore ? `${Math.round(enrollmentStatus.qualityScore * 100)}%` : '—'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Info className="h-4 w-4 text-indigo-600" /> Capture Best Practices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <li>Look directly into the camera with a neutral expression.</li>
                <li>Ensure well-lit conditions avoiding strong backlighting.</li>
                <li>Remove sunglasses, heavy face coverings, or hats.</li>
                <li>Keep only one person in the frame.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog for Template Revocation */}
      <ConfirmDialog
        isOpen={revokeDialogOpen}
        onClose={() => setRevokeDialogOpen(false)}
        onConfirm={() => revokeMutation.mutate()}
        title="Revoke Biometric Face Template?"
        description="This will permanently delete your encrypted facial vector from the college database. You will not be able to mark attendance with facial recognition until you enroll again."
        confirmText="Revoke & Delete"
        isDestructive
        isLoading={revokeMutation.isPending}
      />
    </div>
  );
}
