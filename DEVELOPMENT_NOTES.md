# Development Notes & Decisions

This document tracks important decisions and changes made during development.

---

## Session: December 20, 2025 - Timezone Fix for Task Completion

### Issue

Task checkboxes were behaving differently in production (Vercel) vs local development:

- Local: Checkboxes work correctly when connected to production database
- Production (Vercel): Checkboxes check briefly then immediately uncheck

### Root Cause

**Timezone mismatch between client and server**

The completion system was using `setHours(0, 0, 0, 0)` to normalize dates, which sets to midnight in the **local timezone** of the executing environment. This caused:

1. Client normalizes date to midnight in user's local timezone
2. Server (in production) normalizes to midnight in server's timezone (UTC for Vercel)
3. When comparing dates, they don't match exactly
4. The optimistic UI update succeeds but gets reverted when checking against server data

### Solution

Switched all date normalization to use **UTC dates** via `Date.UTC()`:

**Changed files:**

- `hooks/useCompletions.js` - Updated `createCompletion`, `deleteCompletion`, and `isCompletedOnDate` functions
- `app/api/completions/route.js` - Updated POST and DELETE handlers

**Key change:**

```javascript
// Before (timezone-dependent)
const completionDate = new Date(date);
completionDate.setHours(0, 0, 0, 0);

// After (timezone-independent)
const completionDate = new Date(date);
const utcDate = new Date(
  Date.UTC(completionDate.getFullYear(), completionDate.getMonth(), completionDate.getDate(), 0, 0, 0, 0)
);
```

### Why UTC?

- UTC is timezone-agnostic and consistent across all environments
- Both client and server normalize to the same UTC midnight
- Eliminates timezone-related bugs when client and server are in different timezones
- Standard practice for systems that need to work globally

### Impact

- ✅ Checkboxes now work consistently in all environments
- ✅ No breaking changes to existing functionality
- ✅ Existing completion records remain valid (dates stored as ISO strings)
- ⚠️ Deployment required: Must deploy both API routes and frontend changes together

### Testing Checklist

After deploying to production:

- [ ] Verify checkbox toggles work correctly
- [ ] Verify checkboxes stay checked after page refresh
- [ ] Test in different timezones (if possible)
- [ ] Verify completion history displays correctly

### Lessons Learned

1. Always use UTC for date comparisons in distributed systems
2. Local development connected to production DB doesn't catch all deployment issues
3. Timezone bugs are subtle - optimistic updates can hide the problem temporarily
4. Test date-related features across different environments and timezones

---

## Session: December 20, 2025 (Part 2) - Removed Task.completed Field

### Issue

The `completed` field on the Task model was conceptually incorrect and confusing.

### Reasoning

- Tasks are **templates** (especially recurring tasks)
- TaskCompletion records track whether a specific task instance is completed on a specific date
- Having `completed` on the Task itself doesn't make sense for recurring tasks - does "completed" mean today? This week? Ever?

### Solution

**Removed the `completed` field from Task model entirely**

**Changed files:**

- `prisma/schema.prisma` - Removed `completed Boolean @default(false)` from Task model
- `app/api/tasks/route.js` - Removed `completed` from accepted update fields
- `components/TaskDialog.jsx` - Removed `completed` from form initial values
- Created migration: `20251220111053_remove_task_completed_field`

### How Completion Works Now

1. Task = template/pattern (what to do, when to show)
2. TaskCompletion records = instances (specific dates when task was completed)
3. UI derives completion status via `isCompletedOnDate(taskId, date)` which queries TaskCompletion records
4. The `todaysTasks` memo in `page.jsx` adds a virtual `completed` field for UI rendering convenience

This is cleaner architecturally and prevents confusion between task templates and completion instances.

---

## Session: December 20, 2025 (Part 3) - Removed BacklogItem Table & Simplified Backlog

### Issue

The application had two separate systems for backlog items:

1. **BacklogItem** table - Simple "quick notes" with checkboxes
2. **Task** table - Full tasks that appeared in backlog when unscheduled

This was redundant and confusing. Users asked:

- Why can I check off backlog items?
- Why are there two types of backlog items?

### Reasoning

**Tasks should be the single source of truth.** A task appears in the backlog when:

- It has no recurrence (no date set), OR
- It has a date/time in the past (overdue)

The BacklogItem table was unnecessary - tasks already handle everything needed for backlog functionality.

### Solution

**Removed BacklogItem table and simplified backlog to only show unscheduled/overdue tasks**

**Changed files:**

- `prisma/schema.prisma` - Removed BacklogItem model
- `app/api/backlog/route.js` - Deleted (entire API route)
- `app/api/backlog/reorder/route.js` - Deleted
- `hooks/useBacklog.js` - Deleted
- `components/SortableBacklogItem.jsx` - Deleted (only used for BacklogItems)
- `components/BacklogDrawer.jsx` - Removed "Quick Notes" section, removed all BacklogItem handling
- `components/SortableBacklogTask.jsx` - Removed checkbox functionality (can't check off backlog tasks)
- `app/page.jsx` - Removed all BacklogItem state, handlers, and drag logic

**Database migration:** Used `npx prisma db push` to drop BacklogItem table

### Backlog Logic Now

Tasks appear in backlog when:

```javascript
// From page.jsx backlogTasks memo
const backlogTasks = useMemo(() => {
  return tasks
    .filter(task => {
      // Don't show if task should appear on today's view
      if (shouldShowOnDate(task, today)) return false;
      // Don't show if task has a future date/time
      if (hasFutureDateTime(task)) return false;
      return true;
    })
    .map(task => ({
      ...task,
      completed: isCompletedOnDate(task.id, today),
    }));
}, [tasks, today, isCompletedOnDate]);
```

### User Experience Changes

**Before:**

- Backlog had two sections: "Unscheduled Tasks" and "Quick Notes"
- Could check off backlog items (both tasks and quick notes)
- Quick add input at bottom for creating simple notes

**After:**

- Backlog shows only "Unscheduled Tasks"
- No checkboxes on backlog tasks (must schedule them first)
- "+" button opens full task dialog to create properly structured tasks
- Cleaner, simpler interface

### Benefits

- ✅ Single source of truth (Task table)
- ✅ Consistent task management (all tasks have same features)
- ✅ Clearer user intent (backlog = unscheduled, not a todo list)
- ✅ Less code to maintain (removed 5 files, simplified 3 others)
- ✅ No confusion about two types of backlog items

### Migration Notes

- Existing BacklogItem data will be lost when deploying
- Users should be notified to convert any important quick notes to tasks before upgrade
- No breaking changes to Task functionality

---

## Architecture Decisions

### Task Completion Model

- **Task**: Template/pattern defining what, when, how often (recurrence)
- **TaskCompletion**: Record of specific completion instance (taskId + date)
- **Backlog**: Derived view of tasks without dates or with past dates (not a separate table)

### Date Storage Strategy

All completion dates are stored and compared using **UTC with UTC methods** to ensure consistency across:

- Different user timezones
- Server environments (local dev vs production)
- Database queries and comparisons

**Critical:** Always use `getUTCFullYear()`, `getUTCMonth()`, `getUTCDate()` when normalizing dates, not the local equivalents. This prevents bugs where dates coming from ISO strings are interpreted in the wrong timezone.

This prevents subtle bugs where dates appear to match visually but fail equality checks due to timezone offsets.
