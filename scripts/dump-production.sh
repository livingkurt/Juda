#!/bin/bash

# Script to dump production database using pg_dump
# Requires pg_dump to be installed: brew install postgresql (on macOS)
# Reads PRODUCTION_DATABASE_URL and DATABASE_URL from .env file

set -e

# Load .env file if it exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep -v '^$' | xargs)
fi

PRODUCTION_URL="${PRODUCTION_DATABASE_URL}"
LOCAL_URL="${DATABASE_URL}"

if [ -z "$PRODUCTION_URL" ]; then
  echo "❌ Error: PRODUCTION_DATABASE_URL not found in .env file"
  echo "   Add it to your .env file:"
  echo "   PRODUCTION_DATABASE_URL=\"your-production-database-url\""
  echo "   Get it from Vercel: Settings → Environment Variables → DATABASE_URL"
  exit 1
fi

# Create dumps directory
mkdir -p dumps

# Generate timestamp for filename
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
DUMP_FILE="dumps/production-dump-${TIMESTAMP}.sql"

echo "📦 Dumping production database..."
echo "   Source: ${PRODUCTION_URL%%@*}" # Show only user@host part for security
echo ""

# Extract connection details from URL
# Format: postgresql://user:password@host:port/database?params
DB_URL_REGEX="postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/([^?]+)"
if [[ $PRODUCTION_URL =~ $DB_URL_REGEX ]]; then
  DB_USER="${BASH_REMATCH[1]}"
  DB_PASS="${BASH_REMATCH[2]}"
  DB_HOST="${BASH_REMATCH[3]}"
  DB_PORT="${BASH_REMATCH[4]}"
  DB_NAME="${BASH_REMATCH[5]}"

  # Use PGPASSWORD environment variable for password
  export PGPASSWORD="$DB_PASS"

  # Dump the database
  pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --clean --if-exists --no-owner --no-acl \
    -f "$DUMP_FILE"

  unset PGPASSWORD

  echo "✅ Dump saved to: $DUMP_FILE"
  echo ""

  # Optionally restore to local
  if [ "$1" == "--restore" ] && [ -n "$LOCAL_URL" ]; then
    echo "🔄 Restoring to local database..."

    # Extract local connection details
    if [[ $LOCAL_URL =~ $DB_URL_REGEX ]]; then
      LOCAL_DB_USER="${BASH_REMATCH[1]}"
      LOCAL_DB_PASS="${BASH_REMATCH[2]}"
      LOCAL_DB_HOST="${BASH_REMATCH[3]}"
      LOCAL_DB_PORT="${BASH_REMATCH[4]}"
      LOCAL_DB_NAME="${BASH_REMATCH[5]}"

      export PGPASSWORD="$LOCAL_DB_PASS"

      # Restore to local database
      psql -h "$LOCAL_DB_HOST" -p "$LOCAL_DB_PORT" -U "$LOCAL_DB_USER" -d "$LOCAL_DB_NAME" \
        -f "$DUMP_FILE"

      unset PGPASSWORD

      echo "✅ Local database restored successfully!"
    else
      echo "⚠️  Could not parse local DATABASE_URL"
    fi
  elif [ "$1" == "--restore" ]; then
    echo "⚠️  Skipping restore: DATABASE_URL not set in .env file"
  else
    echo "💡 Tip: Add --restore flag to automatically restore to local database"
    echo "   Example: ./scripts/dump-production.sh --restore"
  fi
else
  echo "❌ Error: Could not parse PRODUCTION_DATABASE_URL"
  exit 1
fi

