import { verifyAccessToken } from "./auth.js";

// Middleware to extract user ID from Authorization header
export function getAuthenticatedUserId(request) {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);
  const result = verifyAccessToken(token);

  if (!result.valid) {
    return null;
  }

  return result.userId;
}

// Helper to create unauthorized response
export function unauthorizedResponse(message = "Unauthorized") {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
