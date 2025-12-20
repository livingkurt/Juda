# Deployment Guide for Vercel

This guide will walk you through deploying your Next.js task manager app to Vercel.

## Prerequisites

1. A GitHub, GitLab, or Bitbucket account (for connecting your repository)
2. A Vercel account (sign up at [vercel.com](https://vercel.com))
3. A PostgreSQL database (you can use Vercel Postgres or an external provider)

## Step 1: Prepare Your Repository

1. Make sure your code is committed to a Git repository:
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push
```

## Step 2: Set Up a PostgreSQL Database

You have two options:

### Option A: Vercel Postgres (Recommended)

1. Go to your Vercel dashboard
2. Navigate to your project → Storage tab
3. Click "Create Database" → Select "Postgres"
4. Choose a name and region
5. Vercel will automatically create a `POSTGRES_PRISMA_URL` environment variable

### Option B: External PostgreSQL Database

You can use any PostgreSQL provider:
- **Neon** (free tier available): [neon.tech](https://neon.tech)
- **Supabase** (free tier available): [supabase.com](https://supabase.com)
- **Railway**: [railway.app](https://railway.app)
- **Render**: [render.com](https://render.com)

For external databases, you'll need to create a connection string in this format:
```
postgresql://user:password@host:port/database?schema=public
```

## Step 3: Create Initial Migration

Before deploying, create your initial database migration:

```bash
npx prisma migrate dev --name init
```

This will create a `prisma/migrations` folder. Make sure to commit this folder to your repository.

## Step 4: Deploy to Vercel

### Method 1: Via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your Git repository
4. Vercel will auto-detect Next.js
5. Configure your project:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

### Method 2: Via Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

Follow the prompts to link your project.

## Step 5: Configure Environment Variables

In your Vercel project dashboard:

1. Go to **Settings** → **Environment Variables**
2. Add the following environment variable:

   **If using Vercel Postgres:**
   - Name: `DATABASE_URL`
   - Value: Copy from `POSTGRES_PRISMA_URL` (Vercel creates this automatically)
   - Environment: Production, Preview, Development (select all)

   **If using external database:**
   - Name: `DATABASE_URL`
   - Value: Your PostgreSQL connection string
   - Environment: Production, Preview, Development (select all)

## Step 6: Run Database Migrations

After your first deployment, you need to run migrations. You can do this in two ways:

### Option A: Via Vercel CLI (Recommended)

```bash
vercel env pull .env.local
npx prisma migrate deploy
```

### Option B: Via Vercel Dashboard

1. Go to your project → Settings → Environment Variables
2. Copy your `DATABASE_URL`
3. Run migrations locally with the production database:
```bash
DATABASE_URL="your-production-database-url" npx prisma migrate deploy
```

**Note:** The build script already includes `prisma migrate deploy`, so migrations will run automatically on each deployment.

## Step 7: Verify Deployment

1. Visit your deployment URL (provided by Vercel)
2. Test creating a task, section, and backlog item
3. Check that data persists after refresh

## Troubleshooting

### Database Connection Issues

- Verify `DATABASE_URL` is set correctly in Vercel environment variables
- Check that your database allows connections from Vercel's IP addresses
- For external databases, ensure SSL is enabled (add `?sslmode=require` to connection string)

### Migration Errors

- Ensure `prisma/migrations` folder is committed to your repository
- Run `npx prisma migrate deploy` manually if migrations fail during build
- Check Vercel build logs for specific error messages

### Build Failures

- Check that all dependencies are in `package.json`
- Verify Node.js version compatibility (Vercel uses Node 18+ by default)
- Review build logs in Vercel dashboard for specific errors

## Updating Your Deployment

After making changes:

1. Commit and push to your repository
2. Vercel will automatically trigger a new deployment
3. Migrations will run automatically during the build process

## Production Considerations

- **Database Backups**: Set up regular backups for your production database
- **Environment Variables**: Never commit `.env` files to your repository
- **Monitoring**: Use Vercel Analytics to monitor your app's performance
- **Custom Domain**: Add a custom domain in Vercel project settings

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Prisma Deployment Guide](https://www.prisma.io/docs/guides/deployment)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

