import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, sections } from "@/lib/schema";
import { eq, and, asc } from "drizzle-orm";
import { withApi, Errors, validateRequired } from "@/lib/apiHelpers";

export const PUT = withApi(async (request, { userId, getBody }) => {
  const body = await getBody();
  const { taskId, sourceSectionId, targetSectionId, newOrder } = body;

  validateRequired(body, ["taskId", "sourceSectionId", "targetSectionId"]);

  const sourceSection = await db.query.sections.findFirst({
    where: and(eq(sections.id, sourceSectionId), eq(sections.userId, userId)),
  });
  const targetSection = await db.query.sections.findFirst({
    where: and(eq(sections.id, targetSectionId), eq(sections.userId, userId)),
  });

  if (!sourceSection || !targetSection) {
    throw Errors.notFound("Section");
  }

  const task = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
  });

  if (!task) {
    throw Errors.notFound("Task");
  }

  if (sourceSectionId === targetSectionId) {
    const sectionTasks = await db.query.tasks.findMany({
      where: and(eq(tasks.sectionId, sourceSectionId), eq(tasks.userId, userId)),
      orderBy: [asc(tasks.order)],
    });

    const filteredTasks = sectionTasks.filter(t => t.id !== taskId);
    filteredTasks.splice(newOrder, 0, task);

    for (let i = 0; i < filteredTasks.length; i++) {
      await db
        .update(tasks)
        .set({ order: i, updatedAt: new Date() })
        .where(and(eq(tasks.id, filteredTasks[i].id), eq(tasks.userId, userId)));
    }
  } else {
    const sourceTasks = await db.query.tasks.findMany({
      where: and(eq(tasks.sectionId, sourceSectionId), eq(tasks.userId, userId)),
      orderBy: [asc(tasks.order)],
    });

    const targetTasks = await db.query.tasks.findMany({
      where: and(eq(tasks.sectionId, targetSectionId), eq(tasks.userId, userId)),
      orderBy: [asc(tasks.order)],
    });

    const updatedSourceTasks = sourceTasks.filter(t => t.id !== taskId);
    const updatedTargetTasks = [...targetTasks];
    updatedTargetTasks.splice(newOrder, 0, task);

    await db
      .update(tasks)
      .set({
        sectionId: targetSectionId,
        order: newOrder,
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));

    for (let i = 0; i < updatedSourceTasks.length; i++) {
      if (updatedSourceTasks[i].order !== i) {
        await db
          .update(tasks)
          .set({ order: i, updatedAt: new Date() })
          .where(and(eq(tasks.id, updatedSourceTasks[i].id), eq(tasks.userId, userId)));
      }
    }

    for (let i = 0; i < updatedTargetTasks.length; i++) {
      if (updatedTargetTasks[i].id !== taskId && updatedTargetTasks[i].order !== i) {
        await db
          .update(tasks)
          .set({ order: i, updatedAt: new Date() })
          .where(and(eq(tasks.id, updatedTargetTasks[i].id), eq(tasks.userId, userId)));
      }
    }
  }

  const updatedTask = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
  });

  return NextResponse.json(updatedTask);
});
