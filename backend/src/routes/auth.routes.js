// src/routes/auth.routes.js
/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and session management
 */

import { Router } from "express";
import {
  authLimiter,
  passwordResetLimiter,
} from "../middleware/rateLimiter.js";
import { authenticate } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import { createAuditEvent } from "../middleware/auditLog.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import * as authController from "../controllers/auth.controller.js";
import { z } from "zod";

const router = Router();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email("Invalid email").max(255),
  password: z.string().min(1).max(128),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email").max(255),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[a-z]/, "Must contain a lowercase letter")
    .regex(/[0-9]/, "Must contain a number"),
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate a user
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful — access token returned; refresh token set in cookie
 *       401:
 *         $ref: '#/components/schemas/Error'
 */
router.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  asyncHandler(authController.login),
);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Rotate refresh token and obtain new access token
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200:
 *         description: New access token issued; refresh token rotated
 *       401:
 *         $ref: '#/components/schemas/Error'
 */
router.post("/refresh", authLimiter, asyncHandler(authController.refresh));

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Log out from current session
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out
 */
router.post("/logout", authenticate, asyncHandler(authController.logout));

/**
 * @swagger
 * /auth/logout-all:
 *   post:
 *     summary: Log out from all sessions
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: All sessions invalidated
 */
router.post(
  "/logout-all",
  authenticate,
  asyncHandler(authController.logoutAll),
);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Reset instructions sent (response is identical whether or not email exists)
 */
router.post(
  "/forgot-password",
  passwordResetLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(authController.forgotPassword),
);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password using a valid token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token: { type: string }
 *               newPassword: { type: string, minLength: 8 }
 *     responses:
 *       200:
 *         description: Password reset successful
 */
router.post(
  "/reset-password",
  passwordResetLimiter,
  validate(resetPasswordSchema),
  asyncHandler(authController.resetPassword),
);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current authenticated user profile
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: User profile
 *       401:
 *         $ref: '#/components/schemas/Error'
 */
router.get("/me", authenticate, asyncHandler(authController.me));

export default router;
