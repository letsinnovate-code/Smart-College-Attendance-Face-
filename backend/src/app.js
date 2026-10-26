// src/app.js
// Express application factory.
// Configures security headers, CORS, body parsers, logging, routes, and error handlers.

import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import swaggerUi from "swagger-ui-express";

import env from "./config/env.js";
import logger from "./config/logger.js";
import swaggerSpec from "./config/swagger.js";
import { requestIdMiddleware } from "./middleware/requestId.js";
import { errorHandler, AppError } from "./middleware/errorHandler.js";
import { apiLimiter } from "./middleware/rateLimiter.js";

// Route imports
import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import collegeRoutes from "./routes/college.routes.js";
import academicRoutes from "./routes/academic.routes.js";
import userRoutes from "./routes/user.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";
import faceRoutes from "./routes/face.routes.js";
import reportRoutes from "./routes/report.routes.js";
import auditRoutes from "./routes/audit.routes.js";

const app = express();

// Trust reverse proxy (e.g. Nginx, ALB)
app.set("trust proxy", 1);

// Security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        /^http:\/\/localhost(:\d+)?$/.test(origin) ||
        origin === env.APP_ORIGIN
      ) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
  }),
);

// Compression
app.use(compression());

// Body & Cookie parsing
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Correlation ID
app.use(requestIdMiddleware);

// Structured HTTP logging
app.use(
  pinoHttp({
    logger,
    customLogLevel: (req, res, err) => {
      if (res.statusCode >= 500 || err) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
    customReceivedMessage: (req) => `${req.method} ${req.url}`,
    customSuccessMessage: (req, res) =>
      `${req.method} ${req.url} ${res.statusCode}`,
    customErrorMessage: (req, res, err) =>
      `${req.method} ${req.url} ${res.statusCode} - ${err.message}`,
    autoLogging: {
      ignore: (req) => req.url?.startsWith("/api/v1/health/live"),
    },
  }),
);

// API Documentation (OpenAPI / Swagger)
app.get("/api/docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// General API rate limiter
app.use("/api", apiLimiter);

// Mount API v1 Routers
const v1Router = express.Router();
v1Router.use("/health", healthRoutes);
v1Router.use("/auth", authRoutes);
v1Router.use("/colleges", collegeRoutes);
v1Router.use("/academic", academicRoutes);
v1Router.use("/users", userRoutes);
v1Router.use("/attendance", attendanceRoutes);
v1Router.use("/face", faceRoutes);
v1Router.use("/reports", reportRoutes);
v1Router.use("/audit", auditRoutes);

app.use("/api/v1", v1Router);

// Root health ping
app.get("/", (req, res) => {
  res.json({
    service: "Smart College Attendance API",
    version: "1.0.0",
    status: "running",
    docs: "/api/docs",
  });
});

// 404 Handler
app.use((req, res, next) => {
  next(
    AppError.notFound(`Endpoint not found: ${req.method} ${req.originalUrl}`),
  );
});

// Centralized error handler
app.use(errorHandler);

export default app;
