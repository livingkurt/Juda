# Alternative: Skip "This Machine" Button

The "This machine" button might be buggy or have specific requirements. Let's add the server manually instead.

## Step 1: Get the Private Key

On your Unraid server, run:

```bash
cat /root/.ssh/coolify_localhost
```

Copy the entire output (including the `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----` lines).

## Step 2: Add Server Manually in Coolify

1. Go to `http://192.168.1.133:8001`
2. Log in with:
   - Email: `your-email@example.com`
   - Password: `JsiFtJNb5ifzOrWkg8AlayELQ`

3. **Skip the "This machine" button**

4. Look for **Servers** in the sidebar or settings

5. Click **"Add Server"** or **"New Server"**

6. Fill in the form:
   - **Name**: `localhost` or `unraid-server`
   - **Description**: `Unraid host server`
   - **IP Address**: Try these in order:
     - First try: `host.docker.internal`
     - If that fails: `172.17.0.1`
     - If that fails: `192.168.1.133`
   - **Port**: `22`
   - **User**: `root`
   - **Private Key**: Paste the key you copied in Step 1

7. Click **"Validate Connection"** or **"Test"** (if available)

8. Click **"Save"** or **"Add Server"**

## Step 3: Verify Connection

Once added, you should see the server in your servers list with a green status indicator showing it's connected.

## Alternative IP Addresses to Try

If `host.docker.internal` doesn't work, try these:

### Option 1: Docker Bridge IP
```bash
# On Unraid, find the Docker bridge IP:
docker network inspect bridge | grep Gateway
```

Usually it's `172.17.0.1`

### Option 2: Host IP
Use the actual Unraid IP: `192.168.1.133`

But you'll need to make sure SSH is accessible from Docker containers:

```bash
# On Unraid, check SSH config:
cat /etc/ssh/sshd_config | grep ListenAddress

# Should show:
# ListenAddress 0.0.0.0
# or no ListenAddress line (which means it listens on all interfaces)
```

## Troubleshooting

### If validation fails with "Connection refused":

Try adding the Docker bridge network to the Coolify container:

```bash
# On Unraid:
docker network connect bridge coolify
docker restart coolify
```

### If validation fails with "Permission denied":

The SSH key might not be properly formatted. Regenerate it:

```bash
# On Unraid:
rm -f /root/.ssh/coolify_localhost*
ssh-keygen -t rsa -b 4096 -f /root/.ssh/coolify_localhost -N "" -C "coolify"
cat /root/.ssh/coolify_localhost.pub >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys

# Then copy the new private key:
cat /root/.ssh/coolify_localhost
```

### If you can't find where to add servers:

Coolify's UI might require you to:
1. Create a **Project** first
2. Then add a **Server** to that project
3. Or go to **Settings** → **Servers**

## Why This Approach is Better

- **More control**: You can see exactly what's being configured
- **Better error messages**: The UI will tell you specifically what's wrong
- **Easier to troubleshoot**: You can test different IP addresses and settings
- **Bypasses the bug**: The "This machine" button might have a bug in this version

## Next Steps

Once the server is connected:

1. **Create a Project** for Juda
2. **Add a Resource** (Docker Compose or Dockerfile)
3. **Configure the deployment**:
   - Connect to your GitHub repo
   - Set environment variables
   - Configure build settings
4. **Deploy!**
