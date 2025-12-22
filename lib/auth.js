import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db } from "./db.js";
import { users, refreshTokens } from "./schema.js";
import { eq, and, gt } from "drizzle-orm";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "your-access-token-secret-change-in-production";
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "your-refresh-token-secret-change-in-production";

const ACCESS_TOKEN_EXPIRY = "15m"; // 15 minutes
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

// Hash password
export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

// Verify password
export async function verifyPassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

// Generate access token
export function generateAccessToken(userId) {
  return jwt.sign({ userId }, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

// Generate refresh token
export function generateRefreshToken(userId) {
  return jwt.sign({ userId, type: "refresh" }, REFRESH_TOKEN_SECRET, {
    expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d`,
  });
}

// Verify access token
export function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    return { valid: true, userId: decoded.userId };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Verify refresh token
export function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET);
    if (decoded.type !== "refresh") {
      return { valid: false, error: "Invalid token type" };
    }
    return { valid: true, userId: decoded.userId };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Store refresh token in database
export async function storeRefreshToken(userId, token) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  try {
    // Try to insert the new token
    await db.insert(refreshTokens).values({
      userId,
      token,
      expiresAt,
    });
  } catch (error) {
    // If token already exists (race condition), update it instead
    if (error.code === "23505" || error.cause?.code === "23505") {
      // Duplicate key error - update the existing token
      await db
        .update(refreshTokens)
        .set({
          userId,
          expiresAt,
        })
        .where(eq(refreshTokens.token, token));
    } else {
      // Re-throw other errors
      throw error;
    }
  }
}

// Validate refresh token exists in database and is not expired
export async function validateStoredRefreshToken(token) {
  const storedToken = await db.query.refreshTokens.findFirst({
    where: and(eq(refreshTokens.token, token), gt(refreshTokens.expiresAt, new Date())),
  });
  return storedToken;
}

// Remove refresh token (logout)
export async function removeRefreshToken(token) {
  await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
}

// Remove all refresh tokens for a user (logout all devices)
export async function removeAllUserRefreshTokens(userId) {
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
}

// Clean up expired refresh tokens (can be called periodically)
export async function cleanupExpiredTokens() {
  await db.delete(refreshTokens).where(gt(new Date(), refreshTokens.expiresAt));
}

// Get user by email
export async function getUserByEmail(email) {
  return db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });
}

// Get user by ID
export async function getUserById(id) {
  return db.query.users.findFirst({
    where: eq(users.id, id),
  });
}

// Create user
export async function createUser(email, password, name = null) {
  const passwordHash = await hashPassword(password);

  const [user] = await db
    .insert(users)
    .values({
      email: email.toLowerCase(),
      passwordHash,
      name,
    })
    .returning();

  return user;
}
