#!/bin/bash

# Load production database URL from .env
source .env

if [ -z "$PRODUCTION_DATABASE_URL" ]; then
  echo "❌ Error: PRODUCTION_DATABASE_URL not found in .env"
  exit 1
fi

# Remove unsupported query parameters (like schema) from DATABASE_URL
# psql doesn't support the schema query parameter
CLEAN_URL=$(echo "$PRODUCTION_DATABASE_URL" | sed 's/[?&]schema=[^&]*//g')

# Extract hostname and port for connection check
HOSTNAME=$(echo "$CLEAN_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
PORT=$(echo "$CLEAN_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

echo "🔍 Checking connection to Supabase..."
echo "   Host: $HOSTNAME"
echo "   Port: $PORT"

# For Supabase, we need to ensure SSL is enabled
if [[ "$CLEAN_URL" != *"sslmode"* ]]; then
  echo "   ⚠️  Adding SSL mode for Supabase connection"
  CLEAN_URL="${CLEAN_URL}?sslmode=require"
fi

echo ""

# Find the most recent dump file
DUMP_FILE=$(ls -t dumps/production-dump-*.sql 2>/dev/null | head -n 1)

if [ -z "$DUMP_FILE" ]; then
  echo "❌ Error: No dump files found in dumps/ directory"
  echo "   Run 'npm run db:dump' first to create a dump from your Neon database"
  exit 1
fi

echo "🔄 Transferring database to Supabase..."
echo ""
echo "📦 Source dump: $DUMP_FILE"
echo "🎯 Target: Supabase (PRODUCTION_DATABASE_URL)"
echo ""
echo "⚠️  WARNING: This will DROP and recreate your Supabase database!"
echo "⚠️  All existing data in Supabase will be LOST!"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cancelled"
  exit 1
fi

echo ""
echo "📥 Transferring database to Supabase..."
echo ""

# Restore the dump to the production database
psql "$CLEAN_URL" < "$DUMP_FILE"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Database transferred successfully to Supabase!"
  echo ""
  echo "📊 Summary:"
  echo "   Source: Neon (dumped to $DUMP_FILE)"
  echo "   Target: Supabase"
  echo "   Status: Complete"
else
  echo ""
  echo "❌ Error: Database transfer failed"
  echo "   Check the error messages above for details"
  exit 1
fi
