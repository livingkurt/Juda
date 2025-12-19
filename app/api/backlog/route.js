import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const backlog = await prisma.backlogItem.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(backlog);
  } catch (error) {
    console.error("Error fetching backlog:", error);
    return NextResponse.json(
      { error: "Failed to fetch backlog" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { title } = body;

    const item = await prisma.backlogItem.create({
      data: {
        title,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error creating backlog item:", error);
    return NextResponse.json(
      { error: "Failed to create backlog item" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, completed } = body;

    const item = await prisma.backlogItem.update({
      where: { id },
      data: { completed },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error updating backlog item:", error);
    return NextResponse.json(
      { error: "Failed to update backlog item" },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Backlog item ID is required" },
        { status: 400 }
      );
    }

    await prisma.backlogItem.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting backlog item:", error);
    return NextResponse.json(
      { error: "Failed to delete backlog item" },
      { status: 500 }
    );
  }
}
