#!/bin/bash

# Script to set up proper SSH keys for Coolify on Unraid
# This fixes the "payload is invalid" error when using "This machine"

echo "🔑 Setting up Coolify SSH keys for localhost..."

# SSH into Unraid and execute the setup
ssh root@192.168.1.133 << 'ENDSSH'

# Generate SSH key pair if it doesn't exist
if [ ! -f /root/.ssh/coolify_localhost ]; then
    echo "Generating new SSH key pair..."
    ssh-keygen -t ed25519 -f /root/.ssh/coolify_localhost -N "" -C "coolify-localhost"
fi

# Add the public key to authorized_keys
echo "Adding public key to authorized_keys..."
cat /root/.ssh/coolify_localhost.pub >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys

# Read the private key
PRIVATE_KEY=$(cat /root/.ssh/coolify_localhost)

# Update the private key in the database
echo "Updating private key in Coolify database..."
docker exec -i coolify-db psql -U coolify -d coolify << EOF
UPDATE private_keys
SET private_key = '$PRIVATE_KEY',
    name = 'localhost-key',
    description = 'SSH key for localhost server'
WHERE id = 0;
EOF

echo "✅ SSH key setup complete!"
echo ""
echo "Private key has been updated in the database."
echo "Now restart Coolify to apply changes..."

# Restart Coolify
docker restart coolify

echo "✅ Coolify restarted. Please wait 30 seconds for it to be healthy."
sleep 30

echo "✅ Setup complete! Try clicking 'This machine' again."

ENDSSH
