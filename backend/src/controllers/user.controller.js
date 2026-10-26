// src/controllers/user.controller.js

import * as userService from "../services/user.service.js";
import { AppError } from "../middleware/errorHandler.js";

function getEffectiveCollegeId(req) {
  if (req.user.role === "superAdmin") {
    return req.query.collegeId || req.body.collegeId || null;
  }
  return req.tenantId || req.user.collegeId?.toString();
}

export async function createUser(req, res) {
  const collegeId = getEffectiveCollegeId(req);
  const result = await userService.createUser({
    collegeId,
    data: req.body,
    actor: req.user,
    requestId: req.requestId,
  });

  res.status(201).json({
    success: true,
    data: result,
    requestId: req.requestId,
  });
}

export async function listUsers(req, res) {
  const collegeId = getEffectiveCollegeId(req);
  const result = await userService.listUsers(collegeId, req.query);
  res.json({
    success: true,
    ...result,
    requestId: req.requestId,
  });
}

export async function getUser(req, res) {
  const collegeId =
    req.user.role === "superAdmin"
      ? null
      : req.tenantId || req.user.collegeId?.toString();
  const user = await userService.getUserById(collegeId, req.params.id);
  res.json({
    success: true,
    data: user,
    requestId: req.requestId,
  });
}

export async function updateUser(req, res) {
  const collegeId =
    req.user.role === "superAdmin"
      ? null
      : req.tenantId || req.user.collegeId?.toString();
  const user = await userService.updateUser({
    collegeId,
    userId: req.params.id,
    updateData: req.body,
    actor: req.user,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    data: user,
    requestId: req.requestId,
  });
}
