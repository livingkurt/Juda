import { NextResponse } from "next/server";
import { getUserByEmail, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db.js";
import { users } from "@/lib/schema.js";
import { eq } from "drizzle-orm";

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, newPassword } = body;

    // Validate input
    if (!email || !newPassword) {
      return NextResponse.json({ error: "Email and new password are required" }, { status: 400 });
    }

    // Validate password length
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // Find user
    const user = await getUserByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({ success: true, message: "If the email exists, password has been updated" });
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, user.id));

    return NextResponse.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
  }
}
