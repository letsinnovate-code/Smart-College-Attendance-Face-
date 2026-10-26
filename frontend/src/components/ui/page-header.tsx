import * as React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, breadcrumbs, actions, action }: PageHeaderProps) {
  const headerActions = action || actions;
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400" aria-label="Breadcrumb">
            {breadcrumbs.map((item, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={idx}>
                  {idx > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" />}
                  {item.href && !isLast ? (
                    <Link href={item.href} className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                      {item.label}
                    </Link>
                  ) : (
                    <span className={isLast ? 'font-medium text-slate-900 dark:text-slate-100' : ''}>
                      {item.label}
                    </span>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        )}
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{title}</h1>
        {description && <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">{description}</p>}
      </div>
      {headerActions && <div className="flex flex-wrap items-center gap-2">{headerActions}</div>}
    </div>
  );
}
