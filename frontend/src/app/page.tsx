'use client';

import React from 'react';
import Link from 'next/link';
import {
  Camera,
  ShieldCheck,
  Building2,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  GraduationCap,
  FileSpreadsheet,
  Lock,
  Layers,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-sm font-bold tracking-tight text-white">SmartAttend</span>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
                Biometric Engine
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center space-x-6 text-xs font-medium text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#roles" className="hover:text-white transition-colors">Portals & Roles</a>
            <a href="#biometrics" className="hover:text-white transition-colors">Biometric Security</a>
            <a href="#compliance" className="hover:text-white transition-colors">Accreditation</a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link href="/register-student">
              <Button size="sm" variant="outline" className="hidden sm:inline-flex border-emerald-500/50 text-emerald-400 hover:bg-emerald-950/40">
                Student Enrollment
              </Button>
            </Link>
            <Link href="/register-college">
              <Button size="sm" variant="outline" className="hidden sm:inline-flex border-indigo-500/50 text-indigo-300 hover:bg-indigo-950/40">
                Register College
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32">
        {/* Ambient Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-[600px] rounded-full bg-indigo-600/20 blur-[128px] pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 h-80 w-80 rounded-full bg-emerald-600/15 blur-[120px] pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-950/50 px-3 py-1 text-xs font-semibold text-indigo-300 backdrop-blur-xs">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                <span>Next-Gen Facial AI • Anti-Spoofing Nonce Protection</span>
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-white leading-tight">
                Frictionless Face Attendance for Modern Colleges
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto lg:mx-0 font-normal leading-relaxed">
                Empower professors to initiate attendance sessions with 1 click, allow students to verify with real-time biometric liveness in seconds, eliminate proxy check-ins, and export accredited compliance reports.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3.5 pt-2">
                <Link href="/register-college">
                  <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 font-semibold shadow-lg shadow-indigo-600/30">
                    <Building2 className="h-4 w-4" />
                    Register Your College
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>

                <Link href="/register-student">
                  <Button size="lg" variant="outline" className="border-emerald-500/50 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/40 gap-2 font-semibold">
                    <GraduationCap className="h-4 w-4" />
                    Student Self-Enrollment
                  </Button>
                </Link>

                <Link href="/login">
                  <Button size="lg" variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800">
                    Sign In Console →
                  </Button>
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" /> 100% Tenant Isolation
                </span>
                <span className="flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-indigo-400" /> Single-Frame Nonce Protection
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" /> 75% Semester Policy Compliance
                </span>
              </div>
            </div>

            {/* Right Interactive Simulation Card */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-sm rounded-2xl border border-slate-700 bg-slate-800/90 p-5 shadow-2xl backdrop-blur-xl">
                {/* Simulated Webcam Viewport */}
                <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center">
                  {/* Subtle Grid overlay */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:24px_24px] opacity-20" />
                  
                  {/* Facial Alignment Oval */}
                  <div className="relative z-10 h-44 w-32 rounded-full border-2 border-dashed border-emerald-400/80 shadow-[0_0_20px_rgba(16,185,129,0.3)] flex flex-col items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="mt-2 text-[10px] font-mono font-semibold text-emerald-300 tracking-wider uppercase">
                      Liveness OK
                    </span>
                  </div>

                  {/* Anti-Replay Nonce Stamp */}
                  <div className="absolute top-2.5 left-2.5 rounded bg-black/60 px-2 py-0.5 text-[9px] font-mono text-slate-300 backdrop-blur-xs">
                    CHALLENGE: 0x9b4f2c81 • 45s
                  </div>

                  {/* Verification Pill */}
                  <div className="absolute bottom-2.5 rounded-full bg-emerald-500/90 px-3 py-1 text-xs font-bold text-white shadow-lg backdrop-blur-xs flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Attendance Confirmed: Present</span>
                  </div>
                </div>

                {/* Card Meta Stats */}
                <div className="mt-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                    <span className="text-slate-400">Class Section</span>
                    <span className="font-semibold text-white">CS501 • OS & Architecture (Sec A)</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                    <span className="text-slate-400">Student Identity</span>
                    <span className="font-semibold text-white">Rahul Mehta (Roll: 01)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Confidence Score</span>
                    <span className="font-mono font-bold text-emerald-400">99.4% (Threshold: 85%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Pillar Features */}
      <section id="features" className="border-t border-slate-800 bg-slate-950/60 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Engine Architecture</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Engineered for Institutional Scale & Privacy
            </p>
            <p className="mt-3 text-sm text-slate-400">
              Built on Node.js, Express, and MongoDB with a pluggable AI face recognition pipeline.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm hover:border-indigo-500/40 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                <Camera className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">Anti-Spoofing & Replay Protection</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Prevents photo and screen projection attacks with single-use cryptographic challenge nonces and strict expiry windows.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm hover:border-emerald-500/40 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">Dynamic Session Lifecycle</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Professors control attendance windows in real time. Grace periods mark late check-ins while automated workers archive expired sessions.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm hover:border-purple-500/40 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">Accredited CSV & Compliance Reports</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Generates instant roll-call percentages with 75% exam compliance flagging and CSV sanitization against formula injection attacks.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm hover:border-amber-500/40 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">Academic Hierarchy Management</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Full relational modeling for multi-department colleges, degree programs, cohorts, sections, and faculty teaching assignments.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm hover:border-rose-500/40 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-rose-600/20 text-rose-400 flex items-center justify-center">
                <UserCheck className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">Formal Dispute Audit Trail</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Students can file attendance correction requests with justifications. Professors review, approve, or reject with immutable logging.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm hover:border-blue-500/40 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">Multi-Tenant Isolation</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Each college operates in strict tenant isolation. Student biometrics and attendance records never bleed across institutional boundaries.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Role Matrix */}
      <section id="roles" className="border-t border-slate-800 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Role-Specific Workflows</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Tailored Portals for Every Campus Stakeholder
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Student */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
              <span className="rounded bg-emerald-950/70 px-2.5 py-1 text-[11px] font-bold text-emerald-400 border border-emerald-500/30 uppercase">
                Student Portal
              </span>
              <h3 className="mt-3 text-lg font-bold text-white">Students</h3>
              <ul className="mt-4 space-y-2 text-xs text-slate-400">
                <li className="flex items-center gap-2">✓ Self-service registration & onboarding</li>
                <li className="flex items-center gap-2">✓ Webcam biometric face enrollment</li>
                <li className="flex items-center gap-2">✓ 1-click lecture check-in studio</li>
                <li className="flex items-center gap-2">✓ Personal 75% compliance tracker</li>
                <li className="flex items-center gap-2">✓ File attendance correction disputes</li>
              </ul>
              <Link href="/register-student" className="mt-6 inline-flex items-center text-xs font-semibold text-emerald-400 hover:text-emerald-300">
                Enroll as Student →
              </Link>
            </div>

            {/* Faculty */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
              <span className="rounded bg-indigo-950/70 px-2.5 py-1 text-[11px] font-bold text-indigo-400 border border-indigo-500/30 uppercase">
                Faculty Portal
              </span>
              <h3 className="mt-3 text-lg font-bold text-white">Professors</h3>
              <ul className="mt-4 space-y-2 text-xs text-slate-400">
                <li className="flex items-center gap-2">✓ View assigned class sections</li>
                <li className="flex items-center gap-2">✓ Open & close attendance windows</li>
                <li className="flex items-center gap-2">✓ Real-time student roster updates</li>
                <li className="flex items-center gap-2">✓ Manual overrides with audit trail</li>
                <li className="flex items-center gap-2">✓ Review and resolve student disputes</li>
              </ul>
              <Link href="/login" className="mt-6 inline-flex items-center text-xs font-semibold text-indigo-400 hover:text-indigo-300">
                Faculty Sign In →
              </Link>
            </div>

            {/* College Admin */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
              <span className="rounded bg-purple-950/70 px-2.5 py-1 text-[11px] font-bold text-purple-400 border border-purple-500/30 uppercase">
                Campus Admin
              </span>
              <h3 className="mt-3 text-lg font-bold text-white">College Admins</h3>
              <ul className="mt-4 space-y-2 text-xs text-slate-400">
                <li className="flex items-center gap-2">✓ Manage departments & degree programs</li>
                <li className="flex items-center gap-2">✓ Configure classes, rooms, & strength</li>
                <li className="flex items-center gap-2">✓ Assign professors to subjects</li>
                <li className="flex items-center gap-2">✓ Enroll & drop cohort students</li>
                <li className="flex items-center gap-2">✓ Configure campus timezone & windows</li>
              </ul>
              <Link href="/register-college" className="mt-6 inline-flex items-center text-xs font-semibold text-purple-400 hover:text-purple-300">
                Register Institution →
              </Link>
            </div>

            {/* Super Admin */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
              <span className="rounded bg-rose-950/70 px-2.5 py-1 text-[11px] font-bold text-rose-400 border border-rose-500/30 uppercase">
                Super Admin
              </span>
              <h3 className="mt-3 text-lg font-bold text-white">Platform Admins</h3>
              <ul className="mt-4 space-y-2 text-xs text-slate-400">
                <li className="flex items-center gap-2">✓ Multi-college tenant management</li>
                <li className="flex items-center gap-2">✓ Suspend or activate institutions</li>
                <li className="flex items-center gap-2">✓ Inspect immutable security audit logs</li>
                <li className="flex items-center gap-2">✓ Provision college administrators</li>
                <li className="flex items-center gap-2">✓ System-wide biometric health overview</li>
              </ul>
              <Link href="/login" className="mt-6 inline-flex items-center text-xs font-semibold text-rose-400 hover:text-rose-300">
                Console Login →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs">
              S
            </div>
            <span className="text-sm font-semibold text-white">SmartAttend College Systems</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <Link href="/register-college" className="hover:text-white">Register College</Link>
            <Link href="/register-student" className="hover:text-white">Student Enrollment</Link>
            <Link href="/login" className="hover:text-white">Sign In</Link>
          </div>

          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} SmartAttend. Production Biometric Attendance Platform.
          </p>
        </div>
      </footer>
    </div>
  );
}
