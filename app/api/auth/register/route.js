import { NextResponse } from "next/server";
import { createUser, getUserByEmail, generateAccessToken, generateRefreshToken, storeRefreshToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { sections } from "@/lib/schema";
import { serialize } from "cookie";

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    // Create user
    const user = await createUser(email, password, name);

    // Create default sections for new user
    const defaultSections = [
      { userId: user.id, name: "Morning", icon: "Sun", order: 0, expanded: true },
      { userId: user.id, name: "Afternoon", icon: "Sunset", order: 1, expanded: true },
      { userId: user.id, name: "Evening", icon: "Moon", order: 2, expanded: true },
    ];

    await db.insert(sections).values(defaultSections);

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token
    await storeRefreshToken(user.id, refreshToken);

    // Set refresh token as HTTP-only cookie (365 days to match token expiry)
    const cookie = serialize("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
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
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Failed to register user" }, { status: 500 });
  }
}
