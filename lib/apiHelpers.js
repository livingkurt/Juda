import { NextResponse } from "next/server";
import { getAuthenticatedUserId, unauthorizedResponse } from "./authMiddleware.js";

/**
 * Custom API error class with status code support
 */
export class ApiError extends Error {
  constructor(message, status = 500, code = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Common API errors as factory functions
 */
export const Errors = {
  notFound: (resource = "Resource") => new ApiError(`${resource} not found`, 404, "NOT_FOUND"),
  badRequest: (message = "Bad request") => new ApiError(message, 400, "BAD_REQUEST"),
  unauthorized: (message = "Unauthorized") => new ApiError(message, 401, "UNAUTHORIZED"),
  forbidden: (message = "Forbidden") => new ApiError(message, 403, "FORBIDDEN"),
  conflict: (message = "Conflict") => new ApiError(message, 409, "CONFLICT"),
  validation: (field, message) => new ApiError(`${field}: ${message}`, 400, "VALIDATION_ERROR"),
};

/**
 * Wraps an API handler with authentication and error handling
 *
 * @param {Function} handler - Async function (request, context) => Response
 * @param {Object} options - Configuration options
 * @param {boolean} options.requireAuth - Whether authentication is required (default: true)
 * @returns {Function} Wrapped handler
 *
 * @example
 * export const GET = withApi(async (request, { userId }) => {
 *   const items = await db.query.items.findMany({ where: eq(items.userId, userId) });
 *   return NextResponse.json(items);
 * });
 */
export function withApi(handler, options = {}) {
  const { requireAuth = true } = options;

  return async (request, context = {}) => {
    let userId = null;

    if (requireAuth) {
      userId = getAuthenticatedUserId(request);
      if (!userId) {
        return unauthorizedResponse();
      }
    }

    try {
      return await handler(request, {
        ...context,
        userId,
        async getBody() {
          try {
            return await request.json();
          } catch {
            throw Errors.badRequest("Invalid JSON body");
          }
        },
        getSearchParams() {
          return new URL(request.url).searchParams;
        },
        getRequiredParam(name) {
          const value = new URL(request.url).searchParams.get(name);
          if (!value) {
            throw Errors.badRequest(`Missing required parameter: ${name}`);
          }
          return value;
        },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        console.error(`API Error [${error.status}]:`, error.message);
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
      }

      console.error("API Error [500]:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}

/**
 * Validates required fields in request body
 */
export function validateRequired(body, fields) {
  for (const field of fields) {
    if (body[field] === undefined || body[field] === null || body[field] === "") {
      throw Errors.validation(field, "is required");
    }
  }
}

/**
 * Validates that a value is one of allowed options
 */
export function validateEnum(field, value, allowed) {
  if (value !== undefined && !allowed.includes(value)) {
    throw Errors.validation(field, `must be one of: ${allowed.join(", ")}`);
  }
}
