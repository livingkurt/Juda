#!/bin/bash
set -e

# Load environment variables
if [ -f .env ]; then
  source .env
fi

echo "🚀 Starting migration from Neon (Production) to Unraid (Self-Hosted)..."
echo ""

# Step 1: Dump Production Database
echo "1️⃣  Dumping production database..."
# Run the existing dump script
bash scripts/db-dump.sh

# Find the most recent dump file
DUMP_FILE=$(ls -t dumps/production-dump-*.sql 2>/dev/null | head -n 1)

if [ -z "$DUMP_FILE" ]; then
  echo "❌ Error: Could not find the dump file."
  exit 1
fi

echo "✅ Dump file ready: $DUMP_FILE"
echo ""

# Step 2: Get Unraid Connection Details
echo "2️⃣  Target Database Details (Unraid)"
echo "Enter the details for your Unraid Postgres instance."
read -p "Unraid IP Address (e.g., 192.168.1.133): " UNRAID_IP
read -p "Unraid DB Port (default: 5432): " UNRAID_PORT
UNRAID_PORT=${UNRAID_PORT:-5432}
read -p "Database Name (default: judaDB): " DB_NAME
DB_NAME=${DB_NAME:-judaDB}
read -p "Database User (default: postgres): " DB_USER
DB_USER=${DB_USER:-postgres}
read -s -p "Database Password: " DB_PASSWORD
echo ""

echo ""
echo "🔄 Restoring to Unraid ($UNRAID_IP:$UNRAID_PORT/$DB_NAME)..."
echo "⚠️  This will overwrite ALL data in the Unraid database!"
read -p "Are you sure you want to proceed? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 1
fi

echo ""
echo "📥 Restoring data..."

# Export password for psql
export PGPASSWORD="$DB_PASSWORD"

# Run psql to restore
# We use the -h flag to connect to the remote Unraid server

echo "🧹 Wiping existing data to ensure clean restore..."
psql -h "$UNRAID_IP" -p "$UNRAID_PORT" -U "$DB_USER" -d "$DB_NAME" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

echo "🔄 Restoring data..."
psql -h "$UNRAID_IP" -p "$UNRAID_PORT" -U "$DB_USER" -d "$DB_NAME" < "$DUMP_FILE"

# Unset password
unset PGPASSWORD

echo ""
echo "✅ Migration complete! Your Unraid instance should now have the production data."
