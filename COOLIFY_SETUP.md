# Coolify Setup Guide for Unraid

## Current Status

✅ Coolify is installed and running on Unraid at `http://192.168.1.133:8001`
✅ Account created
❌ "This machine" button shows "The payload is invalid" error

## Problem

The error occurs because Coolify needs a valid SSH key to connect to localhost (the Unraid server itself). During setup, we inserted a placeholder key which doesn't work.

## Solution

Run the fix script directly on your Unraid server to generate and configure proper SSH keys.

### Step 1: SSH into Unraid

```bash
ssh root@192.168.1.133
```

### Step 2: Run the fix commands

Copy and paste these commands into your Unraid terminal:

```bash
# Generate SSH key pair
ssh-keygen -t ed25519 -f /root/.ssh/coolify_localhost -N "" -C "coolify-localhost"

# Add public key to authorized_keys
cat /root/.ssh/coolify_localhost.pub >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys

# Update the private key in Coolify database
PRIVATE_KEY=$(cat /root/.ssh/coolify_localhost | sed "s/'/''/g")

docker exec -i coolify-db psql -U coolify -d coolify << EOF
UPDATE private_keys
SET private_key = E'$PRIVATE_KEY',
    name = 'localhost-key',
    description = 'SSH key for localhost server'
WHERE id = 0;
EOF

# Restart Coolify
docker restart coolify

# Wait for it to be healthy
sleep 30
```

### Step 3: Test

1. Go to `http://192.168.1.133:8001`
2. Click on "This machine" button
3. It should now work!

## Coolify Access Details

- **URL**: `http://192.168.1.133:8001`
- **Username**: `admin`
- **Email**: `your-email@example.com`
- **Password**: `JsiFtJNb5ifzOrWkg8AlayELQ` (from your .env file)

## Useful Commands

### Check Coolify status

```bash
docker ps | grep coolify
```

### View Coolify logs

```bash
docker logs coolify --tail 100
```

### Restart Coolify

```bash
docker restart coolify
```

### Access Coolify database

```bash
docker exec -it coolify-db psql -U coolify -d coolify
```

## Next Steps: Deploy Juda

Once "This machine" is working, you can deploy your Juda app:

1. In Coolify, create a new project
2. Add a new resource (Docker Compose or Dockerfile)
3. Connect to your GitHub repo or upload the code
4. Configure environment variables:
   - `DATABASE_URL=postgresql://juda:npg_rRL8wNEVsqH4@juda-postgres:5432/juda`
   - `NEXT_PUBLIC_APP_URL=http://192.168.1.133:3000`
   - `NODE_ENV=production`
5. Deploy!

## Troubleshooting

### "This machine" still shows error

Check Coolify logs:

```bash
docker logs coolify --tail 100
```

### Can't connect to Coolify web interface

Check if it's running:

```bash
docker ps | grep coolify
```

Should show:

```
coolify    Up X minutes (healthy)    0.0.0.0:8001->8080/tcp
```

### Database connection issues

Check if all containers are healthy:

```bash
docker ps | grep coolify
```

All should show "(healthy)" status.

## Environment Files Location

- Main env file: `/mnt/user/appdata/coolify/.env`
- Source env file: `/data/coolify/source/.env`
- Docker compose files: `/mnt/user/appdata/coolify/`

## Container Names

- `coolify` - Main application
- `coolify-db` - PostgreSQL database
- `coolify-redis` - Redis cache
- `coolify-realtime` - Soketi realtime server
