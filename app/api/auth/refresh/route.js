import { NextResponse } from "next/server";
import { parse } from "cookie";
import {
  verifyRefreshToken,
  validateStoredRefreshToken,
  generateAccessToken,
  generateRefreshToken,
  storeRefreshToken,
  removeRefreshToken,
  getUserById,
} from "@/lib/auth";
import { serialize } from "cookie";

export async function POST(request) {
  try {
    // Get refresh token from cookie
    const cookieHeader = request.headers.get("cookie");
    if (!cookieHeader) {
      return NextResponse.json({ error: "No refresh token" }, { status: 401 });
    }

    const cookies = parse(cookieHeader);
    const refreshToken = cookies.refreshToken;

    if (!refreshToken) {
      return NextResponse.json({ error: "No refresh token" }, { status: 401 });
    }

    // Verify token signature
    const result = verifyRefreshToken(refreshToken);
    if (!result.valid) {
      return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
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

    // Rotate refresh token (remove old, create new)
    await removeRefreshToken(refreshToken);

    const newAccessToken = generateAccessToken(user.id);
    const newRefreshToken = generateRefreshToken(user.id);

    await storeRefreshToken(user.id, newRefreshToken);

    // Set new refresh token cookie
    const cookie = serialize("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
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
