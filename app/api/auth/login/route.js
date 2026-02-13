import { NextResponse } from "next/server";
import {
  getUserByEmail,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  storeRefreshToken,
} from "@/lib/auth";
import { serialize } from "cookie";

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Find user
    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token
    await storeRefreshToken(user.id, refreshToken);

    // Set refresh token as HTTP-only cookie (365 days to match token expiry)
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
      accessToken,
    });

    response.headers.set("Set-Cookie", cookie);

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Failed to login" }, { status: 500 });
  }
}
