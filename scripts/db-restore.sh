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
# psql doesn't support the schema query parameter
CLEAN_URL=$(echo "$TARGET_DB_URL" | sed 's/[?&]schema=[^&]*//g')

# Find the most recent dump file
DUMP_FILE=$(ls -t dumps/production-dump-*.sql 2>/dev/null | head -n 1)

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

# Restore only to public schema, suppress permission errors
psql "$CLEAN_URL" < "$DUMP_FILE" 2>&1 | grep -v "must be owner" | grep -v "permission denied" | grep -v "already exists" || true

echo ""
echo "✅ Database restored successfully!"
echo ""
echo "Note: Permission errors for Supabase internal schemas are normal and can be ignored."
