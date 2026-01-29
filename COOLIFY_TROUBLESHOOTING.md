# Coolify "This Machine" Troubleshooting Guide

## Current Issue

Getting "The payload is invalid" error when clicking "This machine" button in Coolify.

## Root Cause

Coolify is trying to validate the SSH connection to localhost but the server entry in the database may not be properly configured, or Coolify expects the setup to be done through the UI rather than directly in the database.

## Solution Options

### Option 1: Use the Complete Fix Script (Recommended)

This script will completely reset and reconfigure the localhost server entry.

**On your Unraid server, run:**

```bash
# Copy the script content or run these commands directly:
cd /tmp

# Download or create the script
cat > coolify-complete-fix.sh << 'ENDSCRIPT'
# [Script content from coolify-complete-fix.sh]
ENDSCRIPT

chmod +x coolify-complete-fix.sh
./coolify-complete-fix.sh
```

### Option 2: Manual Setup Through Coolify UI

Instead of using "This machine", try adding the server manually:

1. **Skip the "This machine" button**
2. **Go to Settings → Servers → Add Server**
3. **Fill in the details:**
   - Name: `localhost` or `unraid`
   - IP Address: `host.docker.internal` or `127.0.0.1`
   - Port: `22`
   - User: `root`
   - Private Key: Generate a new one or paste the key from `/root/.ssh/coolify_localhost`

### Option 3: Check Coolify Logs for Specific Error

The logs will tell us exactly what's failing:

```bash
# On Unraid, run:
docker logs coolify --tail 100 | grep -i error
docker logs coolify --tail 100 | grep -i payload
```

Look for errors related to:
- SSH connection failures
- Database validation errors
- API endpoint errors

### Option 4: Use Docker Socket Instead of SSH

Coolify can also connect to the local Docker daemon via socket instead of SSH:

1. **Check if Coolify has access to Docker socket:**
   ```bash
   docker exec coolify ls -la /var/run/docker.sock
   ```

2. **If not, restart Coolify with socket access:**
   ```bash
   docker stop coolify
   docker rm coolify
   
   # Recreate with docker socket mounted
   docker run -d \
     --name coolify \
     --restart unless-stopped \
     -p 8001:8080 \
     -v /var/run/docker.sock:/var/run/docker.sock \
     -v /mnt/user/appdata/coolify:/data \
     --env-file /mnt/user/appdata/coolify/.env \
     ghcr.io/coollabsio/coolify:latest
   ```

## Diagnostic Commands

Run these on your Unraid server to diagnose the issue:

```bash
# 1. Check all Coolify containers are healthy
docker ps | grep coolify

# 2. Check Coolify logs
docker logs coolify --tail 50

# 3. Check database entries
docker exec -i coolify-db psql -U coolify -d coolify << 'EOF'
SELECT id, name, ip, port, "user", private_key_id FROM servers;
SELECT id, name FROM private_keys;
EOF

# 4. Test SSH connection manually
ssh -i /root/.ssh/coolify_localhost root@localhost "echo 'SSH works'"

# 5. Check if Coolify can reach Docker
docker exec coolify docker ps
```

## Common Issues and Fixes

### Issue: "host.docker.internal" not resolving

**Fix:** Use `172.17.0.1` (Docker bridge IP) instead:

```bash
docker exec -i coolify-db psql -U coolify -d coolify << 'EOF'
UPDATE servers SET ip = '172.17.0.1' WHERE id = 0;
EOF
docker restart coolify
```

### Issue: SSH key format problems

**Fix:** Regenerate the key with proper format:

```bash
# Remove old key
rm -f /root/.ssh/coolify_localhost*

# Generate new key (ED25519 format)
ssh-keygen -t ed25519 -f /root/.ssh/coolify_localhost -N "" -C "coolify"

# Add to authorized_keys
cat /root/.ssh/coolify_localhost.pub >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
```

### Issue: Coolify can't write to database

**Fix:** Check database permissions:

```bash
docker exec coolify-db psql -U coolify -d coolify -c "\du"
```

### Issue: Port 22 not accessible from Docker container

**Fix:** Test from inside the Coolify container:

```bash
docker exec coolify nc -zv host.docker.internal 22
```

If this fails, SSH might not be accessible from Docker. Try:
- Using `172.17.0.1` instead
- Checking Unraid SSH settings
- Ensuring SSH is listening on all interfaces

## Alternative: Fresh Coolify Setup

If nothing works, you can start fresh:

```bash
# On Unraid:
cd /mnt/user/appdata/coolify

# Stop and remove everything
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down -v

# Remove data
rm -rf /data/coolify
rm -rf /mnt/user/appdata/coolify/*

# Re-download compose files
curl -fsSL https://cdn.coollabs.io/coolify/docker-compose.yml -o docker-compose.yml
curl -fsSL https://cdn.coollabs.io/coolify/docker-compose.prod.yml -o docker-compose.prod.yml
curl -fsSL https://cdn.coollabs.io/coolify/.env.production -o .env

# Edit .env with proper values (use the values from your backup)

# Start fresh
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Getting Help

If you're still stuck, gather this information:

```bash
# Coolify version
docker exec coolify cat /var/www/html/version

# Container status
docker ps -a | grep coolify

# Recent logs
docker logs coolify --tail 100 > /tmp/coolify-logs.txt
docker logs coolify-db --tail 50 > /tmp/coolify-db-logs.txt

# Database state
docker exec -i coolify-db psql -U coolify -d coolify << 'EOF' > /tmp/coolify-db-state.txt
\dt
SELECT * FROM servers;
SELECT id, name FROM private_keys;
EOF
```

Then share these files when asking for help on Coolify Discord/GitHub.

## Next Steps After Fix

Once "This machine" works:

1. **Verify the server is connected** - You should see a green indicator
2. **Test deployment** - Try deploying a simple Docker container
3. **Deploy Juda** - Create a new project and deploy your Juda app

## Juda Deployment on Coolify

Once the server is working, deploy Juda:

1. **Create new project** in Coolify
2. **Add resource** → Docker Image or Dockerfile
3. **Configure:**
   - Repository: Your Juda repo
   - Build pack: Dockerfile
   - Environment variables:
     ```
     DATABASE_URL=postgresql://juda:npg_rRL8wNEVsqH4@juda-postgres:5432/juda
     NEXT_PUBLIC_APP_URL=http://192.168.1.133:3000
     NODE_ENV=production
     ```
4. **Deploy!**
