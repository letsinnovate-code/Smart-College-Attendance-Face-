// src/controllers/audit.controller.js

import AuditLog from "../models/AuditLog.js";
import {
  parsePagination,
  buildPaginationResponse,
} from "../utils/pagination.js";

export async function listAuditLogs(req, res) {
  const { page, limit, skip, sort } = parsePagination(req.query, {
    allowedSortFields: ["createdAt", "action"],
    defaultSort: "-createdAt",
  });

  const filter = {};
  if (req.user.role !== "superAdmin") {
    filter.collegeId = req.tenantId || req.user.collegeId;
  } else if (req.query.collegeId) {
    filter.collegeId = req.query.collegeId;
  }

  if (req.query.action) filter.action = req.query.action;
  if (req.query.actor) filter.actor = req.query.actor;
  if (req.query.targetType) filter.targetType = req.query.targetType;
  if (req.query.targetId) filter.targetId = req.query.targetId;
  if (req.query.requestId) filter.requestId = req.query.requestId;

  if (req.query.startDate || req.query.endDate) {
    filter.createdAt = {};
    if (req.query.startDate)
      filter.createdAt.$gte = new Date(req.query.startDate);
    if (req.query.endDate) filter.createdAt.$lte = new Date(req.query.endDate);
  }

  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .populate("actor", "profile.firstName profile.lastName email role")
      .populate("collegeId", "name tenantCode")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  res.json({
    success: true,
    ...buildPaginationResponse(items, total, page, limit),
    requestId: req.requestId,
  });
}
