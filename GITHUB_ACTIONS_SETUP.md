# GitHub Actions Setup Guide

## ⚠️ Important: Don't Use Deploy Keys!

**Deploy Keys** are for GitHub to access external servers. For CI/CD, you need **GitHub Secrets** instead.

## Correct Setup Steps

### Step 1: Generate SSH Key Pair

On your local machine:

```bash
ssh-keygen -t ed25519 -C "github-actions-unraid" -f ~/.ssh/unraid_deploy
```

**Important:** When prompted for a passphrase, press Enter (leave it empty) - GitHub Actions needs passwordless keys.

### Step 2: Copy Public Key to Unraid

```bash
ssh-copy-id -i ~/.ssh/unraid_deploy.pub root@192.168.1.133
```

Or manually:

```bash
# Copy the public key
cat ~/.ssh/unraid_deploy.pub

# Then SSH into Unraid and add it
ssh root@192.168.1.133
mkdir -p ~/.ssh
echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
exit
```

### Step 3: Test SSH Connection

```bash
ssh -i ~/.ssh/unraid_deploy root@192.168.1.133
```

If this works without asking for a password, you're good!

### Step 4: Add GitHub Secrets (NOT Deploy Keys!)

1. Go to your GitHub repository: `https://github.com/livingkurt/Juda`
2. Click **Settings** (top right)
3. Click **Secrets and variables** → **Actions** (in left sidebar)
4. Click **New repository secret**

Add these secrets one by one:

#### Secret 1: `UNRAID_HOST`

- **Name:** `UNRAID_HOST`
- **Value:** `192.168.1.133`
- Click **Add secret**

#### Secret 2: `UNRAID_SSH_USER`

- **Name:** `UNRAID_SSH_USER`
- **Value:** `root`
- Click **Add secret**

#### Secret 3: `UNRAID_SSH_KEY` ⚠️ This is the PRIVATE key!

- **Name:** `UNRAID_SSH_KEY`
- **Value:** Copy the entire contents of `~/.ssh/unraid_deploy` (the **private** key file)
  ```bash
  cat ~/.ssh/unraid_deploy
  ```
- Copy everything including:
  ```
  -----BEGIN OPENSSH PRIVATE KEY-----
  [lots of text]
  -----END OPENSSH PRIVATE KEY-----
  ```
- Click **Add secret**

#### Secret 4: `UNRAID_POSTGRES_PASSWORD`

- **Name:** `UNRAID_POSTGRES_PASSWORD`
- **Value:** Your PostgreSQL password from Unraid (the one you set for `juda-postgres` container)
- Click **Add secret**

#### Secret 5: `UNRAID_APP_URL`

- **Name:** `UNRAID_APP_URL`
- **Value:** `http://192.168.1.133:3000`
- Click **Add secret**

#### Secret 6: `UNRAID_SSH_PORT` (Optional)

- **Name:** `UNRAID_SSH_PORT`
- **Value:** `22` (or your custom SSH port)
- Click **Add secret**

### Step 5: Verify Secrets Are Added

You should see all 6 secrets listed under "Repository secrets".

### Step 6: Test the Workflow

1. Make a small change and push to `main` branch:

   ```bash
   git add .
   git commit -m "Test deployment"
   git push
   ```

2. Go to **Actions** tab in GitHub
3. You should see "Deploy to Unraid" workflow running
4. Click on it to see the progress

## Troubleshooting

### "Key is invalid" Error

- You're in the wrong place! Use **Secrets and variables → Actions**, not **Deploy keys**
- Make sure you're copying the **private** key (starts with `-----BEGIN OPENSSH PRIVATE KEY-----`)

### SSH Connection Failed in Workflow

- Verify the public key is on Unraid: `cat ~/.ssh/authorized_keys` on Unraid
- Test locally: `ssh -i ~/.ssh/unraid_deploy root@192.168.1.133`
- Make sure SSH is enabled on Unraid (Settings → Management Access)

### Workflow Runs But Container Doesn't Start

- Check workflow logs in GitHub Actions
- SSH into Unraid and check: `docker logs juda-app`
- Verify PostgreSQL container is running: `docker ps | grep juda-postgres`

## Quick Reference

| What        | Where                             | Value                      |
| ----------- | --------------------------------- | -------------------------- |
| Public Key  | Unraid (`~/.ssh/authorized_keys`) | `~/.ssh/unraid_deploy.pub` |
| Private Key | GitHub Secret `UNRAID_SSH_KEY`    | `~/.ssh/unraid_deploy`     |
| Host        | GitHub Secret `UNRAID_HOST`       | `192.168.1.133`            |
| User        | GitHub Secret `UNRAID_SSH_USER`   | `root`                     |
