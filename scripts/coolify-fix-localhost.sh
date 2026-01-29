#!/bin/bash

# Script to fix Coolify "This machine" SSH connection
# Run this script DIRECTLY on your Unraid server (after SSHing in)
#
# Usage:
#   1. SSH into your Unraid server: ssh root@192.168.1.133
#   2. Copy this script to the server or run these commands manually
#   3. Execute the script

echo "🔑 Setting up Coolify SSH keys for localhost..."
echo ""

# Generate SSH key pair if it doesn't exist
if [ ! -f /root/.ssh/coolify_localhost ]; then
    echo "📝 Generating new SSH key pair..."
    ssh-keygen -t ed25519 -f /root/.ssh/coolify_localhost -N "" -C "coolify-localhost"
    echo "✅ SSH key pair generated"
else
    echo "✅ SSH key pair already exists"
fi

# Add the public key to authorized_keys
echo "📝 Adding public key to authorized_keys..."
cat /root/.ssh/coolify_localhost.pub >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
echo "✅ Public key added"

# Read the private key and escape it properly for SQL
PRIVATE_KEY=$(cat /root/.ssh/coolify_localhost | sed "s/'/''/g")

# Update the private key in the database
echo "📝 Updating private key in Coolify database..."
docker exec -i coolify-db psql -U coolify -d coolify << EOF
UPDATE private_keys
SET private_key = E'$PRIVATE_KEY',
    name = 'localhost-key',
    description = 'SSH key for localhost server'
WHERE id = 0;
EOF

if [ $? -eq 0 ]; then
    echo "✅ Private key updated in database"
else
    echo "❌ Failed to update private key in database"
    exit 1
fi

# Restart Coolify
echo "📝 Restarting Coolify..."
docker restart coolify > /dev/null 2>&1

echo "⏳ Waiting 30 seconds for Coolify to restart..."
sleep 30

# Check if Coolify is healthy
if docker ps | grep coolify | grep -q "healthy"; then
    echo "✅ Coolify is healthy!"
else
    echo "⚠️  Coolify may still be starting up. Check with: docker ps | grep coolify"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Go to http://192.168.1.133:8001"
echo "2. Click on 'This machine' button"
echo "3. It should now work without the 'payload is invalid' error"
echo ""
echo "If you still get an error, check Coolify logs with:"
echo "  docker logs coolify --tail 100"
