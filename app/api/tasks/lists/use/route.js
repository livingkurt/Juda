import { NextResponse } from "next/server";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { listItems, taskListItems, taskTags, tags, tasks } from "@/lib/schema";
import { Errors, validateRequired, withApi } from "@/lib/apiHelpers";

const dedupeIds = values => Array.from(new Set((values || []).filter(Boolean)));

export const POST = withApi(async (request, { userId, getBody }) => {
  const body = await getBody();
  validateRequired(body, ["templateId", "title"]);

  const {
    templateId,
    title,
    sectionId = null,
    time = null,
    duration = 30,
    recurrence = null,
    priority = null,
    tagIds = null,
  } = body;

  const template = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, templateId), eq(tasks.userId, userId), eq(tasks.taskKind, "list_template")),
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
  });

  if (!template) {
    throw Errors.notFound("List template");
  }

  const requestedTagIds = dedupeIds(tagIds);
  const inheritedTagIds = (template.taskTags || []).map(tt => tt.tagId);
  const finalTagIds = requestedTagIds.length > 0 ? requestedTagIds : inheritedTagIds;

  const createdInstance = await db.transaction(async tx => {
    if (finalTagIds.length > 0) {
      const tagRows = await tx.query.tags.findMany({
        where: and(eq(tags.userId, userId), inArray(tags.id, finalTagIds)),
      });
      if (tagRows.length !== finalTagIds.length) {
        throw Errors.notFound("One or more tags");
      }
    }

    const [instance] = await tx
      .insert(tasks)
      .values({
        userId,
        title: title.trim(),
        sectionId,
        time,
        duration: duration ?? 30,
        recurrence: recurrence || null,
        priority,
        completionType: "checkbox",
        taskKind: "list_instance",
        listTemplateId: template.id,
        order: 999,
      })
      .returning();

    if (finalTagIds.length > 0) {
      await tx.insert(taskTags).values(
        finalTagIds.map(tagId => ({
          taskId: instance.id,
          tagId,
        }))
      );
    }

    const templateSubtasks = template.subtasks || [];
    let templateSubtaskItemLinks = [];
    if (templateSubtasks.length > 0) {
      templateSubtaskItemLinks = await tx.query.taskListItems.findMany({
        where: inArray(
          taskListItems.taskId,
          templateSubtasks.map(subtask => subtask.id)
        ),
        orderBy: [asc(taskListItems.order)],
      });
    }

    const listItemIds = dedupeIds(templateSubtaskItemLinks.map(link => link.listItemId));
    if (listItemIds.length > 0) {
      const libraryRows = await tx.query.listItems.findMany({
        where: and(eq(listItems.userId, userId), inArray(listItems.id, listItemIds)),
      });
      if (libraryRows.length !== listItemIds.length) {
        throw Errors.badRequest("Template contains list items outside your library");
      }
    }

    if (templateSubtasks.length > 0) {
      const clonedSubtasks = await tx
        .insert(tasks)
        .values(
          templateSubtasks.map((subtask, index) => ({
            userId,
            title: subtask.title,
            parentId: instance.id,
            sectionId,
            time: null,
            duration: subtask.duration ?? 30,
            recurrence: null,
            completionType: "checkbox",
            taskKind: "default",
            order: index,
          }))
        )
        .returning();

      const cloneByTemplateId = new Map();
      templateSubtasks.forEach((subtask, index) => {
        cloneByTemplateId.set(subtask.id, clonedSubtasks[index]);
      });

      const mappedItemRows = templateSubtaskItemLinks
        .map(link => {
          const cloned = cloneByTemplateId.get(link.taskId);
          if (!cloned) return null;
          return {
            taskId: cloned.id,
            listItemId: link.listItemId,
            order: link.order ?? 0,
          };
        })
        .filter(Boolean);

      if (mappedItemRows.length > 0) {
        await tx.insert(taskListItems).values(mappedItemRows);
      }
    }

    return instance;
  });

  const instanceWithRelations = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, createdInstance.id), eq(tasks.userId, userId)),
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
  });

  const payload = {
    ...instanceWithRelations,
    tags: instanceWithRelations?.taskTags?.map(tt => tt.tag) || [],
    subtasks: (instanceWithRelations?.subtasks || []).map(subtask => ({
      ...subtask,
      tags: subtask.taskTags?.map(tt => tt.tag) || [],
    })),
  };

  return NextResponse.json(payload, { status: 201 });
});
