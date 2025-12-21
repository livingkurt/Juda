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

Vercel offers database providers through their Storage marketplace. Here are the recommended options:

### Option A: Neon (Recommended - Free Tier Available)

1. Go to your Vercel dashboard
2. Navigate to your project → **Storage** tab
3. Click **"Create"** on the **Neon** card
4. Follow the prompts to create your database
5. Vercel will automatically create environment variables:
   - `POSTGRES_URL`
   - `POSTGRES_URL_NON_POOLING`

### Option B: Other Marketplace Providers

You can also use:

- **Supabase** - Postgres backend (free tier available)
- **PlanetScale** - MySQL-compatible serverless database
- **AWS** - Serverless PostgreSQL

All marketplace providers will automatically create environment variables in your Vercel project.

### Option C: External PostgreSQL Database

You can use any external PostgreSQL provider:

- **Railway**: [railway.app](https://railway.app)
- **Render**: [render.com](https://render.com)

For external databases, you'll need to manually create a connection string in this format:

```
postgresql://user:password@host:port/database?schema=public
```

## Step 3: Prepare Your Database Schema

Your database schema is defined in `lib/schema.js` using Drizzle ORM. The build process will automatically push the schema to your database during deployment.

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
2. You should see environment variables automatically created by your database provider (like `POSTGRES_PRISMA_URL`)

3. Add the following environment variables:

   **If using Neon (Vercel Marketplace):**
   - Name: `DATABASE_URL`
   - Value: Copy the value from `POSTGRES_PRISMA_URL` (Vercel's default name for the pooled connection URL)
   - Environment: Production, Preview, Development (select all)
   - Click **Save**

   **If using other Vercel Marketplace providers (Supabase, etc.):**
   - Name: `DATABASE_URL`
   - Value: Copy the value from `POSTGRES_PRISMA_URL` (Vercel's default name for the pooled connection URL)
   - Environment: Production, Preview, Development (select all)
   - Click **Save**

   **If using external database:**
   - Name: `DATABASE_URL`
   - Value: Your PostgreSQL connection string
   - Environment: Production, Preview, Development (select all)
   - Click **Save**

**Note:** Drizzle ORM uses `DATABASE_URL` for all database operations including schema pushes.

## Step 6: Database Schema Push

The build process automatically pushes your database schema using Drizzle. No manual migration steps are required!

If you need to manually push the schema:

### Via Vercel CLI

```bash
vercel env pull .env.local
npm run db:push
```

### Via Local Environment

```bash
DATABASE_URL="your-production-database-url" npm run db:push
```

### View Your Database

You can use Drizzle Studio to view and edit your production data:

```bash
vercel env pull .env.local
npm run db:studio
```

## Step 7: Verify Deployment

1. Visit your deployment URL (provided by Vercel)
2. Test creating a task, section, and backlog item
3. Check that data persists after refresh

## Troubleshooting

### Database Connection Issues

- Verify `DATABASE_URL` is set correctly in Vercel environment variables
- Check that your database allows connections from Vercel's IP addresses
- For external databases, ensure SSL is enabled (add `?sslmode=require` to connection string)

### Schema Push Errors

- Ensure `lib/schema.js` is committed to your repository
- Run `npm run db:push` manually if schema push fails during build
- Check Vercel build logs for specific error messages

### Build Failures

- Check that all dependencies are in `package.json`
- Verify Node.js version compatibility (Vercel uses Node 18+ by default)
- Review build logs in Vercel dashboard for specific errors

## Updating Your Deployment

After making changes:

1. Commit and push to your repository
2. Vercel will automatically trigger a new deployment
3. Schema changes will be pushed automatically during the build process

## Production Considerations

- **Database Backups**: Set up regular backups for your production database
- **Environment Variables**: Never commit `.env` files to your repository
- **Monitoring**: Use Vercel Analytics to monitor your app's performance
- **Custom Domain**: Add a custom domain in Vercel project settings

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
