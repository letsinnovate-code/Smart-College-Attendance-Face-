// src/services/college.service.js
// Business logic for College tenant management.

import College from "../models/College.js";
import AuditLog from "../models/AuditLog.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  parsePagination,
  buildPaginationResponse,
} from "../utils/pagination.js";

export async function createCollege(data, actorId, requestId) {
  const existing = await College.findOne({
    tenantCode: data.tenantCode.toUpperCase(),
  });
  if (existing) {
    throw AppError.conflict(
      `College with tenant code ${data.tenantCode} already exists`,
    );
  }

  const college = await College.create({
    ...data,
    tenantCode: data.tenantCode.toUpperCase(),
    createdBy: actorId,
  });

  await AuditLog.create({
    actor: actorId,
    action: "college.created",
    targetType: "College",
    targetId: college._id,
    collegeId: college._id,
    requestId,
    metadata: { name: college.name, tenantCode: college.tenantCode },
  });

  return college;
}

export async function listColleges(queryParams) {
  const { page, limit, skip, sort } = parsePagination(queryParams, {
    allowedSortFields: ["name", "tenantCode", "createdAt", "status"],
    defaultSort: "-createdAt",
  });

  const filter = {};
  if (queryParams.status) {
    filter.status = queryParams.status;
  }
  if (queryParams.search) {
    filter.$or = [
      { name: { $regex: queryParams.search, $options: "i" } },
      { tenantCode: { $regex: queryParams.search, $options: "i" } },
      { domain: { $regex: queryParams.search, $options: "i" } },
    ];
  }

  const [items, total] = await Promise.all([
    College.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    College.countDocuments(filter),
  ]);

  return buildPaginationResponse(items, total, page, limit);
}

export async function getCollegeById(collegeId) {
  const college = await College.findById(collegeId).lean();
  if (!college) {
    throw AppError.notFound("College not found");
  }
  return college;
}

export async function updateCollege(collegeId, updateData, actorId, requestId) {
  const college = await College.findById(collegeId);
  if (!college) {
    throw AppError.notFound("College not found");
  }

  // Prevent changing tenantCode
  delete updateData.tenantCode;
  delete updateData._id;

  Object.assign(college, updateData);
  await college.save();

  await AuditLog.create({
    actor: actorId,
    action: "college.updated",
    targetType: "College",
    targetId: college._id,
    collegeId: college._id,
    requestId,
    metadata: { updatedFields: Object.keys(updateData) },
  });

  return college;
}

export async function updateCollegeStatus(
  collegeId,
  status,
  actorId,
  requestId,
) {
  const college = await College.findById(collegeId);
  if (!college) {
    throw AppError.notFound("College not found");
  }

  const previousStatus = college.status;
  college.status = status;
  await college.save();

  await AuditLog.create({
    actor: actorId,
    action: "college.status.changed",
    targetType: "College",
    targetId: college._id,
    collegeId: college._id,
    requestId,
    metadata: { previousStatus, newStatus: status },
  });

  return college;
}
