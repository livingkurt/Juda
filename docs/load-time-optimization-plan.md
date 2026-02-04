# Load Time Optimization Plan

## 🔴 Critical Issue: 30-Second Initial Load

### Root Causes Identified

1. **Loading ALL Tasks Upfront**
   - API fetches ALL tasks without limit (`includeAll = true`)
   - Frontend processes ALL tasks in `useTaskFilters` hook
   - Heavy operations: `.filter()`, `.map()`, nested subtask processing
   - Even with `useDeferredValue`, we're still loading/processing everything

2. **No Lazy Loading**
   - All tasks loaded at once, not on-demand
   - No pagination or windowing
   - Processing hundreds/thousands of tasks when only ~20 visible

3. **Expensive Filtering Operations**
   - `useTaskFilters` runs multiple passes over ALL tasks:
     - Filter by date (line 52-78)
     - Map with completion status (line 80-96)
     - Filter by search/tags (line 101-116)
     - Group by section (line 119-200+)
     - Sort by time/priority (line 137-150)
   - Each operation processes the ENTIRE task array

4. **No Virtualization**
   - Rendering all visible tasks at once
   - No windowing for long lists
   - DOM nodes created for every task

---

## 🎯 Solution Strategy

### Phase 1: API-Level Optimization (CRITICAL)

**Goal**: Only load tasks needed for the current view

#### 1.1: Add Date-Based Filtering to API
```javascript
// New API endpoint: GET /api/tasks?date=2024-02-04&view=today
// Returns only tasks that should show on that specific date
```

**Changes needed**:
- Add `date` query param to `/api/tasks/route.js`
- Filter tasks by `recurrence` logic server-side
- Return only relevant tasks (~20-50 instead of ALL)

#### 1.2: Separate Backlog Query
```javascript
// GET /api/tasks?view=backlog&limit=50
// Returns only backlog tasks (no date/section)
```

**Benefits**:
- Today view: Load only today's tasks
- Backlog: Load only first 50, lazy load more on scroll
- Reduces initial payload from 1000s to ~50 tasks

---

### Phase 2: Frontend Optimization

#### 2.1: Lazy Load Backlog
- Load first 50 backlog items
- Implement infinite scroll
- Load more as user scrolls down

#### 2.2: Optimize `useTaskFilters`
- Skip expensive operations for non-visible tasks
- Use `useMemo` more aggressively
- Consider moving date filtering to API

#### 2.3: Add Virtualization (Optional)
- Use `react-window` or `react-virtual` for long lists
- Only render visible tasks in viewport
- Dramatically reduces DOM nodes

---

### Phase 3: Caching Strategy

#### 3.1: Smart Cache Invalidation
- Cache today's tasks separately from backlog
- Invalidate only affected date ranges
- Keep frequently accessed dates cached

#### 3.2: Background Prefetching
- Prefetch tomorrow's tasks in background
- Prefetch adjacent calendar days
- Smooth navigation between dates

---

## 📊 Expected Improvements

| Metric | Before | After Phase 1 | After Phase 2 | After Phase 3 |
|--------|--------|---------------|---------------|---------------|
| Initial API payload | ALL tasks | ~50 tasks | ~50 tasks | ~50 tasks |
| Processing time | ~30s | ~1s | ~0.5s | ~0.3s |
| Tasks rendered | ALL visible | ALL visible | Only viewport | Only viewport |
| Time to interactive | 30s | 2s | 1s | <0.5s |

---

## 🚀 Implementation Order

### Priority 1: API Date Filtering (Biggest Impact)
1. Modify `/app/api/tasks/route.js` to accept `date` param
2. Implement server-side `shouldShowOnDate` logic
3. Update `useTasksWithDeferred` to pass date param
4. Test with today view

### Priority 2: Separate Backlog Loading
1. Create separate query for backlog tasks
2. Implement lazy loading in `BacklogDrawer`
3. Add infinite scroll

### Priority 3: Virtualization (If Still Needed)
1. Add `react-window` dependency
2. Wrap task lists in `FixedSizeList`
3. Adjust styling for virtual scrolling

---

## 🔧 Technical Details

### Server-Side Date Filtering

```javascript
// app/api/tasks/route.js
export const GET = withApi(async (request, { userId, getSearchParams }) => {
  const dateParam = searchParams.get("date"); // "2024-02-04"
  const view = searchParams.get("view"); // "today" | "backlog" | "all"
  
  if (view === "today" && dateParam) {
    // Filter tasks by recurrence logic
    const targetDate = new Date(dateParam);
    const relevantTasks = await getTasksForDate(userId, targetDate);
    return NextResponse.json(relevantTasks);
  }
  
  if (view === "backlog") {
    // Return only tasks with no date/section
    const backlogTasks = await getBacklogTasks(userId, limit, offset);
    return NextResponse.json(backlogTasks);
  }
  
  // Fallback: return all (for calendar views that need multiple days)
  return NextResponse.json(allTasks);
});
```

### Updated Hook Usage

```javascript
// hooks/useTasksForToday.js (NEW)
export function useTasksForToday(date) {
  const dateStr = date.toISOString().split('T')[0];
  return useGetTasksQuery({ date: dateStr, view: "today" });
}

// hooks/useBacklogTasks.js (NEW)
export function useBacklogTasks(limit = 50, offset = 0) {
  return useGetTasksQuery({ view: "backlog", limit, offset });
}
```

---

## ⚠️ Considerations

1. **Calendar Views**: Still need multiple days of tasks
   - Week view: Load 7 days
   - Month view: Load 30 days
   - Use separate query or batch API

2. **Search/Filtering**: May need to load more tasks
   - Option A: Search on server-side
   - Option B: Load all when searching (with warning)

3. **Offline Support**: Current offline middleware caches ALL tasks
   - May need to adjust caching strategy
   - Consider selective caching by date range

---

## ✅ Implementation Status

### Phase 1: API Date Filtering - REVERTED (Broke backlog)

The initial approach broke the application because:
- `useTaskFilters` needs ALL tasks to compute both today's tasks AND backlog tasks
- Filtering server-side for just today's date meant backlog showed "No tasks"
- The architecture requires all tasks to be loaded once and filtered client-side

**Lesson Learned**: The app's architecture requires all tasks upfront. We need to optimize differently.

---

### Phase 2: Client-Side Optimizations - IMPLEMENTED

**Changes Made:**

1. **Optimized Completion Lookups** (`useCompletionHelpers.js`)
   - Added date string caching in `getNormalizedDateString`
   - Added `getLookupsForDate(date)` function that pre-computes the date key ONCE
   - Batch lookups reuse the same normalized date string for all tasks
   - Reduces per-task overhead from O(expensive regex + Date creation) to O(1)

2. **Updated `useTaskFilters.js`**
   - Now uses optimized `getLookupsForDate(viewDate)` for today's tasks
   - Pre-computes date lookup once, then uses simple string concatenation for each task
   - Same optimization for backlog tasks with `getLookupsForDate(today)`

3. **API Timing Diagnostics**
   - Added timing logs to `/api/tasks` to measure DB vs total time
   - Check browser console for `[GET /api/tasks]` logs to identify bottleneck

**Expected Impact:**
- Reduced per-task processing from ~10ms to ~0.1ms
- For 500 tasks, saves ~5 seconds of processing time

---

## 📝 Next Steps

1. **Identify the Real Bottleneck**
   - Check browser Network tab for API response time
   - Check server logs for `[GET /api/tasks]` timing
   - Measure: Is it DB, Network, or Client processing?

2. **If DB is slow (>5s):**
   - Add database indexes on `userId`, `sectionId`
   - Consider pagination for initial load

3. **If Network is slow:**
   - Reduce JSON payload size (exclude unused fields)
   - Enable gzip compression

4. **If Client is still slow:**
   - Profile with React DevTools
   - Consider virtualization for very long lists
   - Lazy load tab content
