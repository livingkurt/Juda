import { NextResponse } from "next/server";
import { parse } from "cookie";
import {
  verifyRefreshToken,
  validateStoredRefreshToken,
  generateAccessToken,
  storeRefreshToken,
  getUserById,
} from "@/lib/auth";
import { serialize } from "cookie";

export async function POST(request) {
  try {
    // Get refresh token from cookie
    const cookieHeader = request.headers.get("cookie");
    if (!cookieHeader) {
      return NextResponse.json({ error: "No cookies" }, { status: 401 });
    }

    const cookies = parse(cookieHeader);
    const refreshToken = cookies.refreshToken;

    if (!refreshToken) {
      return NextResponse.json({ error: "No refresh token cookie" }, { status: 401 });
    }

    // Verify token signature
    const result = verifyRefreshToken(refreshToken);
    if (!result.valid) {
      return NextResponse.json({ error: "Invalid refresh token signature" }, { status: 401 });
    }

    // Validate token exists in database
    const storedToken = await validateStoredRefreshToken(refreshToken);
    if (!storedToken) {
      return NextResponse.json({ error: "Refresh token expired or revoked" }, { status: 401 });
    }

    // Get user
    const user = await getUserById(result.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    // Generate new access token (but keep the same refresh token)
    // Don't rotate refresh token on every request - only rotate on login
    // This prevents race conditions where the browser doesn't receive the new cookie before the old one is deleted
    const newAccessToken = generateAccessToken(user.id);

    // Update the refresh token's expiry in the database to extend the session
    await storeRefreshToken(user.id, refreshToken);

    // Re-send the same refresh token cookie to ensure it persists
    const cookie = serialize("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.SECURE_COOKIES !== "false" && process.env.NODE_ENV === "production",
      sameSite: "strict", // Use strict for better persistence
      maxAge: 60 * 60 * 24 * 365, // 365 days - keep users signed in "forever"
      path: "/",
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      accessToken: newAccessToken,
    });

    response.headers.set("Set-Cookie", cookie);

    return response;
  } catch (error) {
    console.error("Token refresh error:", error);
    return NextResponse.json({ error: "Failed to refresh token" }, { status: 500 });
  }
}
