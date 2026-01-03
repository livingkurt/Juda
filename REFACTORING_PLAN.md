# Additional Refactoring Opportunities for `page.jsx`

## Priority 1: High Impact, Low Risk

### 1. `useSectionOperations` Hook (~60 lines)

**Current Location:** Lines 760-818
**Extract:**

- `handleEditSection`
- `handleAddSection`
- `handleSaveSection`
- `handleDeleteSection`
- `handleToggleSectionExpand`

**Benefits:**

- Clear separation of section CRUD logic
- Reusable across components
- Easier to test

### 2. `useDialogState` Hook (~25 lines)

**Current Location:** Lines 315-336
**Extract:**

- All dialog state management
- `taskDialogOpen`, `sectionDialogOpen`, `tagEditorOpen`
- `workoutModalOpen`, `workoutModalTask`
- `editingTask`, `editingSection`
- `defaultSectionId`, `defaultTime`, `defaultDate`
- `editingWorkoutTask`

**Benefits:**

- Consolidates scattered dialog state
- Provides consistent dialog management API
- Reduces state clutter in main component

### 3. `useTaskFilters` Hook (~150 lines)

**Current Location:** Lines 463-610
**Extract:**

- `todaysTasks` useMemo
- `filteredTodaysTasks` useMemo
- `tasksBySection` useMemo
- `backlogTasks` useMemo
- `noteTasks` useMemo

**Benefits:**

- Centralizes all task filtering logic
- Makes filtering rules easier to understand
- Can be reused in other views

### 4. `useMobileDetection` Hook (~10 lines)

**Current Location:** Lines 286-295
**Extract:**

- `isMobile` state
- Resize listener logic

**Benefits:**

- Reusable across components
- Cleaner main component

## Priority 2: High Impact, Medium Risk

### 5. Enhance `useDragAndDrop` Hook (~510 lines)

**Current Location:** Lines 982-1491
**Extract:**

- `handleDragOver` (lines 982-1052)
- `handleDragEndNew` (lines 1055-1491)

**Benefits:**

- Moves ~440 lines out of main component
- Centralizes all drag-and-drop logic
- Makes drag logic testable in isolation

**Note:** This is complex because `handleDragEndNew` has Kanban-specific logic. Consider:

- Option A: Move everything to `useDragAndDrop`
- Option B: Create `useKanbanDragHandlers` for Kanban-specific parts

### 6. `useStatusHandlers` Hook (~70 lines)

**Current Location:** Lines 684-754
**Extract:**

- `handleStatusChange` (complex status transition logic)

**Benefits:**

- Isolates complex status change logic
- Easier to test status transitions
- Could be part of `useTaskOperations` instead

### 7. `useAutoScroll` Hook (~75 lines)

**Current Location:** Lines 899-975
**Extract:**

- Auto-scroll useEffect logic
- `todayScrollContainerRef`
- `hasAutoScrolledRef`

**Benefits:**

- Removes complex DOM manipulation from main component
- Reusable scroll behavior
- Easier to test

## Priority 3: Medium Impact, Low Risk

### 8. `useSectionExpansion` Hook (~15 lines)

**Current Location:** Lines 342-345, 624-644, 886-897
**Extract:**

- `autoCollapsedSections` state
- `manuallyExpandedSections` state
- `checkAndAutoCollapseSectionRef` and logic
- `computedSections` useMemo

**Benefits:**

- Consolidates section expansion logic
- Clearer separation of concerns

### 9. Enhance `useViewState` Hook (~30 lines)

**Current Location:** Lines 820-881
**Extract:**

- `navigateCalendar`
- `navigateTodayView`
- `handleTodayViewToday`
- `handleTodayViewDateChange`
- `getCalendarTitle`

**Benefits:**

- Completes view state management
- All navigation in one place

### 10. Enhance `useSelectionState` Hook (~20 lines)

**Current Location:** Lines 651-671
**Extract:**

- `handleBulkEditSave`

**Benefits:**

- Completes selection state management
- All bulk operations in one place

## Estimated Impact

**Before:** ~3087 lines in `page.jsx`
**After Priority 1:** ~2800 lines (-287 lines, ~9% reduction)
**After Priority 2:** ~2300 lines (-787 lines, ~25% reduction)
**After Priority 3:** ~2000 lines (-1087 lines, ~35% reduction)

## Recommended Order

1. ✅ `useSectionOperations` - Clear, isolated logic
2. ✅ `useDialogState` - Consolidates scattered state
3. ✅ `useTaskFilters` - Large, isolated filtering logic
4. ✅ `useMobileDetection` - Simple, reusable
5. ⚠️ Enhance `useDragAndDrop` - Complex but high impact
6. ✅ `useStatusHandlers` - Complex logic isolation
7. ✅ `useAutoScroll` - Complex DOM logic isolation
8. ✅ `useSectionExpansion` - Consolidates expansion logic
9. ✅ Enhance `useViewState` - Completes view management
10. ✅ Enhance `useSelectionState` - Completes selection management
