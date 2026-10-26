import * as React from 'react';
import { cn } from '@/lib/utils';
import { AttendanceStatus, SessionState } from '@/types';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'default'
    | 'secondary'
    | 'outline'
    | 'success'
    | 'warning'
    | 'destructive'
    | 'present'
    | 'late'
    | 'absent'
    | 'excused'
    | 'unverified';
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const variants = {
    default: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800',
    secondary: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    outline: 'border border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
    warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
    destructive: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800',
    present: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
    late: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
    absent: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800',
    excused: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800',
    unverified: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize transition-colors',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function AttendanceStatusBadge({ status }: { status: AttendanceStatus }) {
  const map: Record<AttendanceStatus, { label: string; variant: BadgeProps['variant'] }> = {
    present: { label: 'Present', variant: 'present' },
    late: { label: 'Late', variant: 'late' },
    absent: { label: 'Absent', variant: 'absent' },
    excused: { label: 'Excused', variant: 'excused' },
    unverified: { label: 'Unverified', variant: 'unverified' },
  };

  const item = map[status] || { label: status, variant: 'secondary' };
  return <Badge variant={item.variant}>{item.label}</Badge>;
}

export function SessionStateBadge({ state }: { state: SessionState }) {
  const map: Record<SessionState, { label: string; variant: BadgeProps['variant'] }> = {
    draft: { label: 'Draft', variant: 'secondary' },
    open: { label: 'Live / Open', variant: 'success' },
    closed: { label: 'Closed', variant: 'outline' },
    cancelled: { label: 'Cancelled', variant: 'destructive' },
  };

  const item = map[state] || { label: state, variant: 'secondary' };
  return <Badge variant={item.variant}>{item.label}</Badge>;
}
