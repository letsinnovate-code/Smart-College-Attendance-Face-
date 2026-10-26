'use client';

import React from 'react';
import { Menu, LogOut, Building, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '../ui/button';
import { College } from '@/types';

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, logout } = useAuth();

  const collegeName =
    user?.role === 'superAdmin'
      ? 'Global Platform'
      : (typeof user?.collegeId === 'object' ? (user.collegeId as College)?.name : 'College Tenant');

  const tenantCode =
    user?.role === 'superAdmin'
      ? 'SUPER'
      : (typeof user?.collegeId === 'object' ? (user.collegeId as College)?.tenantCode : null);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xs sm:px-6 dark:border-slate-800 dark:bg-slate-900/95">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none lg:hidden dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="Open mobile menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Tenant Indicator */}
        <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <Building className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
          <span className="font-semibold text-slate-900 dark:text-slate-100 max-w-[200px] truncate">
            {collegeName}
          </span>
          {tenantCode && (
            <span className="rounded bg-indigo-100 px-1.5 py-0.2 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              {tenantCode}
            </span>
          )}
        </div>
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            {user?.fullName || user?.email}
          </p>
          <p className="text-[10px] font-medium text-slate-500 capitalize">{user?.role}</p>
        </div>

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold text-xs dark:bg-indigo-950 dark:border-indigo-800 dark:text-indigo-300">
          <UserIcon className="h-4 w-4" />
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => logout()}
          className="text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400"
          title="Sign out"
        >
          <LogOut className="h-4 w-4 sm:mr-1.5" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}
