# Coolify "This Machine" Quick Fix

## The Problem

You're getting "The payload is invalid" error when clicking "This machine" in Coolify.

## Why It's Happening

The fix script needs to run **on the Unraid server** (where Coolify is installed), not on your Mac.

## The Solution

### Step 1: SSH into your Unraid server

Open Terminal on your Mac and run:

```bash
ssh root@192.168.1.133
```

### Step 2: Copy and paste these commands

Once you're logged into Unraid, copy and paste ALL of these commands at once:

```bash
# Create .ssh directory
mkdir -p /root/.ssh
chmod 700 /root/.ssh

# Generate SSH key
ssh-keygen -t ed25519 -f /root/.ssh/coolify_localhost -N "" -C "coolify-localhost"

# Add to authorized_keys
cat /root/.ssh/coolify_localhost.pub >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys

# Test SSH
ssh -i /root/.ssh/coolify_localhost -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@localhost "echo 'SSH works'" 2>/dev/null

# Store private key in variable
PRIVATE_KEY=$(cat /root/.ssh/coolify_localhost)

# Clean database
docker exec -i coolify-db psql -U coolify -d coolify << 'EOF'
DELETE FROM servers WHERE id = 0;
DELETE FROM private_keys WHERE id = 0;
EOF

# Insert private key
docker exec -i coolify-db psql -U coolify -d coolify << EOF
INSERT INTO private_keys (id, uuid, name, description, private_key, team_id, created_at, updated_at)
VALUES (0, gen_random_uuid(), 'localhost-key', 'SSH key for localhost', '$PRIVATE_KEY', 0, NOW(), NOW());
EOF

# Insert server
docker exec -i coolify-db psql -U coolify -d coolify << 'EOF'
INSERT INTO servers (id, uuid, name, description, ip, port, "user", team_id, private_key_id, created_at, updated_at)
VALUES (0, gen_random_uuid(), 'localhost', 'This server', 'host.docker.internal', 22, 'root', 0, 0, NOW(), NOW());
EOF

# Restart Coolify
docker restart coolify && sleep 30
```

### Step 3: Test

1. Go to `http://192.168.1.133:8001`
2. Click "This machine" button
3. It should work now!

## If It Still Doesn't Work

Check the Coolify logs on your Unraid server:

```bash
docker logs coolify --tail 50
```

Look for any errors related to SSH or server validation.

## Alternative: Skip "This Machine" Button

If the button still doesn't work, you can add the server manually:

1. In Coolify, go to **Settings** → **Servers**
2. Click **Add Server** (instead of "This machine")
3. Fill in:
   - **Name**: `localhost`
   - **IP**: `host.docker.internal`
   - **Port**: `22`
   - **User**: `root`
   - **Private Key**: Copy the content from `/root/.ssh/coolify_localhost` on Unraid

## Your Coolify Credentials

- **URL**: http://192.168.1.133:8001
- **Username**: admin
- **Email**: your-email@example.com
- **Password**: JsiFtJNb5ifzOrWkg8AlayELQ

## Next Steps

Once the server is connected, you can deploy your Juda app through Coolify!
