# Juda Self-Hosting on Unraid - Deployment Guide

This guide walks you through deploying Juda on your Unraid server. All code changes have been made in the repository - this document covers the **manual steps you need to perform on your Unraid server**.

## Prerequisites

- Unraid server with Docker support
- SSH access to your Unraid server (or use the terminal in Unraid web UI)
- Your Unraid server's IP address or domain name
- A strong password for your PostgreSQL database

## Step 1: Set Up PostgreSQL Container

1. **Open Unraid Docker Interface**
   - Navigate to the Docker tab in Unraid

2. **Add Container**
   - Click "Add Container"
   - Use the following settings:

   **Container Name:** `juda-postgres`

   **Repository:** `postgres:16-alpine`

   **Port Mappings:**
   - Container Port: `5432`
   - Host Port: `5432`
   - Connection Type: `TCP`

   **Volume Mappings:**
   - Container Path: `/var/lib/postgresql/data`
   - Host Path: `/mnt/user/appdata/juda-postgres`
   - Access Mode: `Read/Write`

   **Environment Variables:**
   - `POSTGRES_USER`: `juda`
   - `POSTGRES_PASSWORD`: `[choose a strong password - save this!]`
   - `POSTGRES_DB`: `juda`

3. **Start the Container**
   - Click "Apply" to create and start the container
   - Wait for it to fully start (check logs to confirm)

## Step 2: Build and Transfer Docker Image

You have two options for getting the Juda app image onto Unraid:

### Option A: Automated Deployment Script (Recommended)

The easiest way is to use the automated deployment script:

1. **Add environment variables to `.env` or `.env.local`:**

```bash
UNRAID_HOST=192.168.1.133
UNRAID_POSTGRES_PASSWORD=your-secure-password
UNRAID_SSH_USER=root
UNRAID_APP_URL=http://192.168.1.133:3000  # Optional, defaults to http://[UNRAID_HOST]:3000
```

2. **Run the deployment script:**

```bash
npm run deploy
```

This will automatically:

- Build the Docker image for linux/amd64 platform
- Save it to a tar file
- Transfer it to Unraid via scp
- Load it on Unraid
- Stop and remove old container (if exists)
- Create and start new container with proper configuration
- Clean up temporary files

**Note:** Make sure you have SSH access configured to your Unraid server (password or SSH key).

### Option A2: GitHub Actions CI/CD (Recommended for Production)

For automatic deployments on every push to GitHub:

1. **Set up SSH key** (see `.github/workflows/README.md` for detailed instructions)
2. **Add GitHub Secrets** (Settings → Secrets → Actions):
   - `UNRAID_HOST`: Your Unraid IP
   - `UNRAID_SSH_USER`: SSH username (usually `root`)
   - `UNRAID_SSH_KEY`: Your private SSH key
   - `UNRAID_POSTGRES_PASSWORD`: PostgreSQL password
   - `UNRAID_APP_URL`: App URL

3. **Push to `main` branch** - deployment happens automatically!

See `.github/workflows/README.md` for complete setup instructions.

### Option B: Manual Build and Transfer

1. **On your development machine**, navigate to the Juda project directory:

```bash
cd /path/to/juda
```

2. **Build the Docker image** (replace placeholders with your actual values):

```bash
docker build \
  --platform linux/amd64 \
  --build-arg DATABASE_URL="postgresql://juda:[YOUR-PASSWORD]@[UNRAID-IP]:5432/juda" \
  --build-arg NEXT_PUBLIC_APP_URL="http://[UNRAID-IP]:3000" \
  -t juda-app .
```

**Important:** The `--platform linux/amd64` flag ensures the image is built for x86_64 architecture (required for Unraid), even if you're building on an Apple Silicon Mac (ARM64).

**Note:** The build process skips database migrations (database not available during build). Migrations will run automatically when the container starts.

**Important:** Replace:

- `[YOUR-PASSWORD]` with the PostgreSQL password you set in Step 1
- `[UNRAID-IP]` with your Unraid server's IP address (e.g., `192.168.1.100`)

3. **Save the image to a tar file**:

```bash
docker save juda-app > juda-app.tar
```

4. **Transfer to Unraid** (choose one method):

   **Method 1: Using SCP (from your dev machine):**

   ```bash
   scp juda-app.tar root@[UNRAID-IP]:/tmp/
   ```

   **Method 2: Using Unraid Web UI:**
   - Use the Unraid file manager to copy `juda-app.tar` to `/tmp/` on your Unraid server

5. **On Unraid, load the image**:

   SSH into Unraid or use the terminal:

   ```bash
   docker load < /tmp/juda-app.tar
   ```

### Option B: Use Docker Hub or GitHub Container Registry

1. **Build and tag the image**:

```bash
docker build \
  --build-arg DATABASE_URL="postgresql://juda:[PASSWORD]@[UNRAID-IP]:5432/juda" \
  --build-arg NEXT_PUBLIC_APP_URL="http://[UNRAID-IP]:3000" \
  -t yourusername/juda-app:latest .
```

2. **Push to registry**:

```bash
docker login
docker push yourusername/juda-app:latest
```

3. **On Unraid**, use `yourusername/juda-app:latest` as the repository name in Step 3.

## Step 3: Set Up Juda Application Container

1. **In Unraid Docker Interface**, click "Add Container"

2. **Configure the container:**

   **Container Name:** `juda-app`

   **Repository:**
   - If using Option A: `juda-app`
   - If using Option B: `yourusername/juda-app:latest`

   **Port Mappings:**
   - Container Port: `3000`
   - Host Port: `3000`
   - Connection Type: `TCP`

   **Environment Variables:**
   - `DATABASE_URL`: `postgresql://juda:[YOUR-PASSWORD]@juda-postgres:5432/juda`
     - **Important:** Use `juda-postgres` as the hostname (Docker internal networking)
   - `NEXT_PUBLIC_APP_URL`: `http://[YOUR-DOMAIN-OR-IP]:3000`
     - Replace with your actual domain or IP address
   - `NODE_ENV`: `production`

   **Network Type:**
   - Use `Bridge` mode (default) - this allows containers to communicate via container names

3. **Start the Container**
   - Click "Apply" to create and start the container
   - The container will automatically run migrations on startup

## Step 4: Verify Deployment

1. **Check Container Logs:**
   - In Unraid Docker interface, click on `juda-app` container
   - Click "Logs" to verify:
     - Migrations ran successfully
     - Server started on port 3000
     - No errors

2. **Access the Application:**
   - Open your browser and navigate to: `http://[UNRAID-IP]:3000`
   - You should see the Juda application

3. **Test Database Connection:**
   - Try creating a task or user account
   - Verify data persists after refresh

## Step 5: Migrate Data from Neon (Optional)

If you have existing data in Neon that you want to migrate:

1. **Export from Neon** (on your dev machine):

```bash
# Install pg_dump if needed (macOS: brew install postgresql)
pg_dump "[YOUR-NEON-CONNECTION-STRING]" > juda-backup.sql
```

2. **Transfer to Unraid:**

```bash
scp juda-backup.sql root@[UNRAID-IP]:/tmp/
```

3. **Import to Unraid PostgreSQL:**

SSH into Unraid or use terminal:

```bash
docker exec -i juda-postgres psql -U juda -d juda < /tmp/juda-backup.sql
```

4. **Verify Import:**
   - Check the Juda app - your data should be visible
   - Verify tasks, users, and other data migrated correctly

## Step 6: Set Up Reverse Proxy (Optional but Recommended)

If you want to access Juda via a domain name with SSL:

### Using Nginx Proxy Manager (if installed on Unraid)

1. **Add Proxy Host:**
   - Domain: `juda.yourdomain.com`
   - Forward Hostname/IP: `juda-app`
   - Forward Port: `3000`
   - Forward Scheme: `http`
   - SSL Certificate: Request Let's Encrypt certificate

2. **Update Environment Variable:**
   - Edit `juda-app` container
   - Update `NEXT_PUBLIC_APP_URL` to: `https://juda.yourdomain.com`
   - Restart container

### Using Traefik (if installed on Unraid)

Add labels to the `juda-app` container:

- `traefik.enable=true`
- `traefik.http.routers.juda.rule=Host(\`juda.yourdomain.com\`)`
- `traefik.http.routers.juda.entrypoints=websecure`
- `traefik.http.routers.juda.tls.certresolver=letsencrypt`

## Step 7: Set Up Automated Backups (Recommended)

Create a backup script for your PostgreSQL database:

1. **Create backup script** on Unraid (`/boot/config/scripts/juda-backup.sh`):

```bash
#!/bin/bash
BACKUP_DIR="/mnt/user/appdata/juda-backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/juda-backup-$DATE.sql"

mkdir -p "$BACKUP_DIR"

docker exec juda-postgres pg_dump -U juda juda > "$BACKUP_FILE"

# Keep only last 30 days of backups
find "$BACKUP_DIR" -name "juda-backup-*.sql" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE"
```

2. **Make it executable:**

```bash
chmod +x /boot/config/scripts/juda-backup.sh
```

3. **Schedule with User Scripts plugin** (if installed):
   - Add script: `/boot/config/scripts/juda-backup.sh`
   - Schedule: Daily at 2 AM

## Troubleshooting

### Container Won't Start

1. **Check logs:**

   ```bash
   docker logs juda-app
   ```

2. **Common issues:**
   - **Database connection error:** Verify `DATABASE_URL` uses `juda-postgres` as hostname (not `localhost`)
   - **Migration errors:** Check that PostgreSQL container is running and accessible
   - **Port conflicts:** Ensure port 3000 isn't used by another container

### Database Connection Issues

1. **Verify PostgreSQL is running:**

   ```bash
   docker ps | grep juda-postgres
   ```

2. **Test connection from juda-app container:**
   ```bash
   docker exec -it juda-app sh
   # Inside container:
   apk add postgresql-client
   psql $DATABASE_URL -c "SELECT 1;"
   ```

### Application Not Accessible

1. **Check firewall:** Ensure port 3000 is open on Unraid
2. **Verify port mapping:** Check Docker container port settings
3. **Check logs:** Look for startup errors in container logs

### Migration Issues

If migrations fail on startup, you can run them manually:

```bash
docker exec -it juda-app npm run db:migrate
```

## Updating Juda

When you want to update Juda to a new version:

1. **Pull latest code** on your dev machine
2. **Rebuild Docker image** (follow Step 2)
3. **Stop the container** in Unraid: `juda-app` → Stop
4. **Remove old container** (optional - Unraid will replace it)
5. **Load new image** (if using Option A) or pull from registry (if using Option B)
6. **Recreate container** with same settings
7. **Start container** - migrations will run automatically

## Security Considerations

1. **Change default PostgreSQL password** - Use a strong, unique password
2. **Use reverse proxy with SSL** - Don't expose Juda directly to the internet without encryption
3. **Firewall rules** - Only expose necessary ports (3000 or reverse proxy port)
4. **Regular backups** - Set up automated backups (see Step 7)
5. **Keep containers updated** - Regularly update base images for security patches

## Cost Savings

By self-hosting on Unraid, you'll save:

- **Vercel costs:** $0/month (was ~$20/month for Pro)
- **Neon costs:** $0/month (was ~$19/month for database)
- **Total savings:** ~$39/month + unlimited usage

You'll have:

- ✅ Unlimited database size
- ✅ No bandwidth limits
- ✅ Full control over backups
- ✅ Better privacy (all data stays local)
- ✅ No vendor lock-in

## Next Steps

- [ ] Set up PostgreSQL container
- [ ] Build and transfer Docker image
- [ ] Configure Juda application container
- [ ] Test application access
- [ ] Migrate data from Neon (if applicable)
- [ ] Set up reverse proxy (optional)
- [ ] Configure automated backups
- [ ] Update DNS/firewall rules

## Support

If you encounter issues:

1. Check container logs first
2. Verify all environment variables are set correctly
3. Ensure containers can communicate (same Docker network)
4. Review this guide for common troubleshooting steps
