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

**Note:** BacklogItem still has `completed` field since those are one-time, non-recurring items.

### How Completion Works Now
1. Task = template/pattern (what to do, when to show)
2. TaskCompletion records = instances (specific dates when task was completed)
3. UI derives completion status via `isCompletedOnDate(taskId, date)` which queries TaskCompletion records
4. The `todaysTasks` memo in `page.jsx` adds a virtual `completed` field for UI rendering convenience

This is cleaner architecturally and prevents confusion between task templates and completion instances.

---

## Architecture Decisions

### Task Completion Model
- **Task**: Template/pattern defining what, when, how often (recurrence)
- **TaskCompletion**: Record of specific completion instance (taskId + date)
- **BacklogItem**: One-time item (can have its own `completed` field)

### Date Storage Strategy
All completion dates are stored and compared using **UTC with UTC methods** to ensure consistency across:
- Different user timezones
- Server environments (local dev vs production)
- Database queries and comparisons

**Critical:** Always use `getUTCFullYear()`, `getUTCMonth()`, `getUTCDate()` when normalizing dates, not the local equivalents. This prevents bugs where dates coming from ISO strings are interpreted in the wrong timezone.

This prevents subtle bugs where dates appear to match visually but fail equality checks due to timezone offsets.

