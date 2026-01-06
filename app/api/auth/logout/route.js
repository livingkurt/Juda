import { NextResponse } from "next/server";
import { parse, serialize } from "cookie";
import { removeRefreshToken } from "@/lib/auth";

export async function POST(request) {
  try {
    // Get refresh token from cookie
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const cookies = parse(cookieHeader);
      const refreshToken = cookies.refreshToken;

      if (refreshToken) {
        // Remove from database
        await removeRefreshToken(refreshToken);
      }
    }

    // Clear the cookie
    const cookie = serialize("refreshToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict", // Match the sameSite setting used when setting the cookie
      maxAge: 0,
      path: "/",
    });

    const response = NextResponse.json({ success: true });
    response.headers.set("Set-Cookie", cookie);

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Failed to logout" }, { status: 500 });
  }
}
