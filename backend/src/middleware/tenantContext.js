// src/middleware/tenantContext.js
// Derives the tenant (college) context from the authenticated user.
// Never trusts client-supplied collegeId in body or query for authorization.
// Faculty / student endpoints use this to scope all DB queries.

import { AppError } from "./errorHandler.js";
import College from "../models/College.js";

/**
 * attachTenantContext
 * Attaches req.tenantId = req.user.collegeId after validating it exists.
 * Must be called after authenticate().
 */
export async function attachTenantContext(req, res, next) {
  try {
    if (!req.user) return next(AppError.unauthorized());

    // superAdmin may not have a collegeId — that is intentional
    if (req.user.role === "superAdmin") {
      req.tenantId = null; // superAdmin operates across tenants
      return next();
    }

    if (!req.user.collegeId) {
      return next(AppError.forbidden("User is not associated with a college"));
    }

    // Verify the college still exists and is active
    const college = await College.findById(req.user.collegeId)
      .select("status")
      .lean();
    if (!college) {
      return next(AppError.forbidden("Associated college not found"));
    }
    if (college.status !== "active") {
      return next(AppError.forbidden("College account is suspended"));
    }

    req.tenantId = req.user.collegeId;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * scopeQueryToTenant(queryObject)
 * Helper (not middleware) — merges collegeId into a Mongoose query object.
 * Use in services: const filter = scopeQueryToTenant({ status: 'open' }, req.tenantId)
 */
export function scopeQueryToTenant(queryObject, tenantId) {
  if (!tenantId) return queryObject; // superAdmin — no restriction
  return { ...queryObject, collegeId: tenantId };
}
