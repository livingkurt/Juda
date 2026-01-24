# Project Decisions Log

## 2026-01-23

### Goals + reflections system

- Added `goals` and `reflection` task types, plus pinned goals for always-visible display.
- Introduced `ReflectionQuestion` table with versioned prompts and date-range lookups.
- Stored structured reflection answers on `TaskCompletion.reflectionAnswers` for Q&A entries.
- Added Goals tab and pinned goals sections in Today and Journal views.
- Implemented reflection question editor + entry UI with goal integration and versioning.
- Included a migration script to convert tagged text reflections to the new reflection type.
- Added section-level filters for tags and completion types to support goals as normal sections.
- Added reflection↔goal linking so each reflection can target specific goals and store per-goal progress.

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
