'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  isProcessing?: boolean;
}

export function CameraCapture({ onCapture, isProcessing = false }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);

  // Stop media tracks
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Start media stream
  // Start media stream
  const startCamera = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser environment');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setHasPermission(true);
      setErrorMessage(null);
    } catch (err: unknown) {
      setHasPermission(false);
      const msg = err instanceof Error ? err.message : 'Camera permission was denied or camera is unavailable';
      setErrorMessage(msg);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    const timer = setTimeout(() => {
      void startCamera();
    }, 0);
    return () => {
      clearTimeout(timer);
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const takeSnapshot = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob);
          const previewUrl = URL.createObjectURL(blob);
          setCapturedPreview(previewUrl);
        }
      },
      'image/jpeg',
      0.9,
    );
  };

  const handleRetake = () => {
    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
    }
    setCapturedPreview(null);
    setCapturedBlob(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (capturedBlob) {
      stopCamera();
      onCapture(capturedBlob);
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* Video Viewport / Preview */}
      <div className="relative aspect-4/3 w-full max-w-md overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-900 shadow-md dark:border-slate-800">
        {capturedPreview ? (
          // Captured Snapshot Preview
          // eslint-disable-next-line @next/next/no-img-element
          <img src={capturedPreview} alt="Captured face preview" className="h-full w-full object-cover" />
        ) : (
          // Live Video Stream with Face Alignment Target Oval
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover transform -scale-x-100"
            />
            {/* Face Alignment Oval Guide */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-56 w-44 rounded-full border-2 border-dashed border-indigo-400/80 bg-indigo-500/5 shadow-inner" />
            </div>
            <div className="pointer-events-none absolute bottom-3 inset-x-0 text-center">
              <span className="inline-block rounded-full bg-slate-900/70 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-xs">
                Align your face within the frame
              </span>
            </div>
          </>
        )}

        {/* Error / Permission Overlay */}
        {hasPermission === false && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 p-6 text-center text-white">
            <AlertCircle className="h-10 w-10 text-rose-500 mb-2" />
            <h4 className="text-sm font-semibold">Camera Access Blocked</h4>
            <p className="mt-1 text-xs text-slate-300 max-w-xs">{errorMessage}</p>
            <Button size="sm" variant="outline" onClick={startCamera} className="mt-4 text-white border-white/20">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry Camera Access
            </Button>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="mt-4 flex items-center justify-center gap-3">
        {capturedPreview ? (
          <>
            <Button variant="outline" size="sm" onClick={handleRetake} disabled={isProcessing}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retake Photo
            </Button>
            <Button variant="primary" size="sm" onClick={handleConfirm} isLoading={isProcessing}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Confirm & Submit Face
            </Button>
          </>
        ) : (
          <Button
            variant="primary"
            size="md"
            onClick={takeSnapshot}
            disabled={hasPermission !== true}
            className="px-6"
          >
            <Camera className="h-4 w-4 mr-2" />
            Capture Snapshot
          </Button>
        )}
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
        <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
        <span>Face vectors are encrypted with AES-256-GCM. Raw photos are discarded immediately after embedding.</span>
      </div>
    </div>
  );
}
