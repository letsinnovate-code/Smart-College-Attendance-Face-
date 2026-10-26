// src/routes/academic.routes.js

import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate.js";
import { requireRoles, requireMinRole } from "../middleware/authorize.js";
import { attachTenantContext } from "../middleware/tenantContext.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import * as academicController from "../controllers/academic.controller.js";

const router = Router();
router.use(authenticate, attachTenantContext);

// Validation Schemas
const departmentSchema = z.object({
  name: z.string().min(2).max(200),
  code: z.string().min(1).max(20),
  headOfDepartment: z.string().optional().nullable(),
  description: z.string().max(1000).optional(),
});

const courseSchema = z.object({
  departmentId: z.string().min(1),
  name: z.string().min(2).max(200),
  code: z.string().min(1).max(20),
  credits: z.number().min(0).max(10),
  level: z
    .enum(["undergraduate", "postgraduate", "diploma", "certificate", "phd"])
    .optional(),
  durationSemesters: z.number().int().min(1).max(12).optional(),
  description: z.string().max(2000).optional(),
});

const classSchema = z.object({
  courseId: z.string().min(1),
  departmentId: z.string().min(1),
  section: z.string().min(1).max(10),
  academicYear: z
    .string()
    .regex(/^\d{4}-\d{4}$/, "Must be in YYYY-YYYY format"),
  semester: z.number().int().min(1).max(12),
  room: z.string().optional(),
  maxStrength: z.number().int().min(1).max(500).optional(),
  classTiming: z
    .array(
      z.object({
        dayOfWeek: z.enum([
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
        ]),
        startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
        endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
      }),
    )
    .optional(),
});

const subjectSchema = z.object({
  courseId: z.string().min(1),
  name: z.string().min(2).max(200),
  code: z.string().min(1).max(20),
  credits: z.number().min(0).max(10),
  weeklyHours: z.number().int().min(1).max(40).optional(),
  semester: z.number().int().min(1).max(12),
  isElective: z.boolean().optional(),
  description: z.string().max(2000).optional(),
});

const assignFacultySchema = z.object({
  facultyId: z.string().min(1),
  classId: z.string().min(1),
  subjectId: z.string().min(1),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const enrollStudentSchema = z.object({
  studentId: z.string().min(1),
  classId: z.string().min(1),
  rollNumber: z.string().optional(),
});

const enrollmentStatusSchema = z.object({
  status: z.enum(["active", "dropped", "completed", "transferred"]),
});

// Departments
router.post(
  "/departments",
  requireRoles("collegeAdmin", "superAdmin"),
  validate(departmentSchema),
  asyncHandler(academicController.createDepartment),
);
router.get(
  "/departments",
  requireMinRole("faculty"),
  asyncHandler(academicController.listDepartments),
);
router.put(
  "/departments/:id",
  requireRoles("collegeAdmin", "superAdmin"),
  validate(departmentSchema.partial()),
  asyncHandler(academicController.updateDepartment),
);

// Courses
router.post(
  "/courses",
  requireRoles("collegeAdmin", "superAdmin"),
  validate(courseSchema),
  asyncHandler(academicController.createCourse),
);
router.get(
  "/courses",
  requireMinRole("faculty"),
  asyncHandler(academicController.listCourses),
);
router.put(
  "/courses/:id",
  requireRoles("collegeAdmin", "superAdmin"),
  validate(courseSchema.partial()),
  asyncHandler(academicController.updateCourse),
);

// Academic Classes
router.post(
  "/classes",
  requireRoles("collegeAdmin", "superAdmin"),
  validate(classSchema),
  asyncHandler(academicController.createAcademicClass),
);
router.get(
  "/classes",
  requireMinRole("faculty"),
  asyncHandler(academicController.listAcademicClasses),
);
router.get(
  "/classes/:id",
  requireMinRole("student"),
  asyncHandler(academicController.getAcademicClass),
);

// Subjects
router.post(
  "/subjects",
  requireRoles("collegeAdmin", "superAdmin"),
  validate(subjectSchema),
  asyncHandler(academicController.createSubject),
);
router.get(
  "/subjects",
  requireMinRole("faculty"),
  asyncHandler(academicController.listSubjects),
);

// Faculty Assignments
router.post(
  "/faculty-assignments",
  requireRoles("collegeAdmin", "superAdmin"),
  validate(assignFacultySchema),
  asyncHandler(academicController.assignFaculty),
);
router.get(
  "/faculty-assignments",
  requireMinRole("faculty"),
  asyncHandler(academicController.listFacultyAssignments),
);
router.delete(
  "/faculty-assignments/:id",
  requireRoles("collegeAdmin", "superAdmin"),
  asyncHandler(academicController.deactivateFacultyAssignment),
);

// Student Enrollments
router.post(
  "/student-enrollments",
  requireRoles("collegeAdmin", "superAdmin"),
  validate(enrollStudentSchema),
  asyncHandler(academicController.enrollStudent),
);
router.get(
  "/student-enrollments",
  requireMinRole("faculty"),
  asyncHandler(academicController.listStudentEnrollments),
);
router.patch(
  "/student-enrollments/:id/status",
  requireRoles("collegeAdmin", "superAdmin"),
  validate(enrollmentStatusSchema),
  asyncHandler(academicController.updateStudentEnrollmentStatus),
);

export default router;
