# Batch Operations Refactor

## Overview

This document describes the performance optimization refactor that replaced multiple sequential API calls with efficient batch operations throughout the Juda codebase.

## Problem

The codebase had several critical performance issues where operations were performed in loops, resulting in N API calls and N database queries:

1. **Completion Management** - When checking/unchecking tasks with subtasks, each subtask triggered a separate API call
2. **Tag Management** - Adding/removing multiple tags from a task resulted in multiple API calls
3. **Subtask Management** - Creating/updating/deleting subtasks happened one at a time

### Example of the Problem

**Before (app/page.jsx lines 506-513):**
```javascript
// Also check all subtasks sequentially to avoid race conditions
if (task.subtasks && task.subtasks.length > 0) {
  for (const subtask of task.subtasks) {
    if (!isCompletedOnDate(subtask.id, targetDate)) {
      await createCompletion(subtask.id, targetDate.toISOString());
    }
  }
}
```

For a task with 10 subtasks, this would make **10 separate API calls** and **10 separate database inserts**.

## Solution

Created batch API endpoints and refactored all frontend code to use them.

### New Batch Endpoints

#### 1. Batch Completions (`/api/completions/batch`)

**POST** - Create multiple completion records at once
```javascript
// Request
{
  "completions": [
    { "taskId": "task1", "date": "2025-01-15T00:00:00.000Z" },
    { "taskId": "task2", "date": "2025-01-15T00:00:00.000Z" }
  ]
}

// Response
{
  "success": true,
  "completions": [...],
  "count": 2
}
```

**DELETE** - Remove multiple completion records at once
```javascript
// Request
{
  "completions": [
    { "taskId": "task1", "date": "2025-01-15T00:00:00.000Z" },
    { "taskId": "task2", "date": "2025-01-15T00:00:00.000Z" }
  ]
}

// Response
{
  "success": true,
  "deletedCount": 2
}
```

**Features:**
- Single query to verify all tasks belong to user
- Transaction-based atomic operations
- Handles duplicate detection automatically
- Proper date normalization (UTC)

#### 2. Batch Task Tags (`/api/task-tags/batch`)

**POST** - Update all tags for a task at once
```javascript
// Request
{
  "taskId": "task1",
  "tagIds": ["tag1", "tag2", "tag3"]
}

// Response
{
  "success": true,
  "addedCount": 2,
  "removedCount": 1
}
```

**Features:**
- Calculates diff automatically (tags to add vs remove)
- Single transaction for all changes
- Verifies task and tags belong to user in parallel queries
- Handles empty tagIds array (removes all tags)

**DELETE** - Remove multiple tag assignments at once
```javascript
// Request
{
  "assignments": [
    { "taskId": "task1", "tagId": "tag1" },
    { "taskId": "task2", "tagId": "tag2" }
  ]
}

// Response
{
  "success": true,
  "deletedCount": 2
}
```

#### 3. Batch Tasks Save/Delete (`/api/tasks/batch-save`)

**POST** - Create or update multiple tasks at once
```javascript
// Request
{
  "tasks": [
    { "title": "New task", "sectionId": "sec1", ... },
    { "id": "task1", "title": "Updated task", ... }
  ]
}

// Response
{
  "success": true,
  "created": [...],
  "updated": [...],
  "createdCount": 1,
  "updatedCount": 1
}
```

**DELETE** - Delete multiple tasks at once
```javascript
// Request
{
  "taskIds": ["task1", "task2", "task3"]
}

// Response
{
  "success": true,
  "deletedCount": 3
}
```

**Features:**
- Automatically separates creates from updates
- Single query to verify all sections exist
- Single query to verify all tasks belong to user
- Transaction-based atomic operations
- Single bulk delete query

### Frontend Refactors

#### useCompletions Hook

Added two new functions:

```javascript
const {
  batchCreateCompletions,  // Create multiple completions at once
  batchDeleteCompletions,  // Delete multiple completions at once
  // ... existing functions
} = useCompletions();
```

**Features:**
- Optimistic updates for instant UI feedback
- Automatic rollback on error
- Proper date normalization

#### useTasks Hook

Refactored `saveTask` function to use batch operations:

**Before:**
```javascript
// Delete removed subtasks
for (const subtaskId of subtasksToDelete) {
  await authFetch(`/api/tasks?id=${subtaskId}`, { method: "DELETE" });
}

// Create or update subtasks
for (const subtask of subtasksData) {
  if (subtask.id && existingSubtaskIds.includes(subtask.id)) {
    await authFetch("/api/tasks", { method: "PUT", body: ... });
  } else {
    await authFetch("/api/tasks", { method: "POST", body: ... });
  }
}

// Add new tags
for (const tagId of tagsToAdd) {
  await authFetch("/api/task-tags", { method: "POST", body: ... });
}

// Remove old tags
for (const tagId of tagsToRemove) {
  await authFetch(`/api/task-tags?...`, { method: "DELETE" });
}
```

**After:**
```javascript
// Delete removed subtasks in batch
if (subtasksToDelete.length > 0) {
  await authFetch("/api/tasks/batch-save", {
    method: "DELETE",
    body: JSON.stringify({ taskIds: subtasksToDelete }),
  });
}

// Batch create/update subtasks
if (subtasksToSave.length > 0) {
  await authFetch("/api/tasks/batch-save", {
    method: "POST",
    body: JSON.stringify({ tasks: subtasksToSave }),
  });
}

// Use batch endpoint to update all tags at once
await authFetch("/api/task-tags/batch", {
  method: "POST",
  body: JSON.stringify({ taskId: savedTask.id, tagIds }),
});
```

#### app/page.jsx

Refactored task completion toggling:

**Before:**
```javascript
await createCompletion(taskId, targetDate.toISOString());

// Also check all subtasks sequentially
if (task.subtasks && task.subtasks.length > 0) {
  for (const subtask of task.subtasks) {
    if (!isCompletedOnDate(subtask.id, targetDate)) {
      await createCompletion(subtask.id, targetDate.toISOString());
    }
  }
}
```

**After:**
```javascript
// Collect all completions to create (task + subtasks) and create in batch
const completionsToCreate = [{ taskId, date: targetDate.toISOString() }];

if (task.subtasks && task.subtasks.length > 0) {
  for (const subtask of task.subtasks) {
    if (!isCompletedOnDate(subtask.id, targetDate)) {
      completionsToCreate.push({ taskId: subtask.id, date: targetDate.toISOString() });
    }
  }
}

await batchCreateCompletions(completionsToCreate);
```

## Performance Impact

### Before vs After

| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Check task with 10 subtasks | 11 API calls, 11 DB queries | 1 API call, 1 DB transaction | **91% reduction** |
| Save task with 5 tags | 5 API calls, 5 DB queries | 1 API call, 1 DB transaction | **80% reduction** |
| Save task with 8 subtasks | 8 API calls, 8 DB queries | 1 API call, 1 DB transaction | **87.5% reduction** |
| Delete 5 subtasks | 5 API calls, 5 DB queries | 1 API call, 1 DB query | **80% reduction** |

### Real-World Impact

For a typical task with 5 subtasks and 3 tags being saved:
- **Before**: 1 (task) + 5 (subtasks) + 3 (tags) = **9 API calls**
- **After**: 1 (task) + 1 (subtasks batch) + 1 (tags batch) = **3 API calls**
- **Improvement**: 67% fewer API calls

### Network Latency Savings

Assuming 50ms average API latency:
- **Before**: 9 calls × 50ms = 450ms
- **After**: 3 calls × 50ms = 150ms
- **Savings**: 300ms (67% faster)

For users with higher latency (200ms):
- **Before**: 9 calls × 200ms = 1800ms (1.8 seconds)
- **After**: 3 calls × 200ms = 600ms (0.6 seconds)
- **Savings**: 1200ms (67% faster)

## Database Optimization

### Transaction Usage

All batch operations use database transactions to ensure:
- **Atomicity**: All operations succeed or all fail
- **Consistency**: No partial updates
- **Isolation**: Concurrent operations don't interfere
- **Durability**: Changes are permanent once committed

### Query Optimization

**Before (N+1 problem):**
```javascript
// Verify each task belongs to user
for (const taskId of taskIds) {
  const task = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.userId, userId))
  });
}
// N queries for N tasks
```

**After (single query):**
```javascript
// Verify all tasks belong to user in one query
const userTasks = await db.query.tasks.findMany({
  where: and(inArray(tasks.id, taskIds), eq(tasks.userId, userId))
});
// 1 query for N tasks
```

## Testing Checklist

- [x] Batch completions endpoint created
- [x] Batch task-tags endpoint created
- [x] Batch tasks save/delete endpoint created
- [x] useCompletions hook updated with batch operations
- [x] useTasks hook refactored to use batch operations
- [x] app/page.jsx updated to use batch completions
- [x] No linter errors
- [ ] Manual testing: Check/uncheck task with subtasks
- [ ] Manual testing: Save task with multiple tags
- [ ] Manual testing: Save task with multiple subtasks
- [ ] Manual testing: Delete multiple subtasks

## Migration Notes

### Breaking Changes

None. All existing single-operation endpoints remain functional for backward compatibility.

### Rollback Plan

If issues arise, the batch endpoints can be disabled by:
1. Reverting the frontend changes in `useTasks.js`, `useCompletions.js`, and `app/page.jsx`
2. The old sequential code paths will work immediately
3. Batch endpoint files can be deleted

### Future Optimizations

1. **Batch reordering for sections**: Currently sections use individual updates
2. **Parallel queries**: Some verification queries could run in parallel
3. **Bulk insert optimization**: Drizzle supports bulk inserts that could be used instead of loops
4. **Caching**: Add Redis caching for frequently accessed data

## Files Changed

### New Files
- `/app/api/completions/batch/route.js` - Batch completions endpoint
- `/app/api/task-tags/batch/route.js` - Batch task-tags endpoint
- `/app/api/tasks/batch-save/route.js` - Batch tasks save/delete endpoint
- `/docs/BATCH_OPERATIONS_REFACTOR.md` - This document

### Modified Files
- `/hooks/useCompletions.js` - Added batch operations
- `/hooks/useTasks.js` - Refactored to use batch operations
- `/app/page.jsx` - Updated to use batch completions

## Conclusion

This refactor significantly improves application performance by:
- Reducing API calls by 67-91% for common operations
- Eliminating N+1 query problems
- Using database transactions for data integrity
- Maintaining backward compatibility
- Following the DRY principle

The application now scales much better with tasks that have many subtasks or tags, providing a faster and more responsive user experience.

