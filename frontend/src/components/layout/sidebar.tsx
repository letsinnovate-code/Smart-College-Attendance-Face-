'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Users,
  GraduationCap,
  BookOpen,
  CalendarDays,
  FileCheck2,
  Camera,
  BarChart3,
  ShieldCheck,
  Settings,
  UserCheck,
  ClipboardList,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  // Common Dashboard
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard, roles: ['superAdmin', 'collegeAdmin', 'faculty', 'student', 'attendanceAuditor'] },

  // SuperAdmin Only
  { label: 'Colleges / Tenants', href: '/colleges', icon: Building2, roles: ['superAdmin'] },

  // College Admin Academic Hierarchy
  { label: 'Departments', href: '/academic/departments', icon: Layers, roles: ['collegeAdmin'] },
  { label: 'Courses', href: '/academic/courses', icon: BookOpen, roles: ['collegeAdmin'] },
  { label: 'Classes & Sections', href: '/academic/classes', icon: GraduationCap, roles: ['collegeAdmin', 'faculty'] },
  { label: 'Subjects', href: '/academic/subjects', icon: BookOpen, roles: ['collegeAdmin'] },
  { label: 'Faculty Assignments', href: '/academic/faculty-assignments', icon: UserCheck, roles: ['collegeAdmin'] },
  { label: 'Student Enrollments', href: '/academic/student-enrollments', icon: ClipboardList, roles: ['collegeAdmin'] },

  // User Accounts
  { label: 'Users & Accounts', href: '/users', icon: Users, roles: ['superAdmin', 'collegeAdmin'] },

  // Faculty & Admin Attendance Operations
  { label: 'Attendance Sessions', href: '/attendance/sessions', icon: CalendarDays, roles: ['collegeAdmin', 'faculty'] },
  { label: 'Correction Requests', href: '/attendance/corrections', icon: FileCheck2, roles: ['collegeAdmin', 'faculty', 'student'] },

  // Student Biometrics & Self-Verification
  { label: 'Face Biometrics', href: '/student/face-enrollment', icon: Camera, roles: ['student'] },
  { label: 'Verify Attendance', href: '/student/verify', icon: Sparkles, roles: ['student'] },
  { label: 'My Attendance', href: '/student/history', icon: BarChart3, roles: ['student'] },

  // Reporting & Audit
  { label: 'Attendance Reports', href: '/reports', icon: BarChart3, roles: ['collegeAdmin', 'faculty', 'attendanceAuditor'] },
  { label: 'Security & Audit Log', href: '/audit', icon: ShieldCheck, roles: ['superAdmin', 'collegeAdmin', 'attendanceAuditor'] },
  { label: 'College Settings', href: '/settings/college', icon: Settings, roles: ['collegeAdmin'] },
];

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  const accessibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 select-none">
      {/* Brand Header */}
      <div className="flex h-16 items-center border-b border-slate-200 px-6 dark:border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold shadow-xs">
            <Camera className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
              SmartAttend
            </span>
            <span className="block text-[10px] uppercase font-semibold text-slate-400">
              Biometric Engine
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Navigation</p>
        <nav className="space-y-1">
          {accessibleItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-950/70 dark:text-indigo-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200',
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400')} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Status Footer */}
      <div className="border-t border-slate-200 p-4 dark:border-slate-800">
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
            {user.fullName || user.email}
          </p>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">
              {user.role}
            </span>
            <span className="h-2 w-2 rounded-full bg-emerald-500" title="Connected" />
          </div>
        </div>
      </div>
    </aside>
  );
}
