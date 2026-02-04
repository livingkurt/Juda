# Scalability Implementation Plan

## 🎯 Goal
Transform the app from loading ALL tasks upfront to a scalable, lazy-loading architecture that handles thousands of tasks efficiently.

---

## 📊 Current State Analysis

### Architecture Issues
1. **Single Query Loads Everything**: `useTasksWithDeferred()` loads ALL tasks
2. **Multiple Views Share Data**: Today, Backlog, Calendar all filter from same array
3. **No Pagination**: All tasks loaded at once, no lazy loading
4. **No Virtualization**: All visible tasks rendered in DOM
5. **No Database Indexes**: Queries may be slow at scale

### Impact
- **Small datasets (<100 tasks)**: Works fine
- **Medium datasets (100-500 tasks)**: Noticeable delay (5-10s)
- **Large datasets (>500 tasks)**: Unacceptable delay (30s+)

---

## 🚀 Implementation Plan

### Phase 1: Separate Queries Per View ✅ (IN PROGRESS)
**Goal**: Each view loads only the data it needs

#### 1.1: Create View-Specific Hooks
- [x] `useTasksForToday(date)` - Created (but reverted due to architecture issue)
- [x] `useBacklogTasks(options)` - Created (but reverted)
- [ ] Refactor to work with shared cache strategy

#### 1.2: Update API Routes
- [x] Add `view` and `date` parameters to `/api/tasks`
- [x] Add backlog-specific filtering
- [ ] Add today-specific filtering (without breaking backlog)
- [ ] Add calendar range filtering

#### 1.3: Smart Cache Strategy
- [ ] Design cache key structure for different views
- [ ] Implement cache sharing where possible
- [ ] Add cache invalidation logic

**Status**: Partially complete, needs architecture redesign

---

### Phase 2: Pagination for Initial Load ✅ COMPLETE
**Goal**: Load first 50 tasks instantly, rest in background

#### 2.1: API Pagination
- [x] Modified `/api/tasks` to support cursor parameter
- [x] Reduced default limit from 500 to 50
- [x] Added cursor-based pagination support

#### 2.2: Frontend Pagination
- [x] Created `useTasksWithPagination` hook
- [x] Loads first 50 tasks immediately
- [x] Loads remaining tasks in background
- [x] Merges results seamlessly with deduplication

#### 2.3: Background Loading
- [x] First batch loads instantly (50 tasks)
- [x] Second batch loads in background (all remaining)
- [x] `isLoadingMore` indicator for background loading
- [x] Updated `useTasksWithDeferred` to use pagination

**Status**: ✅ Complete - Ready for testing

---

### Phase 3: Database Optimization ✅ COMPLETE
**Goal**: Reduce DB query time from seconds to milliseconds

#### 3.1: Add Indexes ✅
- [x] Index on `userId` (critical for multi-tenant)
- [x] Index on `sectionId` (for today view filtering)
- [x] Index on `parentId` (for subtask queries)
- [x] Composite index on `(userId, sectionId, order)`
- [x] Index on `completionType` (for filtering notes/goals)
- [x] Partial index for backlog queries `(userId, order) WHERE sectionId IS NULL`
- [x] Indexes on `TaskCompletion` (taskId, date)
- [x] Indexes on `TaskTag` (taskId, tagId)

#### 3.2: Query Optimization
- [x] Added timing diagnostics to API
- [ ] Analyze slow queries with EXPLAIN (pending real-world data)
- [ ] Optimize joins if needed (pending performance data)

#### 3.3: Database Migration
- [x] Generated migration `0044_add_performance_indexes.sql`
- [x] Applied migration successfully
- [x] All indexes created with `IF NOT EXISTS` for safety

**Status**: ✅ Complete - Indexes deployed

---

### Phase 4: Virtualization
**Goal**: Only render visible tasks in DOM

#### 4.1: Install Dependencies
- [ ] Add `@tanstack/react-virtual` (modern, performant)
- [ ] Or `react-window` (simpler, proven)

#### 4.2: Virtualize Task Lists
- [ ] Virtualize BacklogDrawer task list
- [ ] Virtualize Today view sections
- [ ] Virtualize Calendar day view

#### 4.3: Optimize Rendering
- [ ] Ensure TaskItem is properly memoized
- [ ] Add windowing for off-screen tasks
- [ ] Test with 1000+ tasks

**Status**: Not started

---

## 📈 Progress Tracking

### Completed
- ✅ Client-side lookup optimizations (date caching)
- ✅ API timing diagnostics
- ✅ Initial view-specific API parameters
- ✅ **Phase 2: Pagination** - Load first 50 tasks instantly, rest in background
- ✅ **Phase 3: Database Indexes** - 10 indexes added for query optimization

### In Progress
- 🔄 Phase 4: Virtualization (optional, based on testing results)

### Next Up
- 🎯 Test performance improvements
- 🎯 Add virtualization if still needed
- 🎯 Monitor real-world performance

---

## 🔧 Technical Details

### New Architecture Design

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Today View   │  │ Backlog View │  │ Calendar View│     │
│  │              │  │              │  │              │     │
│  │ useToday     │  │ useBacklog   │  │ useCalendar  │     │
│  │ Tasks(date)  │  │ Tasks(opts)  │  │ Tasks(range) │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
│                    ┌───────▼────────┐                        │
│                    │  RTK Query     │                        │
│                    │  Cache Layer   │                        │
│                    └───────┬────────┘                        │
└────────────────────────────┼─────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│                         Backend                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  GET /api/tasks?view=today&date=2024-02-04                 │
│  GET /api/tasks?view=backlog&cursor=abc&limit=50           │
│  GET /api/tasks?view=calendar&start=...&end=...            │
│                                                              │
│  ┌────────────────────────────────────────────────┐        │
│  │         PostgreSQL with Indexes                 │        │
│  │  - userId (btree)                               │        │
│  │  - (userId, sectionId, order) (composite)       │        │
│  │  - parentId (btree)                             │        │
│  └────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Cache Key Strategy

```javascript
// Different views use different cache keys
getTasks({ view: "today", date: "2024-02-04" })     // Cache key: tasks-today-2024-02-04
getTasks({ view: "backlog", cursor: "abc" })        // Cache key: tasks-backlog-abc
getTasks({ view: "calendar", start: "...", end: "..."}) // Cache key: tasks-calendar-start-end

// Mutations invalidate relevant caches
updateTask() → invalidate: ["tasks-today-*", "tasks-backlog-*", "tasks-calendar-*"]
```

---

## 📝 Implementation Log

### 2024-02-04: Initial Optimization Attempt
- Attempted server-side date filtering
- **Issue**: Broke backlog because `useTaskFilters` needs all tasks
- **Resolution**: Reverted changes, implemented client-side optimizations instead
- **Learning**: Architecture requires rethinking, not just optimization

### 2024-02-04: Client-Side Optimizations
- Added date string caching in `useCompletionHelpers`
- Added `getLookupsForDate()` for batch lookups
- Reduced per-task overhead significantly
- **Result**: Faster processing, but still loading all tasks

### 2024-02-04: Starting Scalability Redesign
- Created this implementation plan
- Identified 4 phases: Separate Queries, Pagination, DB Optimization, Virtualization
- **Next**: Implement Phase 2 (Pagination) as it has least architectural risk

### 2024-02-04: Phase 2 & 3 Implementation (REVISED)
**Phase 2: Pagination**
- Created `useTasksWithPagination` hook
- Loads first 50 tasks immediately for instant render
- Loads remaining tasks in background
- Updated `useTasksWithDeferred` to use pagination strategy
- Reduced default API limit from 500 to 50

**Phase 3: Database Indexes**
- Generated migration `0044_add_performance_indexes.sql`
- Added 10 indexes covering all major query patterns:
  - Single-column indexes: userId, sectionId, parentId, completionType
  - Composite indexes: (userId, sectionId, order)
  - Partial index for backlog: (userId, order) WHERE sectionId IS NULL
  - Completion indexes: (taskId, date), (date)
  - Tag indexes: (taskId), (tagId)
- Applied migration successfully

**Expected Impact:**
- Initial load: 30s → <2s (15x faster)
- Database queries: Potentially 10-100x faster with indexes
- Background loading: Invisible to user

### 2024-02-04: ARCHITECTURE REDESIGN - Separate Endpoints Per View (COMPLETE!)

**FINALLY doing it right!** Created separate API endpoints for EVERY view:

**New API Endpoints:**
1. `GET /api/tasks/today?date=YYYY-MM-DD` - Returns ONLY tasks for that date (TasksTab)
2. `GET /api/tasks/backlog` - Returns ONLY backlog tasks (BacklogDrawer)
3. `GET /api/tasks/notes` - Returns ONLY note tasks (NotesTab)
4. `GET /api/tasks/workout` - Returns ONLY workout tasks (WorkoutTab)
5. `GET /api/tasks/recurring` - Returns ONLY recurring tasks (JournalTab, HistoryTab)

**New Hooks:**
1. `useTasksForToday(date)` - Fetches today's tasks
2. `useBacklogTasks()` - Fetches backlog tasks
3. `useNoteTasks()` - Fetches note tasks
4. `useWorkoutTasks()` - Fetches workout tasks
5. `useRecurringTasks()` - Fetches recurring tasks (Journal/History)

**Updated Components:**
1. `useTaskFilters.js` - Uses `useTasksForToday` + `useBacklogTasks`
2. `NotesTab.jsx` - Uses `useNoteTasks`
3. `WorkoutTab.jsx` - Uses `useWorkoutTasks`
4. `JournalTab.jsx` - Uses `useRecurringTasks`
5. `HistoryTab.jsx` - Uses `useRecurringTasks`
6. `GoalsTab.jsx` - Already had its own `useGetGoalsQuery`

**Expected Impact:**
- Each tab loads ONLY what it needs
- Today view: ~50 tasks instead of ~500 (90% reduction)
- Backlog: ~100 tasks instead of ~500 (80% reduction)
- Notes: ~20 notes instead of ~500 tasks (96% reduction)
- Workout: ~5 workouts instead of ~500 tasks (99% reduction)
- Journal/History: ~50 recurring tasks instead of ~500 (90% reduction)

**Initial load per tab: <1 second instead of 30 seconds!**

**Remaining Work:**
- CalendarViewTab legacy query ✅ replaced with range endpoint

**Cleanup:**
- Removed unused `hooks/useTasksWithPagination.js` (lint rule disallowed setState in effects)
- Pagination will be reintroduced after virtualization with a hook that does not rely on setState-in-effect

**Virtualization / Lazy Rendering:**
- Added incremental rendering in Today sections and Backlog (first batch + "Load more")

---

### 2024-02-04: Critical Fix - Pagination Was Still Loading All Tasks
**Problem Discovered**: The pagination hook was still calling `{ all: true }` which loaded ALL tasks
- Network tab showed 16.7 MB transferred
- User saw empty page for 10 seconds, then all tasks appeared at once
- No loading indicators

**Solution Implemented:**
1. **Fixed Pagination Logic**
   - Changed from two-query approach to incremental page loading
   - First page: 100 tasks (instant render)
   - Subsequent pages: Load automatically in background
   - Stop when no more pages

2. **Added Loading Skeletons**
   - Created `TaskSkeleton` and `SectionSkeleton` components
   - Show skeletons during initial load
   - Show "Loading more tasks..." indicator during background loading

3. **Updated TodayView**
   - Added `isLoadingMore` prop
   - Renders loading skeletons on first load
   - Shows progress indicator at bottom during background loading

**Files Changed:**
- `hooks/useTasksWithPagination.js` - Completely rewritten for true pagination
- `components/TaskSkeleton.jsx` - NEW loading skeleton components
- `components/tabs/TodayView.jsx` - Added loading indicators
- `components/tabs/TasksTab.jsx` - Pass loading states to TodayView

---

## 🎯 Success Metrics

### Performance Targets
| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Initial load (50 tasks) | 30s | <1s | Time to first render |
| Initial load (500 tasks) | 30s | <2s | Time to first render |
| Initial load (5000 tasks) | ? | <3s | Time to first render |
| Scroll performance | ? | 60fps | Frame rate during scroll |
| Task interaction | Instant | Instant | Click to checkbox response |

### User Experience Targets
- [ ] Page renders within 1 second on initial load
- [ ] Smooth 60fps scrolling in all views
- [ ] No UI freezing during interactions
- [ ] Background loading is invisible to user
- [ ] Works smoothly with 5000+ tasks

---

## 🚨 Risks & Mitigation

### Risk 1: Breaking Existing Functionality
**Mitigation**: 
- Implement behind feature flag
- Maintain backward compatibility
- Comprehensive testing before rollout

### Risk 2: Cache Invalidation Complexity
**Mitigation**:
- Use RTK Query's built-in invalidation
- Clear, documented cache key strategy
- Add cache debugging tools

### Risk 3: Database Migration Downtime
**Mitigation**:
- Create indexes concurrently (no locks)
- Test on staging with production-size data
- Have rollback plan ready

---

## 📚 Resources

- [RTK Query Pagination](https://redux-toolkit.js.org/rtk-query/usage/pagination)
- [TanStack Virtual](https://tanstack.com/virtual/latest)
- [PostgreSQL Index Best Practices](https://www.postgresql.org/docs/current/indexes.html)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
