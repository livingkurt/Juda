# RTK + PWA Foundation Setup

## Overview

This document describes the Redux Toolkit (RTK) infrastructure with RTK Query, IndexedDB persistence, and offline sync capabilities that have been implemented as the foundation for PWA functionality.

## Architecture

### Core Components

1. **Redux Store** (`lib/store/index.js`)
   - Configured with RTK Query middleware
   - Persistence middleware for IndexedDB sync
   - Sync middleware for offline mutation queuing
   - DevTools enabled in development

2. **IndexedDB Service** (`lib/store/indexeddb.js`)
   - Database schema matching Drizzle tables
   - CRUD operations for tasks, tags, sections
   - Query cache for RTK Query results
   - Sync queue for offline mutations

3. **RTK Query API Slices**
   - `baseApi.js` - Base configuration with authentication
   - `tasksApi.js` - Task CRUD with optimistic updates
   - `tagsApi.js` - Tag CRUD with cache invalidation
   - `sectionsApi.js` - Section CRUD with reordering

4. **Middleware**
   - `persistence.js` - Syncs RTK Query cache to IndexedDB
   - `syncMiddleware.js` - Queues mutations when offline

5. **Hooks**
   - `useOfflineStatus.js` - Tracks online/offline status and sync queue
   - `useMigrateToRTK.js` - Progressive migration utility

## Usage

### Basic RTK Query Usage

```javascript
import { useGetTasksQuery, useCreateTaskMutation } from "@/lib/store/api/tasksApi.js";

function MyComponent() {
  const { data: tasks, isLoading, error } = useGetTasksQuery();
  const [createTask] = useCreateTaskMutation();

  const handleCreate = async () => {
    try {
      await createTask({ title: "New Task", sectionId: "section123" }).unwrap();
    } catch (err) {
      console.error("Failed to create task:", err);
    }
  };

  // ...
}
```

### Offline Status

```javascript
import { useOfflineStatus } from "@/lib/hooks/useOfflineStatus.js";

function SyncIndicator() {
  const { isOnline, syncQueueStats, retryFailedSyncs } = useOfflineStatus();

  return (
    <div>
      {!isOnline && <span>Offline - {syncQueueStats.pending} pending syncs</span>}
      {syncQueueStats.failed > 0 && <button onClick={retryFailedSyncs}>Retry Failed Syncs</button>}
    </div>
  );
}
```

### Progressive Migration

```javascript
import { useMigrateToRTK } from "@/lib/hooks/useMigrateToRTK.js";

function MyComponent() {
  const migration = useMigrateToRTK({
    enabled: true, // Feature flag
    onCompare: comparison => {
      console.log("Data differences:", comparison.differences);
    },
  });

  // Use RTK data when migration is enabled
  const tasks = migration.enabled ? migration.rtkTasks : serverActionTasks;
}
```

## Features

### Optimistic Updates

All mutations include optimistic updates that immediately update the UI, then sync with the server. If the server request fails, the update is automatically rolled back.

### Offline Support

- Mutations are automatically queued when offline
- Queue is processed automatically when connection is restored
- Exponential backoff retry logic for failed syncs
- Visual indicators for sync status

### IndexedDB Persistence

- All query results are cached in IndexedDB
- Data is available immediately on app load
- Cache is automatically updated on mutations
- Cache expiration (default: 5 minutes)

### Cache Invalidation

- Related entities are automatically invalidated
- Tag updates invalidate task cache (for usage counts)
- Section updates invalidate task cache
- Proper tag types ensure consistent cache management

## Integration Points

### Provider Setup

The Redux Provider is already integrated in `app/providers.jsx`:

```javascript
<ReduxProvider store={store}>
  <ChakraProvider>{/* ... */}</ChakraProvider>
</ReduxProvider>
```

### Authentication

RTK Query automatically handles authentication:

- Gets access token via `/api/auth/refresh`
- Includes Bearer token in all requests
- Handles 401 errors and token refresh
- Redirects to login on auth failure

## Migration Strategy

### Phase 1: Parallel Operation (Current)

- RTK Query infrastructure is in place
- Existing server actions continue to work
- Use `useMigrateToRTK` hook to compare data
- Gradually migrate components to RTK Query

### Phase 2: Feature Flags

- Enable RTK Query for specific features
- Monitor for discrepancies
- Fix any issues before full rollout

### Phase 3: Full Migration

- Replace all server action hooks with RTK Query hooks
- Remove migration utilities
- Remove old hooks

## Testing Checklist

### Functional Tests

- [x] Store initializes correctly
- [x] IndexedDB schema created
- [x] RTK Query endpoints configured
- [ ] Mutations update local state optimistically
- [ ] Offline mutations queue correctly
- [ ] Sync queue processes on reconnection
- [ ] Cache invalidation works

### Offline Scenarios

- [ ] Create task while offline → queues → syncs when online
- [ ] Update task while offline → queues → syncs when online
- [ ] Delete task while offline → queues → syncs when online
- [ ] Multiple queued operations process in order
- [ ] Failed sync attempts retry with backoff

### Performance Tests

- [ ] IndexedDB writes don't block UI
- [ ] Large task lists load quickly from cache
- [ ] Optimistic updates feel instant
- [ ] No memory leaks from subscriptions

## File Structure

```
lib/
├── store/
│   ├── index.js                 # Store configuration
│   ├── indexeddb.js             # IndexedDB service
│   ├── api/
│   │   ├── baseApi.js           # RTK Query base
│   │   ├── tasksApi.js          # Tasks endpoints
│   │   ├── tagsApi.js           # Tags endpoints
│   │   └── sectionsApi.js       # Sections endpoints
│   ├── middleware/
│   │   ├── persistence.js       # IndexedDB sync
│   │   └── syncMiddleware.js    # Offline queue
│   └── services/
│       └── syncQueue.js         # Queue management
└── hooks/
    ├── useOfflineStatus.js      # Offline detection
    └── useMigrateToRTK.js       # Progressive migration
```

## Next Steps

1. **Test offline functionality** - Verify mutations queue and sync correctly
2. **Add sync status UI** - Show pending/failed syncs to users
3. **Implement conflict resolution** - Handle conflicts when syncing
4. **Add background sync** - Use Background Sync API for better offline support
5. **Performance optimization** - Optimize IndexedDB queries for large datasets
6. **Progressive migration** - Gradually migrate components to RTK Query

## Notes

- All RTK Query hooks are prefixed with `use` (e.g., `useGetTasksQuery`)
- Mutations return promises that can be unwrapped with `.unwrap()`
- Cache tags ensure proper invalidation across related entities
- IndexedDB operations are async and non-blocking
- Sync queue has a maximum retry limit of 5 attempts
