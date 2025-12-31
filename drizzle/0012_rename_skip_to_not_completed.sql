-- Rename 'skipped' outcome to 'not_completed' across the codebase
-- Update all existing TaskCompletion records with 'skipped' outcome to 'not_completed'
UPDATE "TaskCompletion"
SET
  outcome = 'not_completed'
WHERE
  outcome = 'skipped';