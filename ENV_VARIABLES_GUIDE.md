# Environment Variables Guide for Unraid Deployment

## Required Variables (for `npm run deploy`)

Add these to your `.env` or `.env.local` file:

### `UNRAID_HOST`

**What it is:** Your Unraid server's IP address or hostname

**Example:**

```bash
UNRAID_HOST=192.168.1.133
```

**How to find it:**

- Check your Unraid web interface URL (usually `http://192.168.1.X`)
- Or run `ip addr` on your Unraid server

---

### `UNRAID_POSTGRES_PASSWORD`

**What it is:** The password you set for the PostgreSQL database when creating the `juda-postgres` container in Unraid

**Example:**

```bash
UNRAID_POSTGRES_PASSWORD=my-secure-password-123
```

**Important:**

- This is NOT your Neon database password
- This is the password you set in Step 1 of the Unraid deployment (when creating the `juda-postgres` container)
- If you forgot it, you'll need to recreate the PostgreSQL container or check your Unraid Docker settings

**How to find it:**

- Go to Unraid Docker interface
- Click on `juda-postgres` container
- Check the `POSTGRES_PASSWORD` environment variable

---

## Optional Variables (have defaults)

### `UNRAID_SSH_USER`

**What it is:** SSH username for connecting to Unraid

**Default:** `root`

**Example:**

```bash
UNRAID_SSH_USER=root
```

**When to change:** Only if you've set up a different SSH user on Unraid (uncommon)

---

### `UNRAID_APP_URL`

**What it is:** The public URL where your Juda app will be accessible

**Default:** `http://[UNRAID_HOST]:3000`

**Example:**

```bash
UNRAID_APP_URL=http://192.168.1.133:3000
```

**When to change:**

- If you're using a reverse proxy (e.g., `https://juda.yourdomain.com`)
- If you're using a different port
- If you want to use a domain name instead of IP

**Important:** Don't add comments on the same line! Use separate lines for comments.

---

### `UNRAID_SSH_KEY` (Optional but Recommended)

**What it is:** Path to your SSH private key file for passwordless authentication

**Default:** Not set (will prompt for password each time)

**Example:**

```bash
UNRAID_SSH_KEY=~/.ssh/unraid_deploy
```

**Why use it:**

- Avoids entering password 5+ times during deployment
- More secure than password authentication
- Required for GitHub Actions CI/CD

**How to set up:**

1. **Generate SSH key pair** (if you don't have one):

   ```bash
   ssh-keygen -t ed25519 -C "unraid-deploy" -f ~/.ssh/unraid_deploy
   ```

   Press Enter when asked for passphrase (leave it empty for automation)

2. **Copy public key to Unraid:**

   ```bash
   ssh-copy-id -i ~/.ssh/unraid_deploy.pub root@192.168.1.133
   ```

   Or manually:

   ```bash
   # Copy the public key
   cat ~/.ssh/unraid_deploy.pub

   # SSH into Unraid and add it
   ssh root@192.168.1.133
   mkdir -p ~/.ssh
   echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   chmod 700 ~/.ssh
   exit
   ```

3. **Test passwordless login:**

   ```bash
   ssh -i ~/.ssh/unraid_deploy root@192.168.1.133
   ```

   If this works without asking for password, you're good!

4. **Add to `.env`:**

   ```bash
   UNRAID_SSH_KEY=~/.ssh/unraid_deploy
   ```

---

### `UNRAID_CONTAINER_NAME`

**What it is:** Name of the Docker container on Unraid

**Default:** `juda-app`

**Example:**

```bash
UNRAID_CONTAINER_NAME=juda-app
```

**When to change:** Only if you want a different container name (usually not needed)

---

### `UNRAID_IMAGE_NAME`

**What it is:** Name of the Docker image

**Default:** `juda-app`

**Example:**

```bash
UNRAID_IMAGE_NAME=juda-app
```

**When to change:** Only if you want a different image name (usually not needed)

---

## Complete Example `.env` File

Here's a complete example with all Unraid-related variables:

```bash
# Your existing database variables (for local development)
DATABASE_URL="postgresql://postgres:1234@localhost:5432/judaDB?schema=public"

# Unraid Deployment Variables
UNRAID_HOST=192.168.1.133
UNRAID_POSTGRES_PASSWORD=your-unraid-postgres-password-here
UNRAID_SSH_USER=root
UNRAID_APP_URL=http://192.168.1.133:3000

# Optional (only if you need different names)
# UNRAID_CONTAINER_NAME=juda-app
# UNRAID_IMAGE_NAME=juda-app
```

---

## For GitHub Actions CI/CD

If you're using GitHub Actions, you need to add these as **GitHub Secrets** (not in `.env`):

1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions → New repository secret
3. Add each of these:

| Secret Name                | Value                | Example                            |
| -------------------------- | -------------------- | ---------------------------------- |
| `UNRAID_HOST`              | Your Unraid IP       | `192.168.1.133`                    |
| `UNRAID_SSH_USER`          | SSH username         | `root`                             |
| `UNRAID_SSH_KEY`           | Your private SSH key | Contents of `~/.ssh/unraid_deploy` |
| `UNRAID_SSH_PORT`          | SSH port (optional)  | `22`                               |
| `UNRAID_POSTGRES_PASSWORD` | PostgreSQL password  | `your-password`                    |
| `UNRAID_APP_URL`           | App URL              | `http://192.168.1.133:3000`        |

---

## Quick Checklist

Before running `npm run deploy`, make sure you have:

- [ ] `UNRAID_HOST` - Your Unraid server IP
- [ ] `UNRAID_POSTGRES_PASSWORD` - Password from your `juda-postgres` container
- [ ] SSH access working: `ssh root@192.168.1.133` (or your IP)
- [ ] `juda-postgres` container running on Unraid

---

## Troubleshooting

**"UNRAID_HOST not set" error:**

- Add `UNRAID_HOST=192.168.1.133` to your `.env` file

**"UNRAID_POSTGRES_PASSWORD not set" error:**

- Add `UNRAID_POSTGRES_PASSWORD=your-password` to your `.env` file
- Make sure it's the password from your Unraid PostgreSQL container, not Neon

**SSH connection fails:**

- Make sure SSH is enabled on Unraid (Settings → Management Access)
- Test manually: `ssh root@192.168.1.133`
- If using SSH keys, make sure your key is added to Unraid
