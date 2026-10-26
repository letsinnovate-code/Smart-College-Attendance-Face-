// src/config/swagger.js
// OpenAPI 3.1 specification generated from JSDoc annotations.

import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.1.0",
    info: {
      title: "Smart College Attendance API",
      version: "1.0.0",
      description: `
Production-ready Smart College Attendance Management System with Face Recognition.

## Authentication
Use **POST /api/v1/auth/login** to obtain an access token.
Include the token as \`Authorization: Bearer <token>\` on subsequent requests.
Refresh tokens are stored in an HttpOnly cookie and rotated on each use.

## Multi-Tenancy
All college-scoped resources are isolated by \`collegeId\`.
Users may only access resources belonging to their own college unless they hold the \`superAdmin\` role.

## Biometric Data
Face templates are biometric data. Endpoints dealing with face enrollment require explicit consent.
Templates are encrypted at rest and never returned in ordinary API responses.
      `,
      contact: {
        name: "Smart Attendance Team",
      },
      license: {
        name: "UNLICENSED",
      },
    },
    servers: [
      {
        url: "/api/v1",
        description: "Current server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            code: { type: "string", example: "VALIDATION_ERROR" },
            message: { type: "string" },
            requestId: { type: "string", format: "uuid" },
            errors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  field: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        Pagination: {
          type: "object",
          properties: {
            page: { type: "integer", example: 1 },
            limit: { type: "integer", example: 20 },
            total: { type: "integer", example: 100 },
            pages: { type: "integer", example: 5 },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./src/routes/*.js", "./src/controllers/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
