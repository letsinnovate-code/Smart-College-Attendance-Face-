// src/utils/pagination.js
// Standardized pagination helpers used across all list endpoints.

/**
 * Apply allowed sort fields whitelist to prevent arbitrary sort injection.
 * @param {string} sortParam - e.g. "name,-createdAt"
 * @param {string[]} allowedFields - list of allowed field names
 * @param {string|object} defaultSort - default sort if none provided
 * @returns {object} Mongoose sort object e.g. { name: 1, createdAt: -1 }
 */
export function parseSortAllowlist(
  sortParam,
  allowedFields = [],
  defaultSort = "-createdAt",
) {
  const defaultObj =
    typeof defaultSort === "object"
      ? defaultSort
      : {
          [defaultSort.startsWith("-") ? defaultSort.slice(1) : defaultSort]:
            defaultSort.startsWith("-") ? -1 : 1,
        };

  if (!sortParam) return defaultObj;

  const result = {};
  const parts = sortParam.split(",").slice(0, 5); // max 5 sort fields

  for (const part of parts) {
    const desc = part.startsWith("-");
    const field = desc ? part.slice(1) : part;
    if (allowedFields.length === 0 || allowedFields.includes(field)) {
      result[field] = desc ? -1 : 1;
    }
  }
  return Object.keys(result).length > 0 ? result : defaultObj;
}

/**
 * Parse and validate pagination params from query string.
 * Enforces max page size to prevent DoS via large responses.
 */
export function parsePagination(query = {}, options = {}) {
  const maxLimit =
    typeof options === "number" ? options : options.maxLimit || 100;
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(query.limit, 10) || 20),
  );
  const skip = (page - 1) * limit;

  let sort = { createdAt: -1 };
  if (typeof options === "object") {
    sort = parseSortAllowlist(
      query.sort,
      options.allowedSortFields || [],
      options.defaultSort || "-createdAt",
    );
  }

  return { page, limit, skip, sort };
}

/**
 * Build a paginated response envelope.
 */
export function buildPaginationResponse(data, total, page, limit) {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

export function paginatedResponse(data, total, { page, limit }) {
  return {
    success: true,
    ...buildPaginationResponse(data, total, page, limit),
  };
}
