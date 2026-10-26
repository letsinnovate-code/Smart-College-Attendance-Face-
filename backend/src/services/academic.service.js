// src/services/academic.service.js
// Business logic for academic hierarchy:
// Departments, Courses, Classes, Subjects, Faculty Assignments, and Student Enrollments.

import Department from "../models/Department.js";
import Course from "../models/Course.js";
import AcademicClass from "../models/AcademicClass.js";
import Subject from "../models/Subject.js";
import FacultyAssignment from "../models/FacultyAssignment.js";
import StudentEnrollment from "../models/StudentEnrollment.js";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  parsePagination,
  buildPaginationResponse,
} from "../utils/pagination.js";

// ==================== DEPARTMENTS ====================

export async function createDepartment(collegeId, data, actorId, requestId) {
  const existing = await Department.findOne({
    collegeId,
    code: data.code.toUpperCase(),
  });
  if (existing) {
    throw AppError.conflict(
      `Department with code ${data.code} already exists in this college`,
    );
  }

  const dept = await Department.create({
    collegeId,
    name: data.name,
    code: data.code.toUpperCase(),
    description: data.description,
    headOfDepartment: data.headOfDepartment || null,
  });

  await AuditLog.create({
    actor: actorId,
    action: "department.created",
    targetType: "Department",
    targetId: dept._id,
    collegeId,
    requestId,
  });

  return dept;
}

export async function listDepartments(collegeId, queryParams) {
  const { page, limit, skip, sort } = parsePagination(queryParams, {
    allowedSortFields: ["name", "code", "createdAt"],
    defaultSort: "name",
  });

  const filter = { collegeId };
  if (queryParams.isActive !== undefined)
    filter.isActive = queryParams.isActive === "true";
  if (queryParams.search) {
    filter.$or = [
      { name: { $regex: queryParams.search, $options: "i" } },
      { code: { $regex: queryParams.search, $options: "i" } },
    ];
  }

  const [items, total] = await Promise.all([
    Department.find(filter)
      .populate("headOfDepartment", "profile.firstName profile.lastName email")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Department.countDocuments(filter),
  ]);

  return buildPaginationResponse(items, total, page, limit);
}

export async function updateDepartment(
  collegeId,
  deptId,
  data,
  actorId,
  requestId,
) {
  const dept = await Department.findOne({ _id: deptId, collegeId });
  if (!dept) throw AppError.notFound("Department not found");

  if (data.code && data.code.toUpperCase() !== dept.code) {
    const existing = await Department.findOne({
      collegeId,
      code: data.code.toUpperCase(),
      _id: { $ne: deptId },
    });
    if (existing)
      throw AppError.conflict(
        `Department with code ${data.code} already exists`,
      );
    dept.code = data.code.toUpperCase();
  }

  if (data.name) dept.name = data.name;
  if (data.description !== undefined) dept.description = data.description;
  if (data.headOfDepartment !== undefined)
    dept.headOfDepartment = data.headOfDepartment;
  if (data.isActive !== undefined) dept.isActive = data.isActive;

  await dept.save();

  await AuditLog.create({
    actor: actorId,
    action: "department.updated",
    targetType: "Department",
    targetId: dept._id,
    collegeId,
    requestId,
  });

  return dept;
}

// ==================== COURSES ====================

export async function createCourse(collegeId, data, actorId, requestId) {
  const dept = await Department.findOne({ _id: data.departmentId, collegeId });
  if (!dept)
    throw AppError.notFound("Associated department not found in this college");

  const existing = await Course.findOne({
    collegeId,
    code: data.code.toUpperCase(),
  });
  if (existing)
    throw AppError.conflict(`Course with code ${data.code} already exists`);

  const course = await Course.create({
    collegeId,
    departmentId: data.departmentId,
    code: data.code.toUpperCase(),
    name: data.name,
    credits: data.credits,
    level: data.level || "undergraduate",
    durationSemesters: data.durationSemesters || 8,
    description: data.description,
  });

  await AuditLog.create({
    actor: actorId,
    action: "course.created",
    targetType: "Course",
    targetId: course._id,
    collegeId,
    requestId,
  });

  return course;
}

export async function listCourses(collegeId, queryParams) {
  const { page, limit, skip, sort } = parsePagination(queryParams, {
    allowedSortFields: ["name", "code", "credits", "createdAt"],
    defaultSort: "name",
  });

  const filter = { collegeId };
  if (queryParams.departmentId) filter.departmentId = queryParams.departmentId;
  if (queryParams.level) filter.level = queryParams.level;
  if (queryParams.isActive !== undefined)
    filter.isActive = queryParams.isActive === "true";
  if (queryParams.search) {
    filter.$or = [
      { name: { $regex: queryParams.search, $options: "i" } },
      { code: { $regex: queryParams.search, $options: "i" } },
    ];
  }

  const [items, total] = await Promise.all([
    Course.find(filter)
      .populate("departmentId", "name code")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Course.countDocuments(filter),
  ]);

  return buildPaginationResponse(items, total, page, limit);
}

export async function updateCourse(
  collegeId,
  courseId,
  data,
  actorId,
  requestId,
) {
  const course = await Course.findOne({ _id: courseId, collegeId });
  if (!course) throw AppError.notFound("Course not found");

  if (data.code && data.code.toUpperCase() !== course.code) {
    const existing = await Course.findOne({
      collegeId,
      code: data.code.toUpperCase(),
      _id: { $ne: courseId },
    });
    if (existing)
      throw AppError.conflict(`Course with code ${data.code} already exists`);
    course.code = data.code.toUpperCase();
  }

  if (data.name) course.name = data.name;
  if (data.credits !== undefined) course.credits = data.credits;
  if (data.level) course.level = data.level;
  if (data.durationSemesters !== undefined)
    course.durationSemesters = data.durationSemesters;
  if (data.description !== undefined) course.description = data.description;
  if (data.isActive !== undefined) course.isActive = data.isActive;

  await course.save();

  await AuditLog.create({
    actor: actorId,
    action: "course.updated",
    targetType: "Course",
    targetId: course._id,
    collegeId,
    requestId,
  });

  return course;
}

// ==================== ACADEMIC CLASSES ====================

export async function createAcademicClass(collegeId, data, actorId, requestId) {
  const course = await Course.findOne({ _id: data.courseId, collegeId });
  if (!course) throw AppError.notFound("Course not found in this college");

  const dept = await Department.findOne({ _id: data.departmentId, collegeId });
  if (!dept) throw AppError.notFound("Department not found in this college");

  const existing = await AcademicClass.findOne({
    collegeId,
    courseId: data.courseId,
    section: data.section.toUpperCase(),
    academicYear: data.academicYear,
    semester: data.semester,
  });
  if (existing) {
    throw AppError.conflict(
      `Class section ${data.section} for semester ${data.semester} (${data.academicYear}) already exists`,
    );
  }

  const cls = await AcademicClass.create({
    collegeId,
    courseId: data.courseId,
    departmentId: data.departmentId,
    section: data.section.toUpperCase(),
    academicYear: data.academicYear,
    semester: data.semester,
    room: data.room,
    maxStrength: data.maxStrength || 60,
    classTiming: data.classTiming || [],
    createdBy: actorId,
  });

  await AuditLog.create({
    actor: actorId,
    action: "class.created",
    targetType: "AcademicClass",
    targetId: cls._id,
    collegeId,
    requestId,
  });

  return cls;
}

export async function listAcademicClasses(collegeId, queryParams) {
  const { page, limit, skip, sort } = parsePagination(queryParams, {
    allowedSortFields: ["section", "semester", "academicYear", "createdAt"],
    defaultSort: "-createdAt",
  });

  const filter = { collegeId };
  if (queryParams.courseId) filter.courseId = queryParams.courseId;
  if (queryParams.departmentId) filter.departmentId = queryParams.departmentId;
  if (queryParams.academicYear) filter.academicYear = queryParams.academicYear;
  if (queryParams.semester) filter.semester = Number(queryParams.semester);
  if (queryParams.isActive !== undefined)
    filter.isActive = queryParams.isActive === "true";

  const [items, total] = await Promise.all([
    AcademicClass.find(filter)
      .populate("courseId", "name code level")
      .populate("departmentId", "name code")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    AcademicClass.countDocuments(filter),
  ]);

  return buildPaginationResponse(items, total, page, limit);
}

export async function getAcademicClassById(collegeId, classId) {
  const cls = await AcademicClass.findOne({ _id: classId, collegeId })
    .populate("courseId", "name code level")
    .populate("departmentId", "name code")
    .lean();
  if (!cls) throw AppError.notFound("Academic class not found");
  return cls;
}

// ==================== SUBJECTS ====================

export async function createSubject(collegeId, data, actorId, requestId) {
  const course = await Course.findOne({ _id: data.courseId, collegeId });
  if (!course) throw AppError.notFound("Course not found in this college");

  const existing = await Subject.findOne({
    collegeId,
    code: data.code.toUpperCase(),
  });
  if (existing)
    throw AppError.conflict(`Subject with code ${data.code} already exists`);

  const subject = await Subject.create({
    collegeId,
    courseId: data.courseId,
    code: data.code.toUpperCase(),
    name: data.name,
    credits: data.credits,
    weeklyHours: data.weeklyHours || 3,
    semester: data.semester,
    isElective: data.isElective || false,
    description: data.description,
  });

  await AuditLog.create({
    actor: actorId,
    action: "subject.created",
    targetType: "Subject",
    targetId: subject._id,
    collegeId,
    requestId,
  });

  return subject;
}

export async function listSubjects(collegeId, queryParams) {
  const { page, limit, skip, sort } = parsePagination(queryParams, {
    allowedSortFields: ["name", "code", "credits", "semester", "createdAt"],
    defaultSort: "semester",
  });

  const filter = { collegeId };
  if (queryParams.courseId) filter.courseId = queryParams.courseId;
  if (queryParams.semester) filter.semester = Number(queryParams.semester);
  if (queryParams.isActive !== undefined)
    filter.isActive = queryParams.isActive === "true";
  if (queryParams.search) {
    filter.$or = [
      { name: { $regex: queryParams.search, $options: "i" } },
      { code: { $regex: queryParams.search, $options: "i" } },
    ];
  }

  const [items, total] = await Promise.all([
    Subject.find(filter)
      .populate("courseId", "name code")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Subject.countDocuments(filter),
  ]);

  return buildPaginationResponse(items, total, page, limit);
}

// ==================== FACULTY ASSIGNMENTS ====================

export async function assignFaculty(collegeId, data, actorId, requestId) {
  const [faculty, cls, subject] = await Promise.all([
    User.findOne({ _id: data.facultyId, collegeId, role: "faculty" }),
    AcademicClass.findOne({ _id: data.classId, collegeId }),
    Subject.findOne({ _id: data.subjectId, collegeId }),
  ]);

  if (!faculty)
    throw AppError.notFound("Faculty member not found in this college");
  if (!cls) throw AppError.notFound("Class not found in this college");
  if (!subject) throw AppError.notFound("Subject not found in this college");

  const existing = await FacultyAssignment.findOne({
    collegeId,
    facultyId: data.facultyId,
    classId: data.classId,
    subjectId: data.subjectId,
    isActive: true,
  });
  if (existing) {
    throw AppError.conflict(
      "Faculty is already actively assigned to this subject in this class",
    );
  }

  const assignment = await FacultyAssignment.create({
    collegeId,
    facultyId: data.facultyId,
    classId: data.classId,
    subjectId: data.subjectId,
    assignedBy: actorId,
    startDate: data.startDate || new Date(),
    endDate: data.endDate,
  });

  await AuditLog.create({
    actor: actorId,
    action: "faculty.assigned",
    targetType: "FacultyAssignment",
    targetId: assignment._id,
    collegeId,
    requestId,
    metadata: {
      facultyId: data.facultyId,
      classId: data.classId,
      subjectId: data.subjectId,
    },
  });

  return assignment;
}

export async function listFacultyAssignments(collegeId, queryParams) {
  const { page, limit, skip, sort } = parsePagination(queryParams, {
    allowedSortFields: ["createdAt", "startDate"],
    defaultSort: "-createdAt",
  });

  const filter = { collegeId };
  if (queryParams.facultyId) filter.facultyId = queryParams.facultyId;
  if (queryParams.classId) filter.classId = queryParams.classId;
  if (queryParams.subjectId) filter.subjectId = queryParams.subjectId;
  if (queryParams.isActive !== undefined)
    filter.isActive = queryParams.isActive === "true";

  const [items, total] = await Promise.all([
    FacultyAssignment.find(filter)
      .populate("facultyId", "profile.firstName profile.lastName email")
      .populate("classId", "section academicYear semester")
      .populate("subjectId", "name code")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    FacultyAssignment.countDocuments(filter),
  ]);

  return buildPaginationResponse(items, total, page, limit);
}

export async function deactivateFacultyAssignment(
  collegeId,
  assignmentId,
  actorId,
  requestId,
) {
  const assignment = await FacultyAssignment.findOne({
    _id: assignmentId,
    collegeId,
  });
  if (!assignment) throw AppError.notFound("Assignment not found");

  assignment.isActive = false;
  assignment.endDate = new Date();
  await assignment.save();

  await AuditLog.create({
    actor: actorId,
    action: "faculty.unassigned",
    targetType: "FacultyAssignment",
    targetId: assignment._id,
    collegeId,
    requestId,
  });

  return assignment;
}

// ==================== STUDENT ENROLLMENTS ====================

export async function enrollStudent(collegeId, data, actorId, requestId) {
  const [student, cls] = await Promise.all([
    User.findOne({ _id: data.studentId, collegeId, role: "student" }),
    AcademicClass.findOne({ _id: data.classId, collegeId }),
  ]);

  if (!student) throw AppError.notFound("Student not found in this college");
  if (!cls) throw AppError.notFound("Academic class not found in this college");

  const existing = await StudentEnrollment.findOne({
    collegeId,
    studentId: data.studentId,
    classId: data.classId,
  });
  if (existing) {
    if (existing.status === "active") {
      throw AppError.conflict(
        "Student is already actively enrolled in this class",
      );
    }
    // Re-activate previously dropped enrollment
    existing.status = "active";
    existing.droppedAt = null;
    existing.enrolledBy = actorId;
    if (data.rollNumber) existing.rollNumber = data.rollNumber;
    await existing.save();
    return existing;
  }

  const enrollment = await StudentEnrollment.create({
    collegeId,
    studentId: data.studentId,
    classId: data.classId,
    status: "active",
    enrolledBy: actorId,
    rollNumber: data.rollNumber,
  });

  await AuditLog.create({
    actor: actorId,
    action: "student.enrolled",
    targetType: "StudentEnrollment",
    targetId: enrollment._id,
    collegeId,
    requestId,
    metadata: { studentId: data.studentId, classId: data.classId },
  });

  return enrollment;
}

export async function listStudentEnrollments(collegeId, queryParams) {
  const { page, limit, skip, sort } = parsePagination(queryParams, {
    allowedSortFields: ["rollNumber", "enrolledAt", "createdAt"],
    defaultSort: "rollNumber",
  });

  const filter = { collegeId };
  if (queryParams.classId) filter.classId = queryParams.classId;
  if (queryParams.studentId) filter.studentId = queryParams.studentId;
  if (queryParams.status) filter.status = queryParams.status;

  const [items, total] = await Promise.all([
    StudentEnrollment.find(filter)
      .populate(
        "studentId",
        "profile.firstName profile.lastName email profile.studentId",
      )
      .populate("classId", "section academicYear semester")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    StudentEnrollment.countDocuments(filter),
  ]);

  return buildPaginationResponse(items, total, page, limit);
}

export async function updateStudentEnrollmentStatus(
  collegeId,
  enrollmentId,
  status,
  actorId,
  requestId,
) {
  const enrollment = await StudentEnrollment.findOne({
    _id: enrollmentId,
    collegeId,
  });
  if (!enrollment) throw AppError.notFound("Enrollment record not found");

  enrollment.status = status;
  if (status === "dropped") enrollment.droppedAt = new Date();
  if (status === "completed") enrollment.completedAt = new Date();
  await enrollment.save();

  await AuditLog.create({
    actor: actorId,
    action: "student.enrollment.status.changed",
    targetType: "StudentEnrollment",
    targetId: enrollment._id,
    collegeId,
    requestId,
    metadata: { status },
  });

  return enrollment;
}
