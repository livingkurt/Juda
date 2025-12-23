# Notes System Implementation

## Overview

This document describes the implementation of the comprehensive Notes System feature for the Juda task manager. The system extends the existing Task model to support rich text notes with folder organization and smart folder filtering.

## Implementation Date

December 23, 2025

## Core Concept

**All tasks can also be notes** - A task with `completionType: "note"` lives in the Notes view instead of Backlog/Today/Calendar. This maintains a single source of truth and allows seamless conversion between notes and actionable tasks.

---

## Database Schema Changes

### Modified Tables

#### Task Table - New Fields

- `completionType` - Extended to include "note" value (was "checkbox" | "text", now "checkbox" | "text" | "note")
- `content` - TEXT field for rich text content (stored as HTML from TipTap editor)
- `folderId` - Foreign key to NoteFolder (nullable, ON DELETE SET NULL)

### New Tables

#### NoteFolder

Organizes notes into a hierarchical folder structure.

```sql
CREATE TABLE "NoteFolder" (
  "id" text PRIMARY KEY,
  "userId" text NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "icon" text DEFAULT 'folder',
  "color" text DEFAULT '#6b7280',
  "order" integer DEFAULT 0 NOT NULL,
  "parentId" text REFERENCES "NoteFolder"("id") ON DELETE CASCADE,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);
```

**Features:**

- Supports nested folders via `parentId`
- User-scoped with cascade delete
- Custom icons and colors
- Manual ordering

#### SmartFolder

Dynamic folders that filter notes based on tag criteria.

```sql
CREATE TABLE "SmartFolder" (
  "id" text PRIMARY KEY,
  "userId" text NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "icon" text DEFAULT 'zap',
  "color" text DEFAULT '#8b5cf6',
  "order" integer DEFAULT 0 NOT NULL,
  "filters" jsonb DEFAULT '{"tags":[],"operator":"any"}'::jsonb NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);
```

**Filter Structure:**

```javascript
{
  tags: ["work", "urgent"],
  operator: "any" | "all" | "none"
}
```

- `any` - Note has at least one of the specified tags
- `all` - Note has all of the specified tags
- `none` - Note has none of the specified tags

### Migration

Migration file: `drizzle/0011_add_notes_system.sql`

Applied successfully on December 23, 2025.

---

## API Routes

### `/api/folders`

**GET** - Fetch all folders for authenticated user

- Returns: Array of folder objects sorted by order
- Auth: Required

**POST** - Create a new folder

- Body: `{ name, icon?, color?, parentId?, order? }`
- Returns: Created folder object
- Auth: Required

**PUT** - Update a folder

- Body: `{ id, ...updateData }`
- Returns: Updated folder object
- Auth: Required

**DELETE** - Delete a folder

- Query: `?id=folderId`
- Effect: Notes in folder have `folderId` set to null
- Returns: `{ success: true }`
- Auth: Required

### `/api/smart-folders`

**GET** - Fetch all smart folders for authenticated user

- Returns: Array of smart folder objects sorted by order
- Auth: Required

**POST** - Create a new smart folder

- Body: `{ name, icon?, color?, filters, order? }`
- Returns: Created smart folder object
- Auth: Required

**PUT** - Update a smart folder

- Body: `{ id, ...updateData }`
- Returns: Updated smart folder object
- Auth: Required

**DELETE** - Delete a smart folder

- Query: `?id=smartFolderId`
- Returns: `{ success: true }`
- Auth: Required

### `/api/tasks` (Updated)

**POST** - Now accepts:

- `completionType` - "checkbox" | "text" | "note"
- `content` - Rich text HTML content
- `folderId` - Optional folder assignment

**PUT** - Now accepts:

- `completionType` - Can convert between types
- `content` - Update note content
- `folderId` - Move note to different folder

---

## Custom Hooks

### `useFolders()`

Manages folder state and CRUD operations.

```javascript
const {
  folders, // Array of folder objects
  loading, // Boolean loading state
  error, // Error message or null
  fetchFolders, // Refresh folders from API
  createFolder, // (folderData) => Promise<folder>
  updateFolder, // (id, folderData) => Promise<folder>
  deleteFolder, // (id) => Promise<void>
} = useFolders();
```

### `useSmartFolders()`

Manages smart folder state and filtering logic.

```javascript
const {
  smartFolders, // Array of smart folder objects
  loading, // Boolean loading state
  error, // Error message or null
  fetchSmartFolders, // Refresh smart folders from API
  createSmartFolder, // (folderData) => Promise<smartFolder>
  updateSmartFolder, // (id, folderData) => Promise<smartFolder>
  deleteSmartFolder, // (id) => Promise<void>
  filterNotesBySmartFolder, // (notes, smartFolder) => filteredNotes
} = useSmartFolders();
```

**Filter Logic:**
The `filterNotesBySmartFolder` function implements tag-based filtering:

- Extracts tag names from note objects (handles both string and object formats)
- Applies operator logic (any/all/none)
- Returns filtered array of notes

---

## Components

### `RichTextEditor`

TipTap-based rich text editor with toolbar.

**Props:**

- `content` - HTML string
- `onChange` - (html: string) => void
- `placeholder` - Placeholder text
- `editable` - Boolean (default: true)
- `minHeight` - CSS height value

**Features:**

- Bold, italic, strikethrough, highlight
- Headings (H1, H2, H3)
- Bullet lists, numbered lists, task lists
- Blockquotes, code blocks
- Links (with prompt dialog)
- Text alignment (left, center, right)
- Undo/redo
- Auto-saves via onChange callback

**Extensions Used:**

- StarterKit (base functionality)
- Placeholder
- TaskList & TaskItem
- Link
- Highlight
- TextAlign

### `NotesView`

Main notes interface with three-column layout.

**Props:**

- `notes` - Array of note tasks
- `onCreateNote` - () => void
- `onEditNote` - (task) => void
- `onDeleteNote` - (taskId) => void
- `onUpdateNote` - (taskId, updates) => Promise<void>

**Layout:**

1. **Left Sidebar (250px)** - Folder navigation
   - "All Notes" view
   - Smart Folders section
   - Regular Folders section (with hierarchy)
   - New folder/smart folder buttons

2. **Middle Panel (300px)** - Note list
   - Search input
   - Filtered note cards showing:
     - Title
     - Content preview (HTML stripped)
     - Tags (first 3 + count)
     - Last updated date

3. **Right Panel (flex)** - Note editor
   - Shows `NoteEditor` when note selected
   - Empty state with "New Note" button when nothing selected

**Features:**

- Search notes by title, content, or tags
- Filter by folder or smart folder
- Expandable folder tree
- Badge counts on folders
- Click to select note
- Responsive to folder/smart folder changes

### `NoteEditor`

Note editing interface with metadata controls.

**Props:**

- `note` - Note task object
- `folders` - Array of available folders
- `allTags` - Array of all tag names
- `onUpdate` - (noteId, updates) => void
- `onDelete` - (noteId) => void
- `onConvertToTask` - (note) => void

**Layout:**

- **Header** - Title input + menu (convert/delete)
- **Metadata Bar** - Folder select + tag management
- **Editor** - RichTextEditor component
- **Footer** - Last updated timestamp

**Features:**

- Auto-save with 500ms debounce
- Title editing (inline input)
- Folder assignment (dropdown)
- Tag management (add/remove with visual chips)
- Convert to checkbox task
- Convert to text input task
- Delete note
- Real-time content updates

---

## Main App Integration

### Tab Structure

Updated from 2 tabs to 3 tabs:

- **Tab 0** - Tasks (existing)
- **Tab 1** - Notes (NEW)
- **Tab 2** - History (was Tab 1)

### Task Filtering

Notes are excluded from:

- Backlog drawer
- Today view sections
- Calendar views (day/week/month)

**Implementation:**

```javascript
// Filter notes from tasks
const noteTasks = useMemo(() => {
  return tasks.filter(task => task.completionType === "note");
}, [tasks]);

// Exclude notes from backlog
const backlogTasks = useMemo(() => {
  return tasks.filter(task => {
    // ... existing filters
    if (task.completionType === "note") return false;
    return true;
  });
}, [tasks]);

// Exclude notes from today's tasks
const todaysTasks = useMemo(() => {
  return tasks.filter(task => {
    if (task.completionType === "note") return false;
    return shouldShowOnDate(task, viewDate);
  });
}, [tasks, viewDate]);
```

### Notes Tab Content

```javascript
{
  mainTabIndex === 1 && (
    <Box h="100%">
      <NotesView
        notes={noteTasks}
        onCreateNote={() => {
          createTask({
            title: "Untitled Note",
            sectionId: sections[0]?.id,
            completionType: "note",
            content: "",
          });
        }}
        onEditNote={task => {
          setEditingTask(task);
          openTaskDialog();
        }}
        onDeleteNote={taskId => {
          deleteTask(taskId);
        }}
        onUpdateNote={async (taskId, updates) => {
          await updateTask(taskId, updates);
        }}
      />
    </Box>
  );
}
```

### TaskDialog Updates

Added "Note" option to completion type dropdown:

```javascript
const completionTypeCollection = useMemo(
  () =>
    createListCollection({
      items: [
        { label: "Checkbox", value: "checkbox" },
        { label: "Text Input", value: "text" },
        { label: "Note", value: "note" },
      ],
    }),
  []
);
```

Added helper text when "note" is selected:

> "Notes appear in the Notes tab, not in Backlog/Today/Calendar"

---

## NPM Packages Added

```json
{
  "@tiptap/react": "^2.x",
  "@tiptap/starter-kit": "^2.x",
  "@tiptap/extension-placeholder": "^2.x",
  "@tiptap/extension-task-list": "^2.x",
  "@tiptap/extension-task-item": "^2.x",
  "@tiptap/extension-link": "^2.x",
  "@tiptap/extension-highlight": "^2.x",
  "@tiptap/extension-text-align": "^2.x"
}
```

Total: 69 new packages (including dependencies)

---

## User Workflows

### Creating a Note

1. Click "Notes" tab in main navigation
2. Click "+" button in sidebar or "New Note" button in empty state
3. Note is created with title "Untitled Note"
4. Edit title, add content, assign folder, add tags
5. Changes auto-save after 500ms

### Organizing Notes

**Manual Folders:**

1. Click folder icon with "+" in sidebar
2. Enter folder name
3. Drag notes or use folder dropdown in editor
4. Create nested folders by setting parentId (future enhancement)

**Smart Folders:**

1. Click "New Smart Folder" button
2. Enter name and comma-separated tags
3. Smart folder automatically shows notes matching criteria
4. Change operator (any/all/none) by editing smart folder

### Converting Between Types

**Note → Task:**

1. Open note in editor
2. Click menu (⋮) in header
3. Select "Convert to Task" (checkbox) or "Convert to Text Input Task"
4. Note moves to Backlog/Today view based on scheduling

**Task → Note:**

1. Open task in TaskDialog
2. Change "Completion Type" to "Note"
3. Task moves to Notes tab
4. Add rich text content in Notes view

### Searching Notes

1. Use search box in Notes view middle panel
2. Search matches:
   - Note titles
   - Note content (HTML stripped)
   - Tag names
3. Results update in real-time
4. Search works across all folders

---

## Technical Details

### Content Storage

- Rich text stored as HTML in `Task.content` field
- TipTap outputs semantic HTML
- Content is sanitized by TipTap extensions
- No additional sanitization needed on backend

### Auto-Save Mechanism

```javascript
useEffect(() => {
  const timeout = setTimeout(() => {
    if (/* content changed */) {
      onUpdate(note.id, { title, content, folderId });
    }
  }, 500);
  return () => clearTimeout(timeout);
}, [title, content, folderId]);
```

- Debounced to prevent excessive API calls
- Compares current state to note props
- Only saves if changes detected
- Cleanup on unmount prevents stale saves

### Tag Handling

Tags are stored in the existing `TaskTag` junction table:

- Notes use same tag system as tasks
- Tags appear in both Notes and Tasks views
- Tag filtering works across both views
- Smart folders use tag names for filtering

### Folder Hierarchy

Folders support nesting via `parentId`:

- Root folders have `parentId = null`
- Child folders reference parent via `parentId`
- Cascade delete: deleting parent deletes children
- Notes in deleted folders have `folderId` set to null

---

## Performance Considerations

### Optimizations

1. **Memoized Filtering** - `useMemo` for expensive filters
2. **Debounced Auto-Save** - 500ms delay prevents API spam
3. **Lazy Loading** - TipTap editor only loads when needed
4. **Indexed Queries** - Database indexes on userId for fast lookups

### Potential Bottlenecks

1. **Large HTML Content** - Consider pagination for very long notes
2. **Many Folders** - Tree rendering could slow with 100+ folders
3. **Search Performance** - Full-text search on HTML content is not optimized

### Future Improvements

1. Implement virtual scrolling for note list
2. Add full-text search index on content field
3. Lazy load folder tree (only expand when clicked)
4. Add note preview caching

---

## Testing Checklist

### Database & API

- [x] Migration runs successfully
- [x] Can create/read/update/delete folders
- [x] Can create/read/update/delete smart folders
- [x] Task API accepts completionType, content, folderId fields
- [x] Cascade deletes work correctly

### Notes View

- [x] Notes tab appears between Tasks and History
- [x] Notes tab shows count badge
- [x] Can create new note
- [x] Notes list shows in sidebar
- [x] Can select and view note content
- [x] Rich text editor renders and saves
- [x] Can add/remove tags
- [x] Can assign note to folder
- [x] Search filters notes correctly

### Folders

- [x] Can create folders
- [x] Folder list shows in sidebar
- [x] Selecting folder filters notes
- [x] Can nest folders (schema supports it, UI basic)
- [x] Can delete folder (notes become unfiled)

### Smart Folders

- [x] Can create smart folder with tag filters
- [x] Smart folder shows matching note count
- [x] Selecting smart folder filters notes by tags
- [x] Tag filter operators work (any, all, none)

### Conversion

- [x] Can convert note to checkbox task (moves to backlog/today)
- [x] Can convert note to text input task
- [x] Converting task to note moves it to Notes view
- [x] Notes don't appear in Backlog, Today, or Calendar

### Rich Text Editor

- [x] Bold, italic, strikethrough work
- [x] Headings work (H1, H2, H3)
- [x] Bullet and numbered lists work
- [x] Task lists (checkboxes) work
- [x] Blockquotes work
- [x] Code blocks work
- [x] Links can be added
- [x] Text alignment works
- [x] Undo/redo work
- [x] Content saves automatically (debounced)

---

## Known Limitations

1. **No Mobile Optimization** - Notes view uses desktop three-column layout
2. **Basic Folder UI** - No drag-and-drop folder reordering yet
3. **No Note Sharing** - Notes are private to user
4. **No Version History** - Can't see previous versions of notes
5. **No Attachments** - Can't upload images or files to notes
6. **No Export** - Can't export notes to PDF/Markdown
7. **Limited Smart Folder Criteria** - Only tag-based filtering

---

## Future Enhancements

### Short Term

1. Mobile-responsive Notes view (similar to mobile task tabs)
2. Drag-and-drop folder reordering
3. Keyboard shortcuts in editor (Cmd+B for bold, etc.)
4. Note templates
5. Duplicate note function

### Medium Term

1. Image upload support (via TipTap Image extension)
2. Note linking (link to other notes or tasks)
3. Export to Markdown/PDF
4. Version history (track content changes)
5. Collaborative editing (real-time with WebSockets)

### Long Term

1. Note sharing with other users
2. Public note links (read-only)
3. Advanced smart folder criteria (date ranges, content search)
4. AI-powered note suggestions
5. Voice-to-text note creation

---

## Files Modified/Created

### Database

- `lib/schema.js` - Added noteFolders, smartFolders tables; updated tasks table
- `drizzle/0011_add_notes_system.sql` - Migration file

### API Routes

- `app/api/folders/route.js` - NEW
- `app/api/smart-folders/route.js` - NEW
- `app/api/tasks/route.js` - MODIFIED (added content, folderId, completionType validation)

### Hooks

- `hooks/useFolders.js` - NEW
- `hooks/useSmartFolders.js` - NEW

### Components

- `components/RichTextEditor.jsx` - NEW
- `components/NotesView.jsx` - NEW
- `components/NoteEditor.jsx` - NEW
- `components/TaskDialog.jsx` - MODIFIED (added "note" option)

### Main App

- `app/page.jsx` - MODIFIED (added Notes tab, filtered notes from tasks views)

### Documentation

- `docs/NOTES_SYSTEM_IMPLEMENTATION.md` - NEW (this file)

---

## Conclusion

The Notes System successfully extends the Juda task manager with a full-featured note-taking capability while maintaining the existing task management functionality. The implementation follows the KISS principle (Keep It Simple, Stupid) by:

1. Reusing the existing Task model (no separate Note table)
2. Leveraging existing tag system
3. Using proven libraries (TipTap for rich text)
4. Following established patterns (custom hooks, API routes)
5. Maintaining backward compatibility (existing tasks unaffected)

The system is production-ready and provides a solid foundation for future enhancements.
