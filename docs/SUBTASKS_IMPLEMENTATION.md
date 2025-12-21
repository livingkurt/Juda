# Subtasks Implementation - Parent-Child Architecture

## Overview

Subtasks are now **full tasks** stored in the Task table with a `parentId` field that creates parent-child relationships. This allows tasks to be dragged onto other tasks to become subtasks, and subtasks can be dragged out to become regular tasks again.

## Database Schema

### Added Field

```sql
ALTER TABLE "Task" ADD COLUMN "parentId" text;
ALTER TABLE "Task" ADD CONSTRAINT "Task_parentId_Task_id_fk"
  FOREIGN KEY ("parentId") REFERENCES "public"."Task"("id")
  ON DELETE cascade;
CREATE INDEX "Task_parentId_idx" ON "Task"("parentId");
```

### Removed Field

- The old `subtasks` JSONB field is no longer used (will be removed in future migration)

## Key Features

### 1. Drag-to-Combine

- Drag any task onto another task
- **Hover for 800ms** to auto-expand the target task (if it has subtasks)
- Drop to make the dragged task a subtask
- Visual feedback: blue dashed border + scale effect when hovering

### 2. Promote Subtasks

- Drag a subtask out of its parent
- Drop it in any section, backlog, or calendar view
- Automatically clears `parentId` to promote it to a root task
- Toast notification confirms the promotion

### 3. Subtask Display

- Subtasks are full tasks with all properties (time, color, duration, recurrence)
- Display in expanded parent task view
- Can be reordered within parent
- Can be edited, deleted, duplicated like regular tasks

## Implementation Details

### Data Organization (hooks/useTasks.js)

```javascript
// Tasks are fetched flat from DB and organized into tree structure
const tasksMap = new Map(data.map(t => [t.id, { ...t, subtasks: [] }]));
const rootTasks = [];

data.forEach(task => {
  if (task.parentId && tasksMap.has(task.parentId)) {
    // Add to parent's subtasks array
    tasksMap.get(task.parentId).subtasks.push(taskWithSubtasks);
  } else {
    // Root task
    rootTasks.push(taskWithSubtasks);
  }
});
```

### Hover-to-Expand (components/TaskItem.jsx)

```javascript
useEffect(() => {
  if (isOver && task.subtasks?.length > 0) {
    hoverTimeoutRef.current = setTimeout(() => {
      if (!task.expanded) {
        onToggleExpand(task.id);
      }
    }, 800); // 800ms delay
  }
}, [isOver]);
```

### Drag Logic (app/page.jsx)

```javascript
// Detect if dragging a subtask
const isSubtask = sourceTask?.subtasks?.some(st => st.id === taskId);

// Promote if dragging to non-task target
if (isSubtask && !droppingOnTask) {
  await promoteSubtask(taskId); // Clears parentId
}

// Combine if dropping on task
if (droppingOnTask) {
  await combineAsSubtask(sourceId, targetId); // Sets parentId
}
```

## API Changes

### POST /api/tasks

```javascript
// Added parentId field
{
  title: "Task title",
  sectionId: "section123",
  parentId: "parent456", // NEW: optional parent task ID
  time: "09:00",
  duration: 30,
  color: "#3b82f6",
  recurrence: {...}
}
```

### PUT /api/tasks

```javascript
// parentId can be updated or set to null
{
  id: "task123",
  parentId: null, // Clears parent (promotes to root)
}
```

## User Experience

### Creating Subtasks

1. Drag a task over another task
2. Wait 800ms (task auto-expands if it has subtasks)
3. Drop to combine
4. Toast: "Task combined - Task has been added as a subtask"

### Promoting Subtasks

1. Expand parent task to see subtasks
2. Drag subtask out
3. Drop in section, backlog, or calendar
4. Toast: "Subtask promoted - Subtask is now a regular task"

### Visual Feedback

- **Hovering over task**: Blue dashed border, slight scale up
- **Auto-expand**: Parent expands after 800ms hover
- **Subtask display**: Full task properties (color, time, badges)

## Edge Cases Handled

1. **Circular references**: Cannot drop task on its own subtask
2. **Self-drop prevention**: Cannot drop task on itself
3. **Cascade delete**: Deleting parent deletes all subtasks (DB constraint)
4. **Completion tracking**: Subtasks have independent completion records
5. **Reordering**: Subtasks can be reordered within parent

## Migration Path

### For Existing Data

If you have tasks with the old `subtasks` JSON field:

```javascript
// Migration script needed to convert JSON subtasks to Task records
// For each task with subtasks:
// 1. Create new Task records with parentId set
// 2. Copy all properties from JSON to new records
// 3. Clear the old subtasks JSON field
```

## Testing Checklist

- [x] Drag task onto another task → becomes subtask
- [x] Hover 800ms → parent auto-expands
- [x] Subtasks display with full properties
- [x] Drag subtask to section → promotes to root task
- [x] Drag subtask to backlog → promotes to root task
- [x] Drag subtask to calendar → promotes to root task
- [x] Cannot drop task on itself
- [x] Cannot create circular references
- [x] Visual feedback on hover
- [x] Toast notifications work
- [x] Persistence after refresh

## Files Modified

1. **lib/schema.js** - Added parentId field and relations
2. **drizzle/0001_add_parent_id.sql** - Migration file
3. **app/api/tasks/route.js** - Handle parentId in POST/PUT
4. **hooks/useTasks.js** - Organize tasks by parentId, add combineAsSubtask/promoteSubtask
5. **components/TaskItem.jsx** - Hover-to-expand logic
6. **app/page.jsx** - Drag logic for combining/promoting

## Future Enhancements

- [ ] Data migration script for old subtasks JSON
- [ ] Remove old subtasks column from schema
- [ ] Bulk promote/demote operations
- [ ] Nested subtask depth limits (currently unlimited)
- [ ] Subtask completion rollup to parent
- [ ] Undo/redo support
