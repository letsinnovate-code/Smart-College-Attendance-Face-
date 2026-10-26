// frontend/src/types/index.ts
// Strict domain contracts matching backend Mongoose schemas and API envelopes.

export type UserRole = 'superAdmin' | 'collegeAdmin' | 'faculty' | 'student' | 'attendanceAuditor';

export type AccountStatus = 'active' | 'inactive' | 'suspended' | 'pendingVerification';

export interface UserProfile {
  firstName?: string;
  lastName?: string;
  phone?: string;
  studentId?: string;
  employeeId?: string;
  departmentId?: string | Department;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'preferNotToSay';
  profileImageUrl?: string;
}

export interface User {
  _id: string;
  id?: string;
  email: string;
  role: UserRole;
  collegeId?: string | College;
  profile?: UserProfile;
  fullName?: string;
  accountStatus: AccountStatus;
  emailVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CollegeSettings {
  attendanceWindowMinutes: number;
  latenessWindowMinutes: number;
  minAttendancePercentage: number;
  allowFaceAttendance: boolean;
  allowManualAttendance: boolean;
  requireBiometricConsent: boolean;
  timezone: string;
}

export interface College {
  _id: string;
  name: string;
  shortName?: string;
  domain?: string;
  tenantCode: string;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  status: 'active' | 'suspended' | 'pending';
  settings: CollegeSettings;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  _id: string;
  collegeId: string;
  name: string;
  code: string;
  headOfDepartment?: string | User | null;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  _id: string;
  collegeId: string;
  departmentId: string | Department;
  code: string;
  name: string;
  credits: number;
  level: 'undergraduate' | 'postgraduate' | 'diploma' | 'certificate' | 'phd';
  durationSemesters: number;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClassTiming {
  dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  startTime: string;
  endTime: string;
}

export interface AcademicClass {
  _id: string;
  collegeId: string;
  courseId: string | Course;
  departmentId: string | Department;
  section: string;
  academicYear: string;
  semester: number;
  room?: string;
  maxStrength: number;
  classTiming?: ClassTiming[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  _id: string;
  collegeId: string;
  courseId: string | Course;
  code: string;
  name: string;
  credits: number;
  weeklyHours: number;
  semester: number;
  isElective: boolean;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FacultyAssignment {
  _id: string;
  collegeId: string;
  facultyId: string | User;
  classId: string | AcademicClass;
  subjectId: string | Subject;
  assignedBy: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentEnrollment {
  _id: string;
  collegeId: string;
  studentId: string | User;
  classId: string | AcademicClass;
  rollNumber?: string;
  status: 'active' | 'dropped' | 'completed' | 'transferred';
  enrolledAt: string;
  droppedAt?: string;
  completedAt?: string;
}

export type SessionState = 'draft' | 'open' | 'closed' | 'cancelled';

export interface AttendanceSession {
  _id: string;
  collegeId: string;
  classId: string | AcademicClass;
  subjectId: string | Subject;
  facultyId: string | User;
  sessionDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  state: SessionState;
  openedAt?: string;
  closedAt?: string;
  attendanceWindowMinutes: number;
  latenessWindowMinutes: number;
  presentCount?: number;
  absentCount?: number;
  topic?: string;
  notes?: string;
  cancelledReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | 'unverified';

export interface AttendanceRecord {
  _id: string;
  collegeId: string;
  sessionId: string | AttendanceSession;
  studentId: string | User;
  classId: string | AcademicClass;
  subjectId: string | Subject;
  status: AttendanceStatus;
  verificationMethod: 'face' | 'manual' | 'override' | 'none';
  verificationScore?: number;
  verificationFailed?: boolean;
  markedAt: string;
  markedBy?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceCorrectionRequest {
  _id: string;
  collegeId: string;
  attendanceRecordId?: string | AttendanceRecord;
  recordId?: string | AttendanceRecord;
  sessionId?: string | AttendanceSession;
  studentId?: string | User;
  requestedBy: string | User;
  originalStatus: AttendanceStatus;
  requestedStatus: AttendanceStatus;
  reason: string;
  reviewStatus: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  reviewedBy?: string | User;
  reviewNotes?: string;
  reviewComment?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  _id: string;
  actor: string | User;
  action: string;
  targetType?: string;
  targetId?: string;
  collegeId?: string | College;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  requestId?: string;
}

export interface ApiPaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationMeta;
  requestId?: string;
}

export interface ApiError {
  success: false;
  code: string;
  message: string;
  errors?: { field: string; message: string }[];
  requestId?: string;
}

export interface FaceEnrollmentStatus {
  isEnrolled: boolean;
  enrolledAt?: string;
  provider?: string;
  qualityScore?: number;
  templateId?: string;
}

export interface DailyOverviewData {
  date: string;
  totalStudents: number;
  totalAttendanceMarkedToday: number;
  sessions: {
    draft: number;
    open: number;
    closed: number;
    cancelled: number;
    total: number;
  };
}

export interface StudentAttendanceSummary {
  student: {
    id: string;
    name: string;
    studentId?: string;
    email: string;
  };
  summary: {
    total: number;
    present: number;
    late: number;
    absent: number;
    attendancePercentage: number;
  };
  history: {
    recordId: string;
    date: string;
    subject?: string;
    subjectCode?: string;
    status: AttendanceStatus;
    verificationMethod: string;
    markedAt: string;
  }[];
}

export interface ClassAttendanceStudentItem {
  studentId: string;
  studentCode: string;
  studentName: string;
  rollNumber: string;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  totalClasses: number;
  attendancePercentage: number;
}

export interface ClassAttendanceReport {
  class: AcademicClass;
  totalSessions: number;
  students: ClassAttendanceStudentItem[];
}
