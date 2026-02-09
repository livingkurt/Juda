#!/bin/bash

echo "🚨 REMOVING SENSITIVE FILES FROM GIT HISTORY"
echo "============================================="
echo ""
echo "⚠️  WARNING: This will rewrite git history!"
echo "⚠️  Make sure you have rotated your database passwords FIRST!"
echo ""
read -p "Have you rotated your database passwords? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "❌ Please rotate your passwords first, then run this script again."
  exit 1
fi

echo ""
echo "📝 Step 1: Backing up current state..."
git branch backup-before-cleanup-$(date +%Y%m%d-%H%M%S)

echo ""
echo "📝 Step 2: Checking for git-filter-repo..."

if ! command -v git-filter-repo &> /dev/null; then
  echo "❌ git-filter-repo not found."
  echo ""
  echo "Please install it first:"
  echo "  macOS:  brew install git-filter-repo"
  echo "  Linux:  pip3 install git-filter-repo"
  echo "  Or:     pip install git-filter-repo"
  echo ""
  exit 1
fi

echo "✅ git-filter-repo found"
echo ""
echo "🔧 Step 3: Removing files from git history..."
echo "   - scripts/check-databases.sh"
echo "   - docs/database-migration-supabase.md"
echo ""

# Remove the files from git history
git filter-repo --invert-paths \
  --path scripts/check-databases.sh \
  --path docs/database-migration-supabase.md \
  --force

echo ""
echo "✅ Files removed from git history!"
echo ""
echo "📝 Step 4: Removing files from current directory..."

# Remove from current state
rm -f scripts/check-databases.sh
rm -f docs/database-migration-supabase.md

echo "✅ Files removed from current directory"
echo ""
echo "✅ DONE!"
echo ""
echo "🚨 NEXT STEPS (CRITICAL):"
echo "================================"
echo "1. Force push to GitHub to update history:"
echo "   git push origin main --force"
echo ""
echo "⚠️  WARNING: Force push will rewrite history!"
echo "⚠️  This will affect anyone who has cloned your repo!"
echo ""
echo "2. Verify the files are no longer visible on GitHub:"
echo "   https://github.com/livingkurt/Juda"
echo ""
echo "3. If you have any other clones of this repo, delete them"
echo "   and clone fresh from GitHub after force pushing."
echo ""
echo "💾 A backup branch was created in case you need it."
echo ""
