#!/bin/bash

# Load local database URL from .env
source .env

if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL not found in .env"
  exit 1
fi

# Remove unsupported query parameters (like schema) from DATABASE_URL
# psql doesn't support the schema query parameter
CLEAN_URL=$(echo "$DATABASE_URL" | sed 's/[?&]schema=[^&]*//g')

# Find the most recent dump file
DUMP_FILE=$(ls -t dumps/production-dump-*.sql 2>/dev/null | head -n 1)

if [ -z "$DUMP_FILE" ]; then
  echo "❌ Error: No dump files found in dumps/ directory"
  echo "   Run 'npm run db:dump' first"
  exit 1
fi

echo "🔄 Restoring from: $DUMP_FILE"
echo ""
echo "⚠️  This will DROP and recreate your local database!"
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
