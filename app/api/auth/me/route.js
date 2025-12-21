import { NextResponse } from "next/server";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/authMiddleware";
import { getUserById } from "@/lib/auth";

export async function GET(request) {
  const userId = getAuthenticatedUserId(request);

  if (!userId) {
    return unauthorizedResponse();
  }

  try {
    const user = await getUserById(userId);

    if (!user) {
      return unauthorizedResponse("User not found");
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}
