-- Performance Indexes for Scalability
-- These indexes dramatically improve query performance for large datasets
-- Note: CONCURRENTLY can't be used in migrations, but these indexes are small enough to create quickly

-- Index on userId for fast user-specific queries (most common filter)
CREATE INDEX IF NOT EXISTS "idx_task_user_id" 
ON "Task" ("userId");

-- Index on sectionId for fast section-based filtering (Today view)
CREATE INDEX IF NOT EXISTS "idx_task_section_id" 
ON "Task" ("sectionId");

-- Index on parentId for fast subtask lookups
CREATE INDEX IF NOT EXISTS "idx_task_parent_id" 
ON "Task" ("parentId");

-- Composite index for the most common query pattern: user + section + order
-- This speeds up "get all tasks for user in a specific section, ordered"
CREATE INDEX IF NOT EXISTS "idx_task_user_section_order" 
ON "Task" ("userId", "sectionId", "order");

-- Index on completionType for filtering notes and goals
CREATE INDEX IF NOT EXISTS "idx_task_completion_type" 
ON "Task" ("completionType");

-- Composite index for backlog queries: user + no section
-- Partial index (WHERE sectionId IS NULL) is more efficient for this specific query
CREATE INDEX IF NOT EXISTS "idx_task_backlog" 
ON "Task" ("userId", "order") 
WHERE "sectionId" IS NULL;

-- Index on TaskCompletion for fast completion lookups
CREATE INDEX IF NOT EXISTS "idx_completion_task_date" 
ON "TaskCompletion" ("taskId", "date");

CREATE INDEX IF NOT EXISTS "idx_completion_date" 
ON "TaskCompletion" ("date");

-- Index on TaskTag for fast tag filtering
CREATE INDEX IF NOT EXISTS "idx_task_tag_task_id" 
ON "TaskTag" ("taskId");

CREATE INDEX IF NOT EXISTS "idx_task_tag_tag_id" 
ON "TaskTag" ("tagId");

-- Performance notes:
-- - CONCURRENTLY allows index creation without locking the table
-- - Partial indexes (with WHERE clause) are smaller and faster for specific queries
-- - Composite indexes should match the most common query patterns
-- - Order matters in composite indexes: (userId, sectionId) is different from (sectionId, userId)
