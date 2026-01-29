#!/bin/bash

# Complete fix for Coolify "This machine" setup
# Run this script DIRECTLY on your Unraid server
#
# This script will:
# 1. Generate proper SSH keys
# 2. Set up SSH access to localhost
# 3. Properly configure the server entry in Coolify database
# 4. Test the connection

echo "🔧 Coolify Complete Fix Script"
echo "================================"
echo ""

# Step 1: Generate SSH key pair
echo "📝 Step 1: Setting up SSH keys..."
if [ ! -f /root/.ssh/coolify_localhost ]; then
    ssh-keygen -t ed25519 -f /root/.ssh/coolify_localhost -N "" -C "coolify-localhost"
    echo "✅ SSH key pair generated"
else
    echo "✅ SSH key pair already exists"
fi

# Add the public key to authorized_keys (avoid duplicates)
if ! grep -q "coolify-localhost" /root/.ssh/authorized_keys 2>/dev/null; then
    cat /root/.ssh/coolify_localhost.pub >> /root/.ssh/authorized_keys
    echo "✅ Public key added to authorized_keys"
else
    echo "✅ Public key already in authorized_keys"
fi
chmod 600 /root/.ssh/authorized_keys

# Step 2: Test SSH connection to localhost
echo ""
echo "📝 Step 2: Testing SSH connection to localhost..."
ssh -i /root/.ssh/coolify_localhost -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@localhost "echo 'SSH connection successful'" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ SSH connection to localhost works!"
else
    echo "⚠️  SSH connection test had issues, but continuing..."
fi

# Step 3: Read and prepare the private key for database
echo ""
echo "📝 Step 3: Preparing private key for database..."
PRIVATE_KEY=$(cat /root/.ssh/coolify_localhost)

# Step 4: Update Coolify database
echo ""
echo "📝 Step 4: Updating Coolify database..."

# First, let's clean up any existing entries and start fresh
docker exec -i coolify-db psql -U coolify -d coolify << 'EOF'
-- Delete existing server and private key entries for localhost
DELETE FROM servers WHERE id = 0;
DELETE FROM private_keys WHERE id = 0;
EOF

# Now insert the private key
docker exec -i coolify-db psql -U coolify -d coolify << EOF
-- Insert the private key
INSERT INTO private_keys (id, uuid, name, description, private_key, team_id, created_at, updated_at)
VALUES (
    0,
    gen_random_uuid(),
    'localhost-key',
    'SSH key for localhost server',
    '$PRIVATE_KEY',
    0,
    NOW(),
    NOW()
);
EOF

if [ $? -ne 0 ]; then
    echo "❌ Failed to insert private key"
    exit 1
fi
echo "✅ Private key inserted"

# Insert the server entry
docker exec -i coolify-db psql -U coolify -d coolify << 'EOF'
-- Insert the server entry
INSERT INTO servers (
    id,
    uuid,
    name,
    description,
    ip,
    port,
    "user",
    team_id,
    private_key_id,
    created_at,
    updated_at
)
VALUES (
    0,
    gen_random_uuid(),
    'localhost',
    'This server (Unraid)',
    'host.docker.internal',
    22,
    'root',
    0,
    0,
    NOW(),
    NOW()
);
EOF

if [ $? -ne 0 ]; then
    echo "❌ Failed to insert server entry"
    exit 1
fi
echo "✅ Server entry inserted"

# Step 5: Verify the entries
echo ""
echo "📝 Step 5: Verifying database entries..."
docker exec -i coolify-db psql -U coolify -d coolify << 'EOF'
SELECT id, name, ip, port, "user" FROM servers WHERE id = 0;
SELECT id, name FROM private_keys WHERE id = 0;
EOF

# Step 6: Restart Coolify
echo ""
echo "📝 Step 6: Restarting Coolify..."
docker restart coolify > /dev/null 2>&1

echo "⏳ Waiting 35 seconds for Coolify to fully restart..."
sleep 35

# Check if Coolify is healthy
echo ""
if docker ps | grep -E "coolify\s" | grep -q "healthy"; then
    echo "✅ Coolify is healthy!"
else
    echo "⚠️  Coolify may still be starting. Check status with: docker ps | grep coolify"
fi

echo ""
echo "================================"
echo "✅ Setup Complete!"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Go to http://192.168.1.133:8001"
echo "2. Log in if needed"
echo "3. Click on 'This machine' button"
echo ""
echo "If you still get an error:"
echo "  - Check Coolify logs: docker logs coolify --tail 50"
echo "  - Verify containers are healthy: docker ps | grep coolify"
echo "  - Try refreshing the browser page"
echo ""
