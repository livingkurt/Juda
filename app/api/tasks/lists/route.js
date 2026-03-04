import { NextResponse } from "next/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks } from "@/lib/schema";
import { withApi } from "@/lib/apiHelpers";

const mapTags = task => ({
  ...task,
  tags: task.taskTags?.map(tt => tt.tag) || [],
  subtasks: (task.subtasks || []).map(subtask => ({
    ...subtask,
    tags: subtask.taskTags?.map(tt => tt.tag) || [],
  })),
});

export const GET = withApi(async (request, { userId }) => {
  const templateRows = await db.query.tasks.findMany({
    where: and(eq(tasks.userId, userId), eq(tasks.taskKind, "list_template"), isNull(tasks.parentId)),
    with: {
      taskTags: {
        with: {
          tag: true,
        },
      },
      subtasks: {
        with: {
          taskTags: {
            with: {
              tag: true,
            },
          },
        },
        orderBy: [asc(tasks.order)],
      },
    },
    orderBy: [asc(tasks.updatedAt)],
  });

  const instanceRows = await db.query.tasks.findMany({
    where: and(eq(tasks.userId, userId), eq(tasks.taskKind, "list_instance"), isNull(tasks.parentId)),
    with: {
      taskTags: {
        with: {
          tag: true,
        },
      },
      subtasks: {
        with: {
          taskTags: {
            with: {
              tag: true,
            },
          },
        },
        orderBy: [asc(tasks.order)],
      },
    },
    orderBy: [asc(tasks.updatedAt)],
  });

  return NextResponse.json({
    templates: templateRows.map(mapTags),
    instances: instanceRows.map(mapTags),
  });
});
