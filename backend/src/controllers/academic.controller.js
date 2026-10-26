// src/controllers/academic.controller.js

import * as academicService from "../services/academic.service.js";

// Helper to extract effective collegeId
function getCollegeId(req) {
  return (
    req.tenantId ||
    req.user.collegeId?.toString() ||
    req.query.collegeId ||
    req.params.collegeId
  );
}

// Departments
export async function createDepartment(req, res) {
  const result = await academicService.createDepartment(
    getCollegeId(req),
    req.body,
    req.user.id,
    req.requestId,
  );
  res
    .status(201)
    .json({ success: true, data: result, requestId: req.requestId });
}

export async function listDepartments(req, res) {
  const result = await academicService.listDepartments(
    getCollegeId(req),
    req.query,
  );
  res.json({ success: true, ...result, requestId: req.requestId });
}

export async function updateDepartment(req, res) {
  const result = await academicService.updateDepartment(
    getCollegeId(req),
    req.params.id,
    req.body,
    req.user.id,
    req.requestId,
  );
  res.json({ success: true, data: result, requestId: req.requestId });
}

// Courses
export async function createCourse(req, res) {
  const result = await academicService.createCourse(
    getCollegeId(req),
    req.body,
    req.user.id,
    req.requestId,
  );
  res
    .status(201)
    .json({ success: true, data: result, requestId: req.requestId });
}

export async function listCourses(req, res) {
  const result = await academicService.listCourses(
    getCollegeId(req),
    req.query,
  );
  res.json({ success: true, ...result, requestId: req.requestId });
}

export async function updateCourse(req, res) {
  const result = await academicService.updateCourse(
    getCollegeId(req),
    req.params.id,
    req.body,
    req.user.id,
    req.requestId,
  );
  res.json({ success: true, data: result, requestId: req.requestId });
}

// Academic Classes
export async function createAcademicClass(req, res) {
  const result = await academicService.createAcademicClass(
    getCollegeId(req),
    req.body,
    req.user.id,
    req.requestId,
  );
  res
    .status(201)
    .json({ success: true, data: result, requestId: req.requestId });
}

export async function listAcademicClasses(req, res) {
  const result = await academicService.listAcademicClasses(
    getCollegeId(req),
    req.query,
  );
  res.json({ success: true, ...result, requestId: req.requestId });
}

export async function getAcademicClass(req, res) {
  const result = await academicService.getAcademicClassById(
    getCollegeId(req),
    req.params.id,
  );
  res.json({ success: true, data: result, requestId: req.requestId });
}

// Subjects
export async function createSubject(req, res) {
  const result = await academicService.createSubject(
    getCollegeId(req),
    req.body,
    req.user.id,
    req.requestId,
  );
  res
    .status(201)
    .json({ success: true, data: result, requestId: req.requestId });
}

export async function listSubjects(req, res) {
  const result = await academicService.listSubjects(
    getCollegeId(req),
    req.query,
  );
  res.json({ success: true, ...result, requestId: req.requestId });
}

// Faculty Assignments
export async function assignFaculty(req, res) {
  const result = await academicService.assignFaculty(
    getCollegeId(req),
    req.body,
    req.user.id,
    req.requestId,
  );
  res
    .status(201)
    .json({ success: true, data: result, requestId: req.requestId });
}

export async function listFacultyAssignments(req, res) {
  const result = await academicService.listFacultyAssignments(
    getCollegeId(req),
    req.query,
  );
  res.json({ success: true, ...result, requestId: req.requestId });
}

export async function deactivateFacultyAssignment(req, res) {
  const result = await academicService.deactivateFacultyAssignment(
    getCollegeId(req),
    req.params.id,
    req.user.id,
    req.requestId,
  );
  res.json({ success: true, data: result, requestId: req.requestId });
}

// Student Enrollments
export async function enrollStudent(req, res) {
  const result = await academicService.enrollStudent(
    getCollegeId(req),
    req.body,
    req.user.id,
    req.requestId,
  );
  res
    .status(201)
    .json({ success: true, data: result, requestId: req.requestId });
}

export async function listStudentEnrollments(req, res) {
  const result = await academicService.listStudentEnrollments(
    getCollegeId(req),
    req.query,
  );
  res.json({ success: true, ...result, requestId: req.requestId });
}

export async function updateStudentEnrollmentStatus(req, res) {
  const result = await academicService.updateStudentEnrollmentStatus(
    getCollegeId(req),
    req.params.id,
    req.body.status,
    req.user.id,
    req.requestId,
  );
  res.json({ success: true, data: result, requestId: req.requestId });
}
