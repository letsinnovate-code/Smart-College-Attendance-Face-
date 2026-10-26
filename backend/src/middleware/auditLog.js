// src/middleware/auditLog.js
// Middleware factory that records audit events for sensitive operations.
// Events are persisted to the AuditLog collection asynchronously.
// Failures are logged but never surface to the client.

import AuditLog from "../models/AuditLog.js";
import logger from "../config/logger.js";

/**
 * createAuditEvent(action, targetType)
 * Middleware factory that logs an audit event after a successful response.
 * The response body is NOT logged — only metadata.
 *
 * @param {string} action - Stable action identifier, e.g. 'user.login', 'face.enroll'
 * @param {string} targetType - Mongoose model name, e.g. 'User', 'AttendanceRecord'
 */
export function createAuditEvent(action, targetType) {
  return (req, res, next) => {
    // Hook into response finish to log after the handler completes
    const originalJson = res.json.bind(res);
    res.json = function (body) {
      originalJson(body);

      // Only log if the response was successful (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const targetId =
          body?.data?._id ||
          body?.data?.id ||
          req.params?.id ||
          req.params?.sessionId ||
          null;

        AuditLog.create({
          actor: req.user?.id || "anonymous",
          action,
          targetType,
          targetId: targetId?.toString(),
          collegeId: req.user?.collegeId,
          requestId: req.requestId,
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
          metadata: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
          },
        }).catch((err) => {
          logger.error({ err, action }, "Failed to create audit log entry");
        });
      }
    };

    next();
  };
}
