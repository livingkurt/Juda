#!/bin/sh
set -e

# Run migrations
echo "Running migrations..."
# We use the locally installed drizzle-kit from node_modules if available, or npx
if [ -f "./node_modules/.bin/drizzle-kit" ]; then
  ./node_modules/.bin/drizzle-kit migrate
else
  npx drizzle-kit migrate
fi

# Start the application
echo "Starting application..."
exec node server.js
