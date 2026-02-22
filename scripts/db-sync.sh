#!/bin/bash

# Load database URLs from .env
source .env

# Default sync direction:
# source: self-hosted/remote
# target: local development
SOURCE_DB_URL="${SOURCE_DATABASE_URL:-${SELF_HOSTED_DATABASE_URL:-${PRODUCTION_DATABASE_URL:-}}}"
TARGET_DB_URL="${TARGET_DATABASE_URL:-${DATABASE_URL:-${SELF_HOSTED_DATABASE_URL:-}}}"

if [ -z "$SOURCE_DB_URL" ]; then
  echo "❌ Error: No source database URL found."
  echo "   Set one of: SOURCE_DATABASE_URL, SELF_HOSTED_DATABASE_URL, or PRODUCTION_DATABASE_URL"
  exit 1
fi

if [ -z "$TARGET_DB_URL" ]; then
  echo "❌ Error: No target database URL found."
  echo "   Set one of: TARGET_DATABASE_URL, DATABASE_URL, or SELF_HOSTED_DATABASE_URL"
  exit 1
fi

echo "🔄 Starting database sync (source -> target)..."
echo ""

SOURCE_DATABASE_URL="$SOURCE_DB_URL" bash scripts/db-dump.sh || exit 1
TARGET_DATABASE_URL="$TARGET_DB_URL" bash scripts/db-restore.sh || exit 1

echo ""
echo "✅ Database sync completed successfully."
