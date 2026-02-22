#!/bin/bash

# Load database URLs from .env
source .env

# Source database priority:
# 1) SOURCE_DATABASE_URL (explicit)
# 2) SELF_HOSTED_DATABASE_URL (self-hosted default)
# 3) PRODUCTION_DATABASE_URL (backward compatibility)
SOURCE_DB_URL="${SOURCE_DATABASE_URL:-${SELF_HOSTED_DATABASE_URL:-${PRODUCTION_DATABASE_URL:-}}}"

if [ -z "$SOURCE_DB_URL" ]; then
  echo "❌ Error: No source database URL found."
  echo "   Set one of: SOURCE_DATABASE_URL, SELF_HOSTED_DATABASE_URL, or PRODUCTION_DATABASE_URL"
  exit 1
fi

# Remove unsupported query parameters (like schema) from DATABASE_URL
# pg_dump doesn't support the schema query parameter
CLEAN_URL=$(echo "$SOURCE_DB_URL" | sed 's/[?&]schema=[^&]*//g')

# Create dumps directory if it doesn't exist
mkdir -p dumps

# Generate timestamp for filename
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
DUMP_FILE="dumps/production-dump-${TIMESTAMP}.sql"

echo "📦 Dumping source database (public and drizzle schemas)..."
if ! pg_dump "$CLEAN_URL" --schema=public --schema=drizzle --clean --if-exists --no-owner --no-acl > "$DUMP_FILE"; then
  echo "❌ Error: Database dump failed."
  exit 1
fi

if [ ! -s "$DUMP_FILE" ]; then
  echo "❌ Error: Dump file is empty: $DUMP_FILE"
  exit 1
fi

echo "✅ Dump saved to: $DUMP_FILE"
echo ""
echo "📊 Dump size: $(du -h "$DUMP_FILE" | cut -f1)"
