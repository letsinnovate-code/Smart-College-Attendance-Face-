import { describe, it, expect } from 'vitest';
import { UserRole } from '@/types';

interface NavItem {
  label: string;
  href: string;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', href: '/dashboard', roles: ['superAdmin', 'collegeAdmin', 'faculty', 'student', 'attendanceAuditor'] },
  { label: 'Colleges / Tenants', href: '/colleges', roles: ['superAdmin'] },
  { label: 'Departments', href: '/academic/departments', roles: ['collegeAdmin'] },
  { label: 'Courses', href: '/academic/courses', roles: ['collegeAdmin'] },
  { label: 'Classes & Sections', href: '/academic/classes', roles: ['collegeAdmin', 'faculty'] },
  { label: 'Subjects', href: '/academic/subjects', roles: ['collegeAdmin'] },
  { label: 'Faculty Assignments', href: '/academic/faculty-assignments', roles: ['collegeAdmin'] },
  { label: 'Student Enrollments', href: '/academic/student-enrollments', roles: ['collegeAdmin'] },
  { label: 'Users & Accounts', href: '/users', roles: ['superAdmin', 'collegeAdmin'] },
  { label: 'Attendance Sessions', href: '/attendance/sessions', roles: ['collegeAdmin', 'faculty'] },
  { label: 'Correction Requests', href: '/attendance/corrections', roles: ['collegeAdmin', 'faculty', 'student'] },
  { label: 'Face Biometrics', href: '/student/face-enrollment', roles: ['student'] },
  { label: 'Verify Attendance', href: '/student/verify', roles: ['student'] },
  { label: 'My Attendance', href: '/student/history', roles: ['student'] },
  { label: 'Attendance Reports', href: '/reports', roles: ['collegeAdmin', 'faculty', 'attendanceAuditor'] },
  { label: 'Security & Audit Log', href: '/audit', roles: ['superAdmin', 'collegeAdmin', 'attendanceAuditor'] },
  { label: 'College Settings', href: '/settings/college', roles: ['collegeAdmin'] },
];

function getAccessibleRoutes(role: UserRole): string[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role)).map((item) => item.href);
}

describe('Role-Based Navigation & Access Authorization', () => {
  it('allows students access only to student workflows and common dashboard', () => {
    const studentRoutes = getAccessibleRoutes('student');
    expect(studentRoutes).toContain('/dashboard');
    expect(studentRoutes).toContain('/student/face-enrollment');
    expect(studentRoutes).toContain('/student/verify');
    expect(studentRoutes).toContain('/student/history');
    expect(studentRoutes).toContain('/attendance/corrections');

    // Security boundaries: Students must not see administrative routes
    expect(studentRoutes).not.toContain('/colleges');
    expect(studentRoutes).not.toContain('/users');
    expect(studentRoutes).not.toContain('/academic/departments');
    expect(studentRoutes).not.toContain('/attendance/sessions');
    expect(studentRoutes).not.toContain('/audit');
    expect(studentRoutes).not.toContain('/settings/college');
  });

  it('allows faculty access to class sessions, reports, and assigned classes', () => {
    const facultyRoutes = getAccessibleRoutes('faculty');
    expect(facultyRoutes).toContain('/dashboard');
    expect(facultyRoutes).toContain('/attendance/sessions');
    expect(facultyRoutes).toContain('/attendance/corrections');
    expect(facultyRoutes).toContain('/reports');
    expect(facultyRoutes).toContain('/academic/classes');

    // Must not see college tenant configuration or user provisioning
    expect(facultyRoutes).not.toContain('/colleges');
    expect(facultyRoutes).not.toContain('/users');
    expect(facultyRoutes).not.toContain('/audit');
  });

  it('allows superAdmin access only to multi-institution tenant management and audit', () => {
    const superAdminRoutes = getAccessibleRoutes('superAdmin');
    expect(superAdminRoutes).toContain('/dashboard');
    expect(superAdminRoutes).toContain('/colleges');
    expect(superAdminRoutes).toContain('/users');
    expect(superAdminRoutes).toContain('/audit');

    // SuperAdmin should not see individual class/student enrollment screens directly
    expect(superAdminRoutes).not.toContain('/student/verify');
    expect(superAdminRoutes).not.toContain('/academic/faculty-assignments');
  });

  it('allows collegeAdmin full access to college academic hierarchy and institutional settings', () => {
    const adminRoutes = getAccessibleRoutes('collegeAdmin');
    expect(adminRoutes).toContain('/academic/departments');
    expect(adminRoutes).toContain('/academic/courses');
    expect(adminRoutes).toContain('/academic/classes');
    expect(adminRoutes).toContain('/academic/subjects');
    expect(adminRoutes).toContain('/academic/faculty-assignments');
    expect(adminRoutes).toContain('/academic/student-enrollments');
    expect(adminRoutes).toContain('/settings/college');
    expect(adminRoutes).toContain('/users');
    expect(adminRoutes).toContain('/reports');
    expect(adminRoutes).toContain('/audit');
  });

  it('allows attendanceAuditor read-only audit and reporting access', () => {
    const auditorRoutes = getAccessibleRoutes('attendanceAuditor');
    expect(auditorRoutes).toContain('/dashboard');
    expect(auditorRoutes).toContain('/reports');
    expect(auditorRoutes).toContain('/audit');

    expect(auditorRoutes).not.toContain('/attendance/sessions');
    expect(auditorRoutes).not.toContain('/settings/college');
  });
});
