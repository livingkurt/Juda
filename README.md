# Juda - Daily Task Manager

A comprehensive daily task management system built with Next.js, Material-UI, and PostgreSQL. Features include task scheduling, calendar views, workout tracking, notes, journaling, and full offline support with PWA capabilities.

## Features

### Core Task Management

- **Multiple Views**: Tasks, Kanban, Journal, Notes, and History tabs
- **Today View**: Organize tasks by customizable sections (Morning, Afternoon, Evening)
- **Calendar Views**: Day, Week, Month, and Year views for scheduling
- **Backlog**: Store tasks without specific time assignments
- **Task Types**:
  - Checkbox tasks (simple completion)
  - Text input tasks (with response tracking)
  - Note tasks (rich text with TipTap editor)
  - Workout tasks (structured exercise programs)
- **Task Features**:
  - Subtasks and parent-child relationships
  - Recurrence patterns (daily, weekly with specific days)
  - Time and duration scheduling
  - Status tracking (todo, in_progress, complete)
  - Tag system with color coding
  - Bulk operations (edit, delete, tag management)
  - Drag and drop reordering

### Advanced Features

- **User Authentication**: JWT-based auth with refresh tokens
- **Workout Builder**: Create multi-week workout programs with:
  - Exercise tracking (reps, time, distance)
  - Weekly progression tracking
  - Set-by-set completion tracking
  - Deload and test weeks
- **Notes System**:
  - Rich text editing with TipTap
  - Folder organization (hierarchical)
  - Smart folders (dynamic filters)
  - Tag support
- **Journal**: Daily, weekly, monthly, and yearly reflection entries
- **Kanban View**: Task status board with drag-and-drop
- **History**: View past task completions and outcomes

### Offline & PWA

- **Progressive Web App**: Installable on mobile and desktop
- **Offline Support**: Full functionality without internet
- **IndexedDB Storage**: Local data persistence
- **Sync Queue**: Automatic sync when connection restored
- **Service Worker**: Caching strategies for assets and API responses

### User Experience

- **Dark Mode**: Theme switching with persistent preferences
- **Responsive Design**: Works on mobile, tablet, and desktop
- **Drag and Drop**: @hello-pangea/dnd for seamless task movement
- **Real-time Updates**: Optimistic UI updates with RTK Query
- **Search & Filter**: Tag-based filtering across all views
- **Progress Tracking**: Visual progress bars for daily completion

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **React**: React 19 with automatic optimizations
- **UI Library**: Material-UI (MUI) v7
- **State Management**: Redux Toolkit with RTK Query
- **Database**: PostgreSQL with Drizzle ORM
- **Drag & Drop**: @hello-pangea/dnd
- **Rich Text**: TipTap editor
- **PWA**: Serwist (service worker management)
- **Offline Storage**: IndexedDB via `idb` library
- **Authentication**: JWT with HTTP-only refresh tokens
- **Icons**: Material-UI Icons

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or cloud)

### Installation

1. **Install dependencies:**

```bash
npm install
```

1. **Set up environment variables:**

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/judaDB?schema=public"
JWT_SECRET="your-secret-key-here"
JWT_REFRESH_SECRET="your-refresh-secret-key-here"
```

1. **Set up the database:**

```bash
# Run migrations to set up the database schema
npm run db:migrate

# (Optional) Open Drizzle Studio to view/edit data
npm run db:studio
```

**Note**: This project uses Drizzle ORM migrations. See the [Migration Rules](#database-migrations) section for details.

1. **Start the development server:**

```bash
npm run dev
```

The app will be available at [http://localhost:3001](http://localhost:3001)

### Build for Production

```bash
npm run build
npm start
```

## Database Migrations

This project uses **Drizzle ORM** with a Rails-like migration workflow. Migrations are fully automated.

### Creating a Migration

```bash
npm run db:generate migration_name
```

This automatically creates:

- `drizzle/000X_migration_name.sql` - SQL file for you to fill in
- `drizzle/meta/000X_snapshot.json` - Schema snapshot (auto-generated)
- Updates `drizzle/meta/_journal.json` - Migration tracking (auto-updated)

### Applying Migrations

```bash
npm run db:migrate
```

**Important**: The build process (`npm run build`) automatically runs migrations, so they're applied during deployment.

### Available Commands

| Command                              | Description                                  |
| ------------------------------------ | -------------------------------------------- |
| `npm run db:generate migration_name` | Creates empty migration + snapshot + journal |
| `npm run db:migrate`                 | Applies pending migrations to database       |
| `npm run db:studio`                  | Opens Drizzle Studio (database browser)      |
| `npm run db:push`                    | ⚠️ DANGEROUS - Never use in production       |

**Never manually create migration files** - Always use `npm run db:generate`.

## Project Structure

```text
juda/
├── app/
│   ├── api/                    # API routes
│   │   ├── auth/               # Authentication endpoints
│   │   ├── tasks/              # Task CRUD + reorder
│   │   ├── sections/           # Section CRUD + reorder
│   │   ├── tags/               # Tag management
│   │   ├── task-tags/          # Task-tag relationships
│   │   ├── completions/        # Task completion tracking
│   │   ├── folders/            # Note folder management
│   │   ├── smart-folders/      # Smart folder filters
│   │   ├── workout-programs/   # Workout program data
│   │   └── preferences/        # User preferences
│   ├── layout.jsx              # Root layout
│   ├── page.jsx                # Main app (drag context)
│   └── providers.jsx           # Redux & MUI providers
├── components/
│   ├── tabs/                   # Main tab components
│   │   ├── TasksTab.jsx        # Tasks view
│   │   ├── KanbanTab.jsx       # Kanban board
│   │   ├── JournalTab.jsx     # Journal entries
│   │   ├── NotesTab.jsx       # Notes management
│   │   └── HistoryTab.jsx     # Completion history
│   ├── CalendarDayView.jsx    # Day calendar view
│   ├── CalendarWeekView.jsx   # Week calendar view
│   ├── CalendarMonthView.jsx  # Month calendar view
│   ├── CalendarYearView.jsx  # Year calendar view
│   ├── TaskDialog.jsx          # Create/edit task modal
│   ├── TaskItem.jsx            # Individual task card
│   ├── Section.jsx             # Today view sections
│   ├── BacklogDrawer.jsx       # Backlog sidebar
│   ├── WorkoutBuilder.jsx      # Workout program builder
│   ├── WorkoutModal.jsx        # Workout completion modal
│   ├── NoteEditor.jsx          # Rich text note editor
│   ├── TagEditor.jsx           # Tag management
│   └── ...                     # Other components
├── hooks/                       # Custom React hooks
│   ├── useTaskOperations.js    # Task CRUD operations
│   ├── useDragAndDrop.js      # Drag and drop logic
│   ├── useCompletionHelpers.js # Completion tracking
│   └── ...                     # Other hooks
├── lib/
│   ├── store/                  # Redux store
│   │   ├── api/                # RTK Query API slices
│   │   ├── slices/             # Redux slices
│   │   └── offlineMiddleware.js # Offline sync middleware
│   ├── db/
│   │   ├── indexedDB.js        # IndexedDB storage layer
│   │   └── syncQueue.js        # Offline sync queue
│   ├── sync/
│   │   └── syncManager.js      # Background sync orchestration
│   ├── db.js                   # Drizzle database client
│   ├── schema.js               # Drizzle schema definitions
│   ├── auth.js                 # Authentication utilities
│   ├── utils.js                # Helper functions
│   └── sw.js                   # Service worker source
├── contexts/                    # React contexts
│   ├── AuthContext.jsx         # Authentication state
│   ├── PreferencesContext.jsx # User preferences
│   └── ColorModeContext.jsx   # Theme management
└── drizzle/                     # Migration files
    ├── *.sql                   # Migration SQL files
    └── meta/                    # Migration metadata
```

## Database Schema

### Core Tables

- **User**: User accounts with email/password authentication
- **RefreshToken**: JWT refresh tokens for session management
- **UserPreference**: User settings and preferences (JSONB)
- **Section**: Task sections (Morning, Afternoon, Evening, etc.)
- **Task**: Tasks with recurrence, subtasks, scheduling, and completion types
- **TaskCompletion**: Daily completion records with outcomes
- **Tag**: User-defined tags with colors
- **TaskTag**: Many-to-many relationship between tasks and tags

### Notes System

- **NoteFolder**: Hierarchical folder structure for notes
- **SmartFolder**: Dynamic folders based on filter criteria

### Workout System

- **WorkoutProgram**: Top-level workout container (1:1 with Task)
- **WorkoutSection**: Groups exercises (Warmup, Main, Cooldown)
- **WorkoutDay**: Days within a section with days-of-week assignment
- **Exercise**: Individual exercises with sets, targets, units
- **WeeklyProgression**: Week-specific targets for exercises
- **WorkoutSetCompletion**: Set-by-set completion tracking

## API Endpoints

### Authentication

- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout and invalidate refresh token
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user info

### Tasks

- `GET /api/tasks` - Get all tasks (with filters)
- `POST /api/tasks` - Create task
- `PUT /api/tasks` - Update task
- `DELETE /api/tasks?id={id}` - Delete task
- `PUT /api/tasks/reorder` - Reorder tasks
- `POST /api/tasks/batch` - Batch operations

### Sections

- `GET /api/sections` - Get all sections
- `POST /api/sections` - Create section
- `PUT /api/sections` - Update section
- `DELETE /api/sections?id={id}` - Delete section
- `PUT /api/sections/reorder` - Reorder sections

### Tags

- `GET /api/tags` - Get all tags
- `POST /api/tags` - Create tag
- `PUT /api/tags` - Update tag
- `DELETE /api/tags?id={id}` - Delete tag

### Completions

- `GET /api/completions` - Get completions (with date filters)
- `POST /api/completions` - Create completion
- `PUT /api/completions` - Update completion
- `DELETE /api/completions?id={id}` - Delete completion
- `POST /api/completions/batch` - Batch completion operations

## Development

### Code Quality

```bash
# Check for linting errors
npm run lint

# Auto-fix linting errors
npm run lint:fix

# Format code with Prettier
npm run format

# Check formatting
npm run format:check
```

**Important**: This project maintains a lint-free codebase. Always run `npm run lint` and fix errors before committing.

### React 19 Optimization

React 19 automatically optimizes components, so `useMemo` and `useCallback` are **not necessary** unless you have:

- High computational cost (>10ms)
- Large object/array creation (>1000 items)
- Stable reference requirements for dependency arrays

### Database Management

```bash
# Generate a new migration
npm run db:generate migration_name

# Apply pending migrations
npm run db:migrate

# Open Drizzle Studio
npm run db:studio

# Dump source database (self-hosted/remote if configured)
npm run db:dump

# Restore latest dump to target database (local by default)
npm run db:restore

# Sync source -> target in one step
npm run db:sync
```

## Deployment

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deployment to Vercel

1. Set up a PostgreSQL database (Vercel Postgres or external)
2. Deploy to Vercel via dashboard or CLI
3. Configure environment variables in Vercel:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `JWT_REFRESH_SECRET`
4. The build process automatically runs migrations (`drizzle-kit migrate`)

## Key Features Explained

### Drag and Drop System

The app uses **@hello-pangea/dnd** for cross-container dragging (backlog ↔ today ↔ calendar). Calendar views also have an internal mouse drag system for time/duration adjustment.

**Droppable ID Format**: Uses pipe (`|`) separator (not colons) to avoid conflicts with ISO date strings:

- `backlog`
- `today-section|{sectionId}`
- `calendar-day|{isoDate}`
- `calendar-week|{isoDate}`

### Task Recurrence

Tasks support recurrence patterns stored as JSON:

- `none`: One-time task
- `daily`: Repeats every day
- `weekly`: Repeats on specific days (e.g., [1, 3, 5] for Mon, Wed, Fri)

### Offline Sync

When offline:

1. Operations are queued in IndexedDB
2. UI updates optimistically
3. When online, sync queue processes operations in FIFO order
4. Failed operations retry with exponential backoff
5. Conflicts are detected and handled

### Workout Programs

Workout tasks can have structured programs:

- **Programs**: Multi-week workout plans
- **Sections**: Group exercises (Warmup, Main, Cooldown)
- **Days**: Specific workout days with days-of-week assignment
- **Exercises**: Individual exercises with sets, targets, units
- **Progressions**: Week-specific targets with deload/test weeks
- **Completions**: Track set-by-set completion with actual values

## Notes

- All data is persisted in PostgreSQL
- Task completion records use UTC dates for timezone consistency
- The app is a Progressive Web App (PWA) - installable on devices
- Full offline support with automatic sync when connection restored
- User preferences are stored in the database (not localStorage)
- Authentication uses HTTP-only cookies for refresh tokens

## Documentation

Additional documentation is available in the `docs/` directory:

- [DEPLOYMENT.md](./docs/DEPLOYMENT.md) - Deployment guide
- [PWA_IMPLEMENTATION.md](./docs/PWA_IMPLEMENTATION.md) - PWA and offline features
- [WORKOUT_FEATURE_IMPLEMENTATION.md](./docs/WORKOUT_FEATURE_IMPLEMENTATION.md) - Workout system details
- [NOTES_SYSTEM_IMPLEMENTATION.md](./docs/NOTES_SYSTEM_IMPLEMENTATION.md) - Notes system architecture
- [AUTH_IMPROVEMENTS.md](./docs/AUTH_IMPROVEMENTS.md) - Authentication system
- [MIGRATIONS.md](./docs/MIGRATIONS.md) - Database migration guide

## License

Private project - All rights reserved.
