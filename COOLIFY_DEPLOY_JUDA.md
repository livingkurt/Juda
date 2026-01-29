# Deploy Juda App in Coolify

## Step 1: Fix Docker Socket Access (REQUIRED FIRST!)

Before you can deploy anything, Coolify needs access to Docker. Run this on your Unraid server:

```bash
cd /mnt/user/appdata/coolify

# Stop Coolify
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down

# Edit docker-compose.prod.yml
nano docker-compose.prod.yml
```

**Add this line** to the `volumes:` section under `coolify:`:

```yaml
coolify:
  volumes:
    # ... existing volumes ...
    - /var/run/docker.sock:/var/run/docker.sock # <-- ADD THIS LINE
```

**Save and exit** (Ctrl+X, Y, Enter)

**Restart Coolify:**

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Verify Docker access
docker exec coolify docker ps
```

If you see container listings, Docker access is working! ✅

## Step 2: Deploy Juda in Coolify

Now go back to Coolify UI (`http://192.168.1.133:8001`) and you should see the "New Resource" page.

### Option A: Deploy from Dockerfile (Recommended)

1. **Click "Dockerfile"** under "Docker Based" → "Applications"

2. **Fill in the form:**
   - **Name**: `juda-app`
   - **Description**: `Juda task management app`
   - **Dockerfile**: You have two options:

     **Option 1: Connect to GitHub**
     - Select "Git Repository"
     - Repository URL: Your Juda GitHub repo URL
     - Branch: `main` (or your branch)
     - Dockerfile Path: `Dockerfile`

     **Option 2: Upload Dockerfile**
     - Select "Upload Dockerfile"
     - Copy/paste the contents of your Dockerfile

3. **Environment Variables:**
   Add these:

   ```
   DATABASE_URL=postgresql://juda:npg_rRL8wNEVsqH4@juda-postgres:5432/juda
   NEXT_PUBLIC_APP_URL=http://192.168.1.133:3000
   NODE_ENV=production
   ```

4. **Ports:**
   - Container Port: `3000`
   - Public Port: `3000` (or whatever you want)

5. **Click "Deploy"**

### Option B: Deploy from Docker Compose

1. **Click "Docker Compose Empty"** under "Docker Based" → "Applications"

2. **Paste your docker-compose.yml** content

3. **Set environment variables** in the UI

4. **Deploy**

### Option C: Deploy Pre-built Docker Image

If you've already built the image locally:

1. **Click "Docker Image"** under "Docker Based" → "Applications"

2. **Image Name**: `juda-app:latest` (or your image name)

3. **Set environment variables**

4. **Deploy**

## Step 3: Set Up Database

Juda needs PostgreSQL. You can either:

### Option A: Use Existing PostgreSQL

If you already have PostgreSQL running on Unraid, just use that connection string.

### Option B: Deploy PostgreSQL in Coolify

1. Go back to "New Resource"
2. Click **"PostgreSQL"** under "Databases"
3. Configure:
   - Name: `juda-postgres`
   - Database: `juda`
   - User: `juda`
   - Password: `npg_rRL8wNEVsqH4` (or generate a new one)
4. Deploy

Then update your Juda app's `DATABASE_URL` to point to this database.

## Step 4: Run Database Migrations

After deploying Juda, you need to run migrations:

1. In Coolify, go to your Juda app
2. Find the **"Terminal"** or **"Execute Command"** option
3. Run:
   ```bash
   npx drizzle-kit migrate
   ```

## Troubleshooting

### "Cannot connect to Docker"

Make sure you added `/var/run/docker.sock:/var/run/docker.sock` to docker-compose.prod.yml and restarted Coolify.

### "Build failed"

Check the build logs in Coolify. Common issues:

- Missing environment variables
- Dockerfile syntax errors
- Network issues pulling base images

### "App won't start"

Check the app logs in Coolify. Common issues:

- Database connection errors (check DATABASE_URL)
- Port conflicts
- Missing environment variables

## Your Juda App Will Be Available At

Once deployed: `http://192.168.1.133:3000` (or whatever port you configured)

## Next Steps

1. ✅ Fix Docker socket access
2. ✅ Deploy Juda app
3. ✅ Set up database (if needed)
4. ✅ Run migrations
5. ✅ Access your app!
