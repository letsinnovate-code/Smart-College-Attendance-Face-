// scripts/seed.js
// Database seed script with rich realistic initial data for development and demonstration.

import mongoose from 'mongoose';
import env from '../src/config/env.js';
import logger from '../src/config/logger.js';
import { hashPassword } from '../src/services/auth.service.js';

import College from '../src/models/College.js';
import User from '../src/models/User.js';
import Department from '../src/models/Department.js';
import Course from '../src/models/Course.js';
import AcademicClass from '../src/models/AcademicClass.js';
import Subject from '../src/models/Subject.js';
import FacultyAssignment from '../src/models/FacultyAssignment.js';
import StudentEnrollment from '../src/models/StudentEnrollment.js';

async function seed() {
  logger.info('Connecting to MongoDB for seeding...');
  await mongoose.connect(env.MONGODB_URI);

  logger.info('Cleaning existing collections...');
  await Promise.all([
    College.deleteMany({}),
    User.deleteMany({}),
    Department.deleteMany({}),
    Course.deleteMany({}),
    AcademicClass.deleteMany({}),
    Subject.deleteMany({}),
    FacultyAssignment.deleteMany({}),
    StudentEnrollment.deleteMany({}),
  ]);

  // 1. Create SuperAdmin
  const superAdminPassword = await hashPassword('AdminPass123!');
  const superAdmin = await User.create({
    email: 'superadmin@system.local',
    hashedPassword: superAdminPassword,
    role: 'superAdmin',
    profile: {
      firstName: 'System',
      lastName: 'SuperAdmin',
      phone: '+1-555-0100',
    },
    accountStatus: 'active',
    emailVerified: true,
  });
  logger.info('Created SuperAdmin: superadmin@system.local');

  // 2. Create College
  const college = await College.create({
    name: 'Apex Institute of Technology',
    shortName: 'APEX',
    tenantCode: 'APEX',
    domain: 'apex.edu',
    address: '100 Innovation Way, Tech Park',
    contactEmail: 'contact@apex.edu',
    contactPhone: '+1-555-0199',
    status: 'active',
    settings: {
      attendanceWindowMinutes: 30,
      latenessWindowMinutes: 10,
      minAttendancePercentage: 75,
      allowFaceAttendance: true,
      allowManualAttendance: true,
      requireBiometricConsent: true,
      timezone: 'Asia/Kolkata',
    },
    createdBy: superAdmin._id,
  });
  logger.info(`Created College: ${college.name} (${college.tenantCode})`);

  // 3. Create CollegeAdmin
  const collegeAdminPassword = await hashPassword('ApexPass123!');
  const collegeAdmin = await User.create({
    email: 'admin@apex.edu',
    hashedPassword: collegeAdminPassword,
    role: 'collegeAdmin',
    collegeId: college._id,
    profile: {
      firstName: 'Anil',
      lastName: 'Kumar',
      employeeId: 'ADM-001',
      phone: '+1-555-0201',
    },
    accountStatus: 'active',
    emailVerified: true,
    invitedBy: superAdmin._id,
  });
  logger.info('Created CollegeAdmin: admin@apex.edu');

  // 4. Create Department
  const department = await Department.create({
    collegeId: college._id,
    name: 'Computer Science and Engineering',
    code: 'CSE',
    description: 'Department of Computer Science & Engineering',
    headOfDepartment: null,
  });

  // 5. Create Faculty
  const facultyPassword = await hashPassword('FacultyPass123!');
  const faculty = await User.create({
    email: 'faculty.sharma@apex.edu',
    hashedPassword: facultyPassword,
    role: 'faculty',
    collegeId: college._id,
    profile: {
      firstName: 'Dr. Ramesh',
      lastName: 'Sharma',
      employeeId: 'FAC-101',
      departmentId: department._id,
      phone: '+1-555-0202',
    },
    accountStatus: 'active',
    emailVerified: true,
    invitedBy: collegeAdmin._id,
  });
  department.headOfDepartment = faculty._id;
  await department.save();
  logger.info('Created Faculty: faculty.sharma@apex.edu');

  // 6. Create Attendance Auditor
  const auditorPassword = await hashPassword('AuditorPass123!');
  const auditor = await User.create({
    email: 'auditor@apex.edu',
    hashedPassword: auditorPassword,
    role: 'attendanceAuditor',
    collegeId: college._id,
    profile: {
      firstName: 'Sita',
      lastName: 'Verma',
      employeeId: 'AUD-002',
      phone: '+1-555-0203',
    },
    accountStatus: 'active',
    emailVerified: true,
    invitedBy: collegeAdmin._id,
  });
  logger.info('Created Auditor: auditor@apex.edu');

  // 7. Create Course
  const course = await Course.create({
    collegeId: college._id,
    departmentId: department._id,
    code: 'BT-CS',
    name: 'Bachelor of Technology in Computer Science',
    credits: 4,
    level: 'undergraduate',
    durationSemesters: 8,
    description: 'Four-year undergraduate program in computing and software engineering',
  });

  // 8. Create Academic Class
  const academicClass = await AcademicClass.create({
    collegeId: college._id,
    courseId: course._id,
    departmentId: department._id,
    section: 'A',
    academicYear: '2026-2027',
    semester: 5,
    room: 'Room 304, Academic Block A',
    maxStrength: 60,
    classTiming: [
      { dayOfWeek: 'monday', startTime: '09:00', endTime: '10:00' },
      { dayOfWeek: 'wednesday', startTime: '09:00', endTime: '10:00' },
      { dayOfWeek: 'friday', startTime: '09:00', endTime: '10:00' },
    ],
    createdBy: collegeAdmin._id,
  });

  // 9. Create Subjects
  const subject1 = await Subject.create({
    collegeId: college._id,
    courseId: course._id,
    code: 'CS501',
    name: 'Machine Learning and Deep Neural Networks',
    credits: 4,
    weeklyHours: 4,
    semester: 5,
  });

  const subject2 = await Subject.create({
    collegeId: college._id,
    courseId: course._id,
    code: 'CS502',
    name: 'Distributed Systems & Cloud Computing',
    credits: 3,
    weeklyHours: 3,
    semester: 5,
  });

  // 10. Assign Faculty to Subject
  await FacultyAssignment.create({
    collegeId: college._id,
    facultyId: faculty._id,
    classId: academicClass._id,
    subjectId: subject1._id,
    assignedBy: collegeAdmin._id,
    startDate: new Date(),
  });

  // 11. Create Students and Enrollments
  const studentPassword = await hashPassword('StudentPass123!');
  const studentsData = [
    { firstName: 'Rahul', lastName: 'Mehta', email: 'rahul.mehta@apex.edu', studentId: 'STU-2026-001', rollNumber: '01' },
    { firstName: 'Priya', lastName: 'Patel', email: 'priya.patel@apex.edu', studentId: 'STU-2026-002', rollNumber: '02' },
    { firstName: 'Amit', lastName: 'Singh', email: 'amit.singh@apex.edu', studentId: 'STU-2026-003', rollNumber: '03' },
  ];

  for (const stu of studentsData) {
    const studentUser = await User.create({
      email: stu.email,
      hashedPassword: studentPassword,
      role: 'student',
      collegeId: college._id,
      profile: {
        firstName: stu.firstName,
        lastName: stu.lastName,
        studentId: stu.studentId,
        departmentId: department._id,
      },
      accountStatus: 'active',
      emailVerified: true,
      invitedBy: collegeAdmin._id,
    });

    await StudentEnrollment.create({
      collegeId: college._id,
      studentId: studentUser._id,
      classId: academicClass._id,
      rollNumber: stu.rollNumber,
      status: 'active',
      enrolledBy: collegeAdmin._id,
    });

    logger.info(`Created Student: ${stu.email} (Roll: ${stu.rollNumber})`);
  }

  logger.info('\n========================================');
  logger.info('🎉 Seed completed successfully!');
  logger.info('Sample login credentials:');
  logger.info('  SuperAdmin:     superadmin@system.local / AdminPass123!');
  logger.info('  CollegeAdmin:   admin@apex.edu          / ApexPass123!');
  logger.info('  Faculty:        faculty.sharma@apex.edu / FacultyPass123!');
  logger.info('  Student:        rahul.mehta@apex.edu    / StudentPass123!');
  logger.info('  Auditor:        auditor@apex.edu        / AuditorPass123!');
  logger.info('========================================\n');

  await mongoose.disconnect();
}

seed().catch((err) => {
  logger.fatal({ err }, 'Seed script failed');
  process.exit(1);
});
