// src/middleware/validate.js
// Request validation middleware using Zod schemas.
// Validates req.body, req.query, and req.params.
// On failure, throws an AppError with a VALIDATION_ERROR code.

import { ZodError } from "zod";
import { AppError } from "./errorHandler.js";

/**
 * validate(schema, source)
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {'body'|'query'|'params'} source - Which part of the request to validate
 */
export function validate(schema, source = "body") {
  return (req, res, next) => {
    try {
      const data = schema.parse(req[source]);
      // Replace with parsed/coerced data (safe defaults applied by Zod)
      req[source] = data;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }));
        return next(AppError.validation("Request validation failed", errors));
      }
      next(err);
    }
  };
}
