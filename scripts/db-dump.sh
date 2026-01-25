#!/bin/bash

# Load production database URL from .env
source .env

if [ -z "$PRODUCTION_DATABASE_URL" ]; then
  echo "❌ Error: PRODUCTION_DATABASE_URL not found in .env"
  exit 1
fi

# Remove unsupported query parameters (like schema) from DATABASE_URL
# pg_dump doesn't support the schema query parameter
CLEAN_URL=$(echo "$PRODUCTION_DATABASE_URL" | sed 's/[?&]schema=[^&]*//g')

# Create dumps directory if it doesn't exist
mkdir -p dumps

# Generate timestamp for filename
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
DUMP_FILE="dumps/production-dump-${TIMESTAMP}.sql"

echo "📦 Dumping production database..."
pg_dump "$CLEAN_URL" --clean --if-exists --no-owner --no-acl > "$DUMP_FILE"

echo "✅ Dump saved to: $DUMP_FILE"
echo ""
echo "📊 Dump size: $(du -h "$DUMP_FILE" | cut -f1)"
