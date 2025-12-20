import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request) {
  try {
    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "Items array is required" },
        { status: 400 }
      );
    }

    // Update all backlog items with new order in a transaction
    await prisma.$transaction(
      items.map((item, index) =>
        prisma.backlogItem.update({
          where: { id: item.id },
          data: { order: index },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering backlog:", error);
    return NextResponse.json(
      { error: "Failed to reorder backlog" },
      { status: 500 }
    );
  }
}
