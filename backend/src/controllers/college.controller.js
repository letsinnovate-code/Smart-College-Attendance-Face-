// src/controllers/college.controller.js

import * as collegeService from "../services/college.service.js";
import { AppError } from "../middleware/errorHandler.js";

export async function createCollege(req, res) {
  const college = await collegeService.createCollege(
    req.body,
    req.user.id,
    req.requestId,
  );
  res.status(201).json({
    success: true,
    data: college,
    requestId: req.requestId,
  });
}

export async function listColleges(req, res) {
  const result = await collegeService.listColleges(req.query);
  res.json({
    success: true,
    ...result,
    requestId: req.requestId,
  });
}

export async function getCollege(req, res) {
  // If user is not superAdmin, verify they are only requesting their own college
  if (
    req.user.role !== "superAdmin" &&
    req.user.collegeId?.toString() !== req.params.id
  ) {
    throw AppError.forbidden("Access denied to other college data");
  }

  const college = await collegeService.getCollegeById(req.params.id);
  res.json({
    success: true,
    data: college,
    requestId: req.requestId,
  });
}

export async function updateCollege(req, res) {
  if (
    req.user.role !== "superAdmin" &&
    req.user.collegeId?.toString() !== req.params.id
  ) {
    throw AppError.forbidden("Access denied to other college data");
  }

  // Non-superAdmin cannot update core tenant properties, only settings
  const payload =
    req.user.role === "superAdmin" ? req.body : { settings: req.body.settings };

  const college = await collegeService.updateCollege(
    req.params.id,
    payload,
    req.user.id,
    req.requestId,
  );
  res.json({
    success: true,
    data: college,
    requestId: req.requestId,
  });
}

export async function updateCollegeStatus(req, res) {
  const college = await collegeService.updateCollegeStatus(
    req.params.id,
    req.body.status,
    req.user.id,
    req.requestId,
  );
  res.json({
    success: true,
    data: college,
    requestId: req.requestId,
  });
}
