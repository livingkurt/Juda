# Task Manager - Next.js with Chakra UI & PostgreSQL

A daily task management system built with Next.js, Chakra UI, and PostgreSQL.

## Features

- **Dashboard View**: Organize tasks by sections (Morning, Afternoon, Evening)
- **Calendar Views**: Day, Week, and Month views for scheduling
- **Task Management**:
  - Create, edit, and delete tasks
  - Add subtasks to tasks
  - Set recurrence patterns (daily, weekly)
  - Set time and duration for tasks
  - Color coding for tasks
- **Backlog**: Store tasks that don't have a specific time
- **Drag and Drop**: Reorder tasks and sections using @hello-pangea/dnd
- **Dark Mode**: Toggle between light and dark themes
- **Progress Tracking**: Visual progress bar for daily completion
- **Database Persistence**: All data stored in PostgreSQL

## Tech Stack

- **Next.js 14**: React framework with App Router
- **Chakra UI**: Component library
- **PostgreSQL**: Database
- **Prisma**: ORM for database access
- **@hello-pangea/dnd**: Drag and drop library
- **Lucide React**: Icon library

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Installation

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

```bash
cp .env.example .env
```

Edit `.env` and update the `DATABASE_URL`:

```
DATABASE_URL="postgresql://user:password@localhost:5432/judaDB?schema=public"
```

3. Set up the database:

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# (Optional) Seed initial data
npx prisma db seed
```

4. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

### Build

```bash
npm run build
npm start
```

## Project Structure

```
juda/
├── app/
│   ├── api/              # API routes
│   │   ├── sections/    # Section CRUD endpoints
│   │   ├── tasks/       # Task CRUD endpoints
│   │   └── backlog/     # Backlog CRUD endpoints
│   ├── layout.jsx       # Root layout
│   ├── page.jsx         # Main application page
│   └── providers.jsx    # Chakra UI provider
├── components/          # React components
│   ├── TaskItem.jsx
│   ├── Section.jsx
│   ├── TaskDialog.jsx
│   ├── SectionDialog.jsx
│   ├── BacklogDrawer.jsx
│   └── Calendar*.jsx    # Calendar view components
├── hooks/               # Custom React hooks
│   ├── useTasks.js
│   ├── useSections.js
│   └── useBacklog.js
├── lib/                 # Utilities
│   ├── prisma.js        # Prisma client
│   ├── utils.js         # Helper functions
│   └── constants.js     # Constants
└── prisma/
    └── schema.prisma    # Database schema
```

## Database Schema

- **Section**: Task sections (Morning, Afternoon, Evening)
- **Task**: Individual tasks with recurrence, subtasks, and scheduling
- **BacklogItem**: Tasks without specific time assignments

## API Endpoints

### Sections

- `GET /api/sections` - Get all sections
- `POST /api/sections` - Create section
- `PUT /api/sections` - Update section
- `DELETE /api/sections?id={id}` - Delete section
- `PUT /api/sections/reorder` - Reorder sections

### Tasks

- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks` - Update task
- `DELETE /api/tasks?id={id}` - Delete task
- `PUT /api/tasks/reorder` - Reorder tasks

### Backlog

- `GET /api/backlog` - Get all backlog items
- `POST /api/backlog` - Create backlog item
- `PUT /api/backlog` - Update backlog item
- `DELETE /api/backlog?id={id}` - Delete backlog item

## Development

### Database Migrations

```bash
# Create a new migration
npx prisma migrate dev --name migration_name

# Apply migrations in production
npx prisma migrate deploy
```

### Prisma Studio

View and edit your database:

```bash
npx prisma studio
```

## Notes

- All data is persisted in PostgreSQL
- Tasks support recurrence patterns (daily, weekly)
- Drag and drop functionality for reordering
- Responsive design with Chakra UI components
- Dark mode support via Chakra UI color mode
