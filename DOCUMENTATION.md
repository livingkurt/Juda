# Project Decisions Log

## 2026-02-03

### Task Load Performance - Unblock Initial Render

**Problem**: Initial app load was blocked by fetching all tasks in `app/page.jsx` and by handlers that always triggered the full tasks query, causing multi-minute delays with no visible loading state.

**Solution**:
- Removed `useTasksWithDeferred` from `app/page.jsx` and stopped gating render on task data.
- Added `skipTasksQuery` and `tasksOverride` options to `useCompletionHandlers` to avoid the full tasks query when not needed.
- Passed `allTasksOverride` into `TaskItem` from task list containers to avoid per-item full-task fetching.
- Added a backlog loading state indicator in `BacklogDrawer`.
- Restored one-time completion filtering in `useTaskFilters` so completed tasks don’t reappear on Today view.
- Made `useTasksForToday` robust against invalid dates.
- Ensured backlog endpoint includes subtasks.
- Removed unused `useTasksWithPagination` (lint rule disallowed setState-in-effect); pagination will be reintroduced later.
- Added calendar date-range endpoint and hook to avoid loading all tasks in Calendar views.
- Updated Calendar views to consume range-based data and avoid full-task queries.
- Added incremental rendering in Today sections and Backlog to reduce initial render cost.

**Why**: This keeps the app interactive while view-specific endpoints load, and prevents unnecessary full-task fetches during initial render.

## 2026-02-04

### Rollover System - Infinite Carry Forward

**Problem**: Rolled-over recurring tasks were not showing on the next day (or only showed for one day). The system needed to carry tasks forward indefinitely until completion, then stop showing them.

**Solution**:
- Updated `shouldShowOnDate()` to support infinite rollover by checking the latest completion outcome on or before the target date.
- Added a new `getLatestOutcomeOnOrBeforeDate` hook path so the server can determine rollover state without scanning day-by-day.
- Updated `/api/tasks/today` to compute the latest completion per task up to the target date and pass it into `shouldShowOnDate()`.
- Fixed incorrect `eq(..., array)` usage by switching to `inArray` for completion queries.
- Ensured rollover is triggered via the dedicated rollover endpoint when selecting the outcome menu in Today view.

**Why**: This guarantees that once a task is rolled over, it appears every subsequent day until it receives a completed/not_completed outcome, which matches expected rollover behavior.

### Legacy Endpoints Cleanup

**Problem**: `/api/tasks?view=today` and `/api/tasks?view=backlog` were legacy endpoints and no longer used by the UI.

**Solution**:
- Removed legacy today/backlog filtering from `/app/api/tasks/route.js`.
- Confirmed all current callers use `/api/tasks/today` and `/api/tasks/backlog`.

**Why**: Reduces maintenance surface area and avoids duplication with dedicated endpoints.

## 2026-01-27

### Tag Components - Unified Design System

**Problem**: Multiple tag-related components with inconsistent designs and duplicate functionality:
- `TagMenuSelector` - Context menu with auto-save
- `TagEditor` - Full management dialog (different design)
- `TagSelector` - Form selector
- `TagFilter` - View filtering

**Solution**: Created two focused components with consistent visual design:

**1. TagSelector** - For selecting tags
- Search tags by name
- Select/deselect with checkboxes
- Quick create new tags when search doesn't match
- Inline color picker
- Multiple display modes (default, filter, menuItem)
- Optional "Manage Tags" button

**2. TagEditor** - For managing tags
- Same visual design as TagSelector
- Search existing tags
- Create new tags with color picker
- Edit tag name and color
- Delete tags with confirmation

**Shared Design Language**:
- Search bar at top with magnifying glass icon
- "Create [name]" button when search doesn't match
- Inline color picker (32x32px color squares)
- Consistent spacing and typography
- Same hover effects and transitions

**Implementation Details**:
- Components: `components/TagSelector.jsx`, `components/TagEditor.jsx`
- Documentation: `docs/tag-components.md`
- Updated components:
  - `TaskDialog.jsx` - Uses TagSelector with showManageButton
  - `TaskContextMenu.jsx` - Uses TagSelector in menuItem mode with autoSave
  - `KanbanView.jsx` - Uses TagSelector in filter mode
  - `BulkEditDialog.jsx` - Uses TagSelector with showManageButton

**Benefits**:
- **Visual Consistency**: Same design pattern everywhere
- **Focused Components**: Two clear purposes (select vs manage)
- **Less Code**: Eliminated ~800 lines of duplicate code
- **Better UX**: One pattern to learn, predictable behavior
- **Easier Maintenance**: Changes in one place affect all uses

**Deleted Components**:
- `TagMenuSelector.jsx` (286 lines)
- `TagFilter.jsx` (182 lines)
- `UnifiedTagSelector.jsx` (replaced with simpler TagSelector)

## 2026-01-24

### Goals and Reflections System - Phase 1 Implementation

- **ReflectionEntry Component**: Created `components/ReflectionEntry.jsx` to replace text input for reflection-type tasks
  - Renders each question from `reflectionData.questions` with its own input field
  - For questions with `linkedGoalType`, shows relevant goals (yearly or monthly) with progress tracking
  - Each goal displays: title, current status badge, status selector (todo → in_progress → complete), and progress note input
  - Auto-saves with debounce (500ms) using `useDebouncedSave` hook, similar to JournalDayEntry pattern
  - Preserves question text with answers in completion record (stored as JSON in `TaskCompletion.note`)
  - Completion structure: `{ version: 1, completedAt: ISO string, responses: [{ questionId, questionText, answer, goalProgress? }] }`
  - Goal progress entries include: `goalId`, `goalTitle` (preserved), `status`, `progressNote`

- **TaskItem Integration**: Updated `components/TaskItem.jsx` to render ReflectionEntry for reflection-type tasks
  - ReflectionEntry appears in Today view and Backlog (same locations as text input tasks)
  - Uses `onCompleteWithNote` handler for saving (same as text tasks)

- **Journal Tab Integration**: Updated `components/tabs/JournalTab.jsx` and `components/JournalDayEntry.jsx`
  - JournalTab now filters for both `completionType === "text"` and `completionType === "reflection"`
  - JournalDayEntry detects reflection tasks and renders ReflectionEntry component instead of text field
  - ReflectionEntry uses compact mode in journal view

- **Goal Filtering Logic**: ReflectionEntry automatically filters goals based on:
  - `linkedGoalType === "yearly"`: Shows yearly goals for the current year (no parentId, no goalMonths)
  - `linkedGoalType === "monthly"`: Shows monthly goals for current month (goalMonths includes current month) or sub-goals

- **Question ID Generation**: Questions without IDs get auto-generated IDs using `q-${order}` pattern
  - Ensures backward compatibility with templates that may not have IDs

- **State Management**: Uses React state with debounced saves, similar to JournalDayEntry pattern
  - Tracks focus state to prevent external updates during editing
  - Syncs with external completion changes when not focused
  - Handles JSON parsing errors gracefully (falls back to empty state)
  - **Bug Fix (Round 1)**: Separated save calls from state updates to prevent "Cannot update component during render" errors
    - Previously: `immediateSave` was called inside `setResponses`, causing parent state updates during render
    - Now: State updates and save calls are separated, with saves deferred using `setTimeout`
  - **Bug Fix (Round 2)**: Fixed stale closure issue causing Week 2+ reflections to not update
    - Previously: `setTimeout` callbacks used stale `responses` from closure, causing UI updates to be lost
    - Now: Capture updated state in a variable during `setResponses`, then use that captured value in `setTimeout`
    - Pattern: `let updated; setResponses(prev => { updated = ...; return updated; }); setTimeout(() => save(updated), 0)`
  - **Bug Fix (Round 3)**: Fixed race condition where `useEffect` was resetting state after save completed
    - Previously: Save completes → `existingCompletion` updates → `useEffect` resets state to saved value → new input gets lost
    - Root cause: `focusedRef.current` was `false` when save completed, so `useEffect` thought it was an external change
    - Now: Added `isSavingRef` flag to track when we're saving, prevent `useEffect` from resetting during save
    - Pattern: Set `isSavingRef.current = true` before save, keep it true for 100ms after save completes
  - **Bug Fix (Round 4)**: Fixed React initialization order causing empty `responses` state
    - Previously: `useState` initializer relied on `questions` from `useMemo`, but `useMemo` runs AFTER `useState`
    - Result: `responses` initialized as empty array `[]`, so `.map()` couldn't find any questions to update
    - Root cause: React hooks run in order - `useState` before `useMemo`
    - Now: Extracted `getQuestions` helper function, call it inline during `useState` initialization
    - Pattern: Don't rely on other hooks' values in `useState` initializer - compute inline or use helper functions
  - **Bug Fix (Round 5)**: Fixed empty array check in initialization
    - Previously: `existingData?.responses && Array.isArray(existingData.responses)` returned true for empty arrays `[]`
    - Result: Week 2 (which had been saved with empty responses) initialized with `[]` instead of question templates
    - Now: Added length check: `existingData.responses.length > 0` before using existing data
    - Also added same check to `useEffect` sync logic to prevent resetting to empty arrays

### Goals and Reflections System - Phase 3 Implementation (Final Polish)

- **GoalProgressCard Component**: Created `components/GoalProgressCard.jsx` for visual goal progress display
  - Shows goal title with status badge (todo, in_progress, complete)
  - Displays progress bar for goals with sub-goals (percentage completion)
  - Lists recent progress updates from reflections (last 3 updates with dates and notes)
  - Shows goal months as chips for monthly goals
  - Supports compact mode for inline display
  - Color-coded status indicators (success green, info blue, default gray)
  - Visual left border on progress updates matching status color

- **GoalsTab Enhancement**: Updated `components/tabs/GoalsTab.jsx` with interactive features
  - Replaced basic goal cards with `GoalProgressCard` component
  - Added ellipsis (⋮) button to each goal card for context menu access
  - Integrated `TaskContextMenu` for goal editing, status changes, duplication, and deletion
  - Context menu supports all standard task operations (edit, duplicate, delete, tags, priority)
  - Status changes work directly from Goals tab (todo → in_progress → complete)
  - Positioned ellipsis button in top-right corner of each goal card
  - Maintains year filtering and yearly/monthly goal organization

### Goals and Reflections System - Phase 4 Implementation (Final UX Polish)

- **GoalsTab Redesign**: Completely redesigned `components/tabs/GoalsTab.jsx` to use TaskItem component
  - Replaced `GoalProgressCard` with standard `TaskItem` component for consistency
  - Goals now look identical to regular tasks with same UI/UX
  - Monthly goals automatically display as subtasks under yearly goals
  - Set `showSubtasks={true}` and `defaultExpanded={true}` for automatic expansion
  - Only shows yearly goals at top level; monthly goals nested underneath
  - Simplified code by reusing existing TaskItem component
  - **Drag-and-Drop Reordering**: Added full drag-and-drop support for goal ordering
    - Wrapped goals in `DragDropContext` and `Droppable` from `@hello-pangea/dnd`
    - Goals can be dragged to reorder within the year
    - Order persists via `order` field on Task
    - Optimistic updates for smooth UX
  - **Year Headings and Badges**: Enhanced visual organization
    - Added prominent year heading with primary color border
    - Goal year badges show on each goal (blue "Goal 2026")
    - Monthly goal badges show target months (e.g., "Jan, Feb, Mar")
    - Badges already existed in TaskItem, now visible in Goals tab
    - **Fixed subtask badge display**: Updated TaskItem to show badges for subtasks too
      - Changed condition from `(isBacklog || isToday)` to `(isBacklog || isToday || isSubtask)`
      - Monthly goals (subtasks) now show all their badges including year and months
      - Ensures consistent information display across parent and child goals

### Subtask Tag Inheritance (Visual Display)

- **Display Parent Tags on Subtasks**: Updated `components/TaskItem.jsx`
  - Subtasks without tags automatically display their parent's tags
  - Uses `useMemo` to compute `displayTags` based on parent lookup
  - If subtask has `parentId` and no tags, fetches parent from `allTasks` and uses parent's tags
  - Makes subtasks visually consistent with parent (same color coding)
  - Frontend-only change - doesn't modify database, just display
  - Universal change affecting all subtasks across the application

- **TaskDialog Parent Goal Requirement**: Enhanced `components/TaskDialog.jsx` for monthly goals
  - Added `parentId` state to track parent goal selection
  - Monthly goals (goals with `goalMonths` selected) now require a parent yearly goal
  - Parent goal selector appears automatically when months are selected
  - Dropdown shows only yearly goals from the same year (no months, no parentId)
  - Validation prevents saving monthly goal without parent (console error)
  - Clearing months automatically clears parent selection
  - Parent goal selector is marked as required with error state
  - Added `parentId` to save data and dependency array

**Remaining Work for Full Reflection System**:
- ✅ Phase 2: ReflectionBuilder component for creating/editing reflection templates (integrated into TaskDialog)
- ✅ Bug Fix: ReflectionData persistence in PUT handler (was missing from task update API)
- Phase 3: Goal progress API integration (update goals when progress is tracked in reflections)
- Phase 4: Advanced goal features (GoalYearView, GoalCard components)
- Phase 5: Question versioning system (preserve old questions when templates change)

### Goals and Reflections System - Phase 2 Implementation

- **Reflection Builder in TaskDialog**: Integrated reflection question editor directly into TaskDialog (not a separate modal)
  - Template selector dropdown: Custom, Weekly, Monthly, Yearly
  - When template is selected, loads pre-defined questions from `REFLECTION_TEMPLATES` constant
  - Questions are automatically assigned unique IDs using timestamp + random string pattern
  - Questions maintain order field for proper sequencing

- **Question Management Features**:
  - **Add Question**: Button to add new empty question at the end
  - **Remove Question**: Delete button on each question card
  - **Edit Question**: Text field for question text (multiline support)
  - **Link to Goals**: Dropdown to link question to yearly or monthly goals (optional)
  - **Drag and Drop Reordering**: Uses `@hello-pangea/dnd` for intuitive question reordering
  - **Question Count**: Shows total number of questions in header

- **State Management**:
  - Questions stored in `reflectionData.questions` array
  - Each question has: `id`, `question` (text), `order`, `linkedGoalType` (null | "yearly" | "monthly")
  - Template selection resets to "custom" when questions are manually edited/reordered
  - Questions are sorted by order before saving to ensure consistency

- **UI/UX Details**:
  - Scrollable question list (max-height: 400px) for long templates
  - Drag handle icon for visual feedback
  - Empty state message when no questions exist
  - Questions displayed in cards with clear visual separation
  - Compact layout optimized for dialog space

- **Data Persistence**:
  - Reflection data saved as part of task creation/update
  - Questions automatically renumbered (order field) on save to ensure sequential ordering
  - Question IDs preserved across edits (generated once, never changed)
  - **Bug Fix**: Added `reflectionData`, `goalData`, `goalYear`, and `goalMonths` to PUT handler in `app/api/tasks/route.js` - these fields were missing from task updates, causing reflection questions to not persist when editing existing tasks

## 2026-01-23

### Countdown Timer Background Handling

- **Problem**: iOS Safari pauses JavaScript execution when users switch apps or lock their phone, causing workout timers to stop.
- **Solution**: Implemented a multi-layered approach to provide the best possible timer experience within web app limitations:
  1. **Wake Lock API**: Keeps screen awake while timer runs (user can toggle on/off via sun icon)
  2. **End Time Calculation**: Stores completion timestamp to detect if timer finished while in background
  3. **Page Visibility Detection**: Monitors app switching/screen lock and syncs timer state when returning
  4. **User Warnings**: Shows dismissible alert when timer is running and user switches apps
- **Technical Details**:
  - Added `wakeLockRef`, `endTimeRef`, and `wasRunningRef` to track state across visibility changes
  - Implemented `requestWakeLock()` and `releaseWakeLock()` with proper cleanup
  - Added `calculateElapsedFromEndTime()` to sync timer when page becomes visible
  - Wake Lock toggle button (sun icon) allows users to control screen-awake behavior
- **User Experience**:
  - Timer continues reliably when app is in foreground with wake lock enabled
  - Detects completion if timer finished while away and plays sound on return
  - Clear warning message about iOS background limitations
  - Battery-conscious users can disable wake lock
- **Documentation**: See `docs/COUNTDOWN_TIMER_BACKGROUND_HANDLING.md` for full technical details and testing scenarios

## 2026-01-22

### Workout progress tab

- Added a dedicated Workout tab between Notes and History with a selector for workout tasks and view toggles.
- Built a new workout history API endpoint that aggregates set completions by date and includes the full program structure.
- Added RTK Query support and UI state for selected workout, view mode, and date range filters.
- Implemented a calendar-style progress grid for per-day completion percentages and click-through to the workout modal.
- Implemented an exercise progress table that rolls up weekly completions and shows outcomes vs goals.

### Task priority system

- Added a nullable `priority` field on tasks (text) with a dedicated migration for safe schema updates.
- Introduced priority constants and helpers to centralize display labels, colors, icons, and sort order.
- Added priority selection in `TaskContextMenu` with a simple radio-style submenu to keep edits lightweight.
- Displayed priority chips in task lists and added priority filters for Backlog and Kanban, combining with tag/search filters.
- Added optional backlog sorting by priority with a user toggle while preserving the existing order as a secondary sort.

### Pagination and completion loading fixes

- Added a completions date-range query and used it in `HistoryTab` to fetch only the visible range.
- Switched `useCompletionHelpers` to a recent 90-day window to avoid default pagination limits while keeping the cache lightweight.
- Added task pagination support in the tasks API while preserving the existing array response for backward compatibility.
- Updated SSE cache handling to apply updates across tagged queries and keep pagination metadata consistent.

### Tasks tab main content toggle

- Consolidated Today and Calendar into a single `mainContentView` state with a mutually exclusive toggle group.
- Removed Today/Calendar split-panel layout and the associated `todayViewWidth` resize logic.
- Kept Backlog as an independent toggle and preserved mobile view switching via `mobileActiveView`.
- Added preference migration logic to derive `mainContentView` from older `showDashboard`/`showCalendar` values.

### URL state synchronization

- Added `lib/urlStateConfig.js` to define clean, tab-aware URL param mappings and default handling.
- Introduced `useUrlState` to hydrate Redux UI state from URL params and sync state back to the URL with `replaceState`.
- Wrapped the app in `UrlStateProvider` (inside Redux) to ensure URL sync runs client-side with `Suspense`.
- Moved Notes and History tab selection/search state into `uiSlice` so deep links restore those views accurately.

### Journal tab multi-view support

- Extracted the existing day view into `JournalDayView` for reuse across date modes.
- Added week, month, and year views with shared recurrence/completion logic and per-year sections.
- **Week view**: Shows all Fridays in a year (aligned with weekly reflection schedule) with all journal entries that fall on each Friday.
- **Month view**: Shows the 1st of each month (12 cards per year) with all journal entries that fall on those dates.
- **Year view**: Shows only January 1st for each year with all journal entries that fall on that date (simplified to focus on yearly reflections).
- **Year filtering**: Only displays previous years if they contain journal entries; current year always shown even if empty.
- Week/month views now render only days that have matching non-daily journal entries.

## 2026-01-19

### Notes Tab completion

- Added a responsive Notes tab layout with mobile tabs for Folders, Notes, and Editor to match the Tasks tab behavior.
- Implemented desktop toggle buttons to show/hide the folders and notes list panels, using the existing UI slice state.
- Added folder and smart folder creation dialogs and wired them to the existing RTK Query APIs.
- Implemented smart folder filtering using `filters.tags` and `filters.operator` to match the database schema.
- Improved Note editor tag management with an autocomplete UI and a batch tag update mutation.
- Synced notes panel open/close state and widths with user preferences, aligning with existing preference sync patterns.
- Replaced notes list "New Note" buttons with a QuickTaskInput field that always shows and creates notes in the current context.

### Assumptions

- Smart folder filters are stored as `{ tags: string[], operator: "any" | "all" | "none" }`, based on the schema defaults.
- Creating tags for notes can use the default color `#6b7280` when no color is specified.

### Follow-ups

- If category selection for tasks is still required, clarify the desired data model and UI entry points before implementation.

## 2026-01-20

### Workout program save behavior

- Updated workout program save logic to upsert sections, days, and exercises instead of deleting all sections on each save.
- Preserved exercise IDs during updates so `WorkoutSetCompletion` records remain intact for current and past workouts.
- Added targeted cleanup to remove only sections/days/exercises that were explicitly removed in the builder.

### Lint warning cleanup

- Removed unused dependencies from calendar drag handlers to satisfy hook linting.
- Replaced debug log with a warning to comply with console lint rules.
- Refactored dump/restore helper logic to reduce nesting depth.

### History workout cell modal

- Changed workout cells in `HistoryTab` to open the same completion editor modal used for other task types.
- Added an optional "Open Workout" button to the completion editor for workout tasks, which opens the workout modal for the clicked date.
- Routed workout modal opening through `useDialogState` and set the view date so the workout modal loads the correct day’s completion data.

### Time-based section drag behavior

- **Implementation**: Uses `@hello-pangea/dnd` exclusively for section-to-section drags in `TasksTab.jsx`. The `handleDragEnd` function handles all drag operations including backlog ↔ section and section ↔ section moves.

- **Key insight**: Time-ranged sections filter tasks by their `time` field, not by `sectionId`. This means the `time` must be updated FIRST for the task to appear in the correct section.

- Dropping tasks into time-ranged sections **always** interpolates the time based on drop position:
  - Dropping at the beginning: uses section `startTime`
  - Dropping at the end: uses last task's time + 1 minute (capped at section `endTime`)
  - Dropping between tasks: interpolates midpoint between neighboring task times
- This applies whether moving from backlog, another section, or reordering within the same section.
- Non-time-ranged sections keep existing time values on drop.

- **Update order matters**: When dragging between time-ranged sections, we must:
  1. Update `time` first (via `updateTaskMutation`) - this makes the task appear in the correct section
  2. Then update `sectionId` and `order` (via `batchReorderTasksMutation`) - this is a fallback for non-time-ranged sections

- **Sorting**: Tasks within sections are sorted by `time` first (ascending), then by `order` as a fallback. Tasks without time appear at the end.

### Subtask outcome isolation

- Routed subtask outcome changes through a dedicated handler in `useCompletionHandlers` to prevent parent cascade logic from running.
- Aligned TaskItem outcome-menu logic with `OutcomeCheckbox` so menu-driven outcome changes never fall back to parent toggle paths.
- Added a guard in `handleToggleTask` to block accidental subtask IDs and updated menu item handlers to fully stop event propagation.

### Parent completion batching

- Switched parent-driven outcome cascades to use batch completion create/delete APIs for subtasks to avoid per-subtask network calls.

### Offline completion deletes

- Fixed IndexedDB cache deletes for completions to use the `taskId_date` index instead of passing invalid keys to the store delete call.
