# Coolify on Unraid - Simple Solution

## The Problem

Coolify doesn't recognize Unraid's OS because Unraid is a specialized Linux distribution that doesn't match Coolify's expected OS types (Ubuntu, Debian, CentOS, etc.).

## The Simple Solution

**Just click "Skip Setup" at the bottom of the screen!**

You should see a "Skip Setup" button at the bottom of the validation dialog. This will:

- Skip the server setup wizard
- Let you use Coolify without a configured server
- Allow you to deploy using Docker Compose directly

## After Skipping Setup

Once you skip the setup, you can still deploy your Juda app by:

### Option 1: Use Docker Compose Deployment

1. In Coolify, create a **New Project**
2. Add a **Resource** → **Docker Compose**
3. Paste your docker-compose.yml
4. Set environment variables
5. Deploy

This doesn't require server SSH access - it uses Docker directly.

### Option 2: Configure Server Later

You can add a server later by going to **Settings** → **Servers** → **Add Server**

## Why This Works

Coolify can still deploy applications using the Docker socket even without a configured "server". The server configuration is mainly for:

- Remote deployments
- SSH-based deployments
- Multi-server setups

For a single-server Unraid setup, you can skip it entirely.

## Alternative: Force Server Validation

If you really want to add the server despite the OS warning, you can force it by running this on Unraid:

```bash
# Get the server ID that was just created
SERVER_ID=$(docker exec -i coolify-db psql -U coolify -d coolify -t -c "SELECT id FROM servers ORDER BY created_at DESC LIMIT 1;" | tr -d ' ')

# Force mark it as validated
docker exec -i coolify-db psql -U coolify -d coolify << EOF
UPDATE servers
SET validation_logs = NULL
WHERE id = $SERVER_ID;
EOF

# Restart Coolify
docker restart coolify
```

Then refresh the page and the server should appear as validated.

## My Recommendation

**Just click "Skip Setup"** and start deploying your app. You don't need the server configuration for what you're trying to do.
