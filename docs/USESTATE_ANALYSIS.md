# useState Analysis - Prop Drilling vs Redux

## Executive Summary

After analyzing the entire codebase, I found that **the application has already been well-architected** with Redux for shared state management. Most `useState` usage is appropriate for **local component state** that doesn't need to be shared. However, there are a few opportunities for improvement.

## Current State Management Architecture

### ✅ Already Using Redux (Excellent!)

The following state is correctly managed in Redux (`lib/store/slices/uiSlice.js`):

1. **Dialog States**: `taskDialogOpen`, `sectionDialogOpen`, `tagEditorOpen`, `workoutModalOpen`, `bulkEditDialogOpen`
2. **Editing State**: `editingTask`, `editingSection`, `workoutModalTask`, `editingWorkoutTask`
3. **View State**: `mainTabIndex`, `mobileActiveView`, `selectedDate`, `todayViewDate`, `calendarView`
4. **Search/Filter**: `todaySearchTerm`, `todaySelectedTagIds`, `calendarSearchTerm`, `calendarSelectedTagIds`
5. **Panel Visibility**: `backlogOpen`, `showDashboard`, `showCalendar`, `notesSidebarOpen`, `notesListOpen`
6. **Panel Widths**: `backlogWidth`, `todayViewWidth`, `notesSidebarWidth`, `notesListWidth`
7. **Selection**: `selectedTaskIds`, `bulkEditDialogOpen`

### ✅ Appropriate Local useState Usage

The following components use `useState` correctly for **local, non-shared state**:

#### 1. **Form State** (TaskDialog.jsx)

- `title`, `sectionId`, `time`, `date`, `duration`, `recurrenceType`, `selectedDays`, etc.
- ✅ **Correct**: Form state should be local until submitted

#### 2. **UI Interaction State**

- `isEditingTitle` in TaskItem.jsx - ✅ Local edit mode
- `menuOpen` states in various components - ✅ Local menu visibility
- `searchQuery` in TagMenuSelector.jsx - ✅ Local search input
- `inlineInputValue` in BacklogDrawer.jsx - ✅ Local input field

#### 3. **Internal Drag State** (CalendarDayView.jsx, CalendarWeekView.jsx)

- `internalDrag` - ✅ Local drag operation state
- This is separate from the global DnD context

#### 4. **Component-Specific State**

- `height` in Collapse.jsx - ✅ Animation state
- `toasts` in ToastContainer.jsx - ✅ Toast notification queue
- `completionData` in WorkoutModal.jsx - ✅ Workout completion tracking

## ⚠️ Potential Issues Found

### 1. **BacklogDrawer.jsx** - Local Search/Filter State

**Current Implementation:**

```javascript
const [searchTerm, setSearchTerm] = useState("");
const [selectedTagIds, setSelectedTagIds] = useState([]);
```

**Issue**: This state is local to BacklogDrawer but could be useful for:

- Persisting filters when navigating away and back
- Syncing with URL query params
- Showing filter state in parent components

**Recommendation**: Consider moving to Redux if you want persistence, otherwise **keep as-is** for simplicity.

### 2. **KanbanView.jsx** - Duplicate Search/Filter State

**Current Implementation:**

```javascript
const [searchTerm, setSearchTerm] = useState("");
const [selectedTagIds, setSelectedTagIds] = useState([]);
```

**Issue**: Similar to BacklogDrawer - local state that could benefit from persistence.

**Recommendation**: If Kanban filters should persist, move to Redux. Otherwise **keep as-is**.

### 3. **Section.jsx** - No Props Being Passed Down

**Current Implementation**: ✅ **Excellent!**

```javascript
// Uses hooks directly - no prop drilling
const taskOps = useTaskOperations();
const completionHandlers = useCompletionHandlers();
const taskFilters = useTaskFilters();
const sectionExpansion = useSectionExpansion();
```

This component demonstrates the **ideal pattern** - using custom hooks that access Redux directly.

### 4. **NotesView.jsx** - Mixed State Management

**Current Implementation:**

```javascript
const [searchTerm, setSearchTerm] = useState("");
const [selectedFolderId, setSelectedFolderId] = useState(null);
const [selectedSmartFolderId, setSelectedSmartFolderId] = useState(null);
const [selectedNoteId, setSelectedNoteId] = useState(null);
const [expandedFolders, setExpandedFolders] = useState(new Set());
```

**Issue**: Some of this state (like `selectedNoteId`) might benefit from being in Redux for:

- URL routing (e.g., `/notes/:noteId`)
- Deep linking
- Browser back/forward navigation

**Recommendation**: Consider moving `selectedNoteId` to Redux if you want URL integration.

### 5. **useSectionExpansion.js** - Hook with Local State

**Current Implementation:**

```javascript
const [autoCollapsedSections, setAutoCollapsedSections] = useState(new Set());
const [manuallyExpandedSections, setManuallyExpandedSections] = useState(new Set());
```

**Issue**: This state is passed down as props to child hooks:

```javascript
// In page.jsx
const sectionExpansion = useSectionExpansion({ ... });

// Then passed to other hooks
const completionHandlers = useCompletionHandlers({
  autoCollapsedSections: sectionExpansion.autoCollapsedSections,
  setAutoCollapsedSections: sectionExpansion.setAutoCollapsedSections,
  checkAndAutoCollapseSection: sectionExpansion.checkAndAutoCollapseSection,
});
```

**Recommendation**: This is a **candidate for Redux** if you want:

- Section expansion state to persist across page reloads
- Consistent expansion state across different views

### 6. **useCompletionHandlers.js** - Recently Completed Tracking

**Current Implementation:**

```javascript
const [recentlyCompletedTasks, setRecentlyCompletedTasks] = useState(new Set());
```

**Issue**: This state is passed to `useTaskFilters`:

```javascript
const taskFilters = useTaskFilters({
  recentlyCompletedTasks: completionHandlers.recentlyCompletedTasks,
});
```

**Recommendation**: Consider moving to Redux if you want this state to be:

- Accessible from multiple components without prop drilling
- Persisted across component unmounts

## Recommendations

### Priority 1: Move to Redux (High Impact)

1. **Section Expansion State** (`useSectionExpansion.js`)
   - Move `autoCollapsedSections` and `manuallyExpandedSections` to Redux
   - Benefits: Persistence, no prop drilling between hooks
   - Create new slice: `lib/store/slices/sectionExpansionSlice.js`

2. **Recently Completed Tasks** (`useCompletionHandlers.js`)
   - Move `recentlyCompletedTasks` to Redux
   - Benefits: Accessible from any component, no prop drilling
   - Add to existing `uiSlice.js`

### Priority 2: Consider Moving to Redux (Medium Impact)

3. **Backlog/Kanban Search Filters**
   - Move `searchTerm` and `selectedTagIds` to Redux
   - Benefits: Persistence across navigation
   - Add to existing `uiSlice.js` (already has `backlogSearchTerm` and `backlogSelectedTagIds`)

4. **Notes View State**
   - Move `selectedNoteId` to Redux
   - Benefits: URL routing, deep linking
   - Add to existing `uiSlice.js`

### Priority 3: Keep as Local State (Low Priority)

5. **Form State** (TaskDialog, WorkoutBuilder, etc.)
   - Keep as local `useState`
   - Reason: Form state should be local until submitted

6. **UI Interaction State** (menus, inline editing, etc.)
   - Keep as local `useState`
   - Reason: Ephemeral state that doesn't need persistence

## Implementation Plan

### Step 1: Move Section Expansion to Redux

**Create new slice:**

```javascript
// lib/store/slices/sectionExpansionSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  autoCollapsedSections: [],
  manuallyExpandedSections: [],
};

const sectionExpansionSlice = createSlice({
  name: "sectionExpansion",
  initialState,
  reducers: {
    addAutoCollapsedSection: (state, action) => {
      if (!state.autoCollapsedSections.includes(action.payload)) {
        state.autoCollapsedSections.push(action.payload);
      }
    },
    removeAutoCollapsedSection: (state, action) => {
      state.autoCollapsedSections = state.autoCollapsedSections.filter(id => id !== action.payload);
    },
    addManuallyExpandedSection: (state, action) => {
      if (!state.manuallyExpandedSections.includes(action.payload)) {
        state.manuallyExpandedSections.push(action.payload);
      }
    },
    removeManuallyExpandedSection: (state, action) => {
      state.manuallyExpandedSections = state.manuallyExpandedSections.filter(id => id !== action.payload);
    },
    clearSectionExpansion: state => {
      state.autoCollapsedSections = [];
      state.manuallyExpandedSections = [];
    },
  },
});

export const {
  addAutoCollapsedSection,
  removeAutoCollapsedSection,
  addManuallyExpandedSection,
  removeManuallyExpandedSection,
  clearSectionExpansion,
} = sectionExpansionSlice.actions;

export default sectionExpansionSlice.reducer;
```

**Update useSectionExpansion.js:**

```javascript
import { useDispatch, useSelector } from "react-redux";
import { addAutoCollapsedSection, removeAutoCollapsedSection } from "@/lib/store/slices/sectionExpansionSlice";

export function useSectionExpansion({ sections, showCompletedTasks, tasksBySection }) {
  const dispatch = useDispatch();

  // Get from Redux instead of useState
  const autoCollapsedSectionsArray = useSelector(state => state.sectionExpansion.autoCollapsedSections);
  const manuallyExpandedSectionsArray = useSelector(state => state.sectionExpansion.manuallyExpandedSections);

  // Convert to Sets for efficient lookups
  const autoCollapsedSections = useMemo(() => new Set(autoCollapsedSectionsArray), [autoCollapsedSectionsArray]);
  const manuallyExpandedSections = useMemo(
    () => new Set(manuallyExpandedSectionsArray),
    [manuallyExpandedSectionsArray]
  );

  // ... rest of the hook
}
```

### Step 2: Move Recently Completed to Redux

**Update uiSlice.js:**

```javascript
const initialState = {
  // ... existing state
  recentlyCompletedTasks: [],
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    // ... existing reducers
    addRecentlyCompletedTask: (state, action) => {
      if (!state.recentlyCompletedTasks.includes(action.payload)) {
        state.recentlyCompletedTasks.push(action.payload);
      }
    },
    removeRecentlyCompletedTask: (state, action) => {
      state.recentlyCompletedTasks = state.recentlyCompletedTasks.filter(id => id !== action.payload);
    },
    clearRecentlyCompletedTasks: state => {
      state.recentlyCompletedTasks = [];
    },
  },
});
```

**Update useCompletionHandlers.js:**

```javascript
import { useDispatch, useSelector } from "react-redux";
import { addRecentlyCompletedTask, removeRecentlyCompletedTask } from "@/lib/store/slices/uiSlice";

export function useCompletionHandlers({ ... }) {
  const dispatch = useDispatch();

  // Get from Redux instead of useState
  const recentlyCompletedTasksArray = useSelector(state => state.ui.recentlyCompletedTasks);
  const recentlyCompletedTasks = useMemo(
    () => new Set(recentlyCompletedTasksArray),
    [recentlyCompletedTasksArray]
  );

  // Update functions to use Redux
  const addToRecentlyCompleted = useCallback((taskId, sectionId) => {
    dispatch(addRecentlyCompletedTask(taskId));
    // ... timeout logic
  }, [dispatch]);

  // ... rest of the hook
}
```

### Step 3: Sync Backlog Filters with Redux

**Update BacklogDrawer.jsx:**

```javascript
import { useDispatch, useSelector } from "react-redux";
import { setBacklogSearchTerm, setBacklogSelectedTagIds } from "@/lib/store/slices/uiSlice";

export const BacklogDrawer = ({ createDraggableId }) => {
  const dispatch = useDispatch();

  // Get from Redux instead of useState
  const searchTerm = useSelector(state => state.ui.backlogSearchTerm);
  const selectedTagIds = useSelector(state => state.ui.backlogSelectedTagIds);

  const setSearchTerm = useCallback(term => dispatch(setBacklogSearchTerm(term)), [dispatch]);
  const setSelectedTagIds = useCallback(ids => dispatch(setBacklogSelectedTagIds(ids)), [dispatch]);

  // ... rest of component
};
```

## Conclusion

Your codebase is **already well-architected** with Redux for shared state. The main opportunities for improvement are:

1. **Section expansion state** - Currently passed between hooks, should be in Redux
2. **Recently completed tasks** - Currently passed between hooks, should be in Redux
3. **Backlog/Kanban filters** - Could benefit from persistence via Redux

Most other `useState` usage is appropriate for local component state and should **remain as-is**.

## Next Steps

1. Review this analysis with your team
2. Decide which state should be moved to Redux based on your requirements
3. Implement changes incrementally (start with section expansion)
4. Test thoroughly to ensure no regressions
5. Update documentation to reflect new state management patterns
