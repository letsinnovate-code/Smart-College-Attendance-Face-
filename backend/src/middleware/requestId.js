// src/middleware/requestId.js
// Attaches a UUID correlation ID to every request.
// Reads X-Request-ID from client if present (validated), otherwise generates one.
// Sets X-Request-ID on the response so clients can correlate logs.

import { v4 as uuidv4 } from "uuid";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requestId(req, res, next) {
  const incoming = req.headers["x-request-id"];
  const id = incoming && UUID_REGEX.test(incoming) ? incoming : uuidv4();
  req.requestId = id;
  res.setHeader("X-Request-ID", id);
  next();
}

export const requestIdMiddleware = requestId;
export default requestId;
