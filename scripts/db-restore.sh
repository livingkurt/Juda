#!/bin/bash

# Load database URLs from .env
source .env

# Target database priority:
# 1) TARGET_DATABASE_URL (explicit)
# 2) DATABASE_URL (local development default)
# 3) SELF_HOSTED_DATABASE_URL (self-hosted fallback)
TARGET_DB_URL="${TARGET_DATABASE_URL:-${DATABASE_URL:-${SELF_HOSTED_DATABASE_URL:-}}}"

if [ -z "$TARGET_DB_URL" ]; then
  echo "❌ Error: No target database URL found."
  echo "   Set one of: TARGET_DATABASE_URL, DATABASE_URL, or SELF_HOSTED_DATABASE_URL"
  exit 1
fi

# Remove unsupported query parameters (like schema) from DATABASE_URL
CLEAN_URL=$(echo "$TARGET_DB_URL" | sed 's/[?&]schema=[^&]*//g')

# Find the most recent dump file (.dump format)
DUMP_FILE=$(ls -t dumps/production-dump-*.dump 2>/dev/null | head -n 1)

# Fall back to old .sql format if no .dump file found
if [ -z "$DUMP_FILE" ]; then
  DUMP_FILE=$(ls -t dumps/production-dump-*.sql 2>/dev/null | head -n 1)
fi

if [ -z "$DUMP_FILE" ]; then
  echo "❌ Error: No dump files found in dumps/ directory"
  echo "   Run 'npm run db:dump' first"
  exit 1
fi

if [ ! -s "$DUMP_FILE" ]; then
  echo "❌ Error: Dump file is empty: $DUMP_FILE"
  echo "   Run 'npm run db:dump' again after fixing source DB connectivity"
  exit 1
fi

echo "🔄 Restoring from: $DUMP_FILE"
echo ""
echo "⚠️  This will DROP and recreate your target database!"
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cancelled"
  exit 1
fi

echo ""
echo "📥 Restoring database (public and drizzle schemas)..."
echo ""

if [[ "$DUMP_FILE" == *.dump ]]; then
  # Drop schemas with CASCADE first to cleanly remove all FK dependencies,
  # then restore into a fresh schema. This avoids pg_restore --clean failing
  # on constraints that have dependents.
  echo "🗑️  Dropping existing schemas (CASCADE)..."
  psql "$CLEAN_URL" <<'SQL'
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
DROP SCHEMA IF EXISTS drizzle CASCADE;
CREATE SCHEMA drizzle;
SQL

  if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to drop schemas."
    exit 1
  fi

  # Custom format: pg_restore restores in correct dependency order
  pg_restore \
    --dbname="$CLEAN_URL" \
    --no-owner \
    --no-acl \
    --schema=public \
    --schema=drizzle \
    "$DUMP_FILE"
  RESTORE_EXIT=$?
else
  # Legacy plain SQL format fallback
  psql "$CLEAN_URL" < "$DUMP_FILE"
  RESTORE_EXIT=$?
fi

if [ $RESTORE_EXIT -ne 0 ]; then
  echo ""
  echo "❌ Error: Database restore failed."
  exit 1
fi

echo ""
echo "✅ Database restored successfully!"
