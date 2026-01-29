# GitHub Actions Workflows

## Deploy to Unraid

This workflow automatically deploys Juda to your Unraid server when you push to the `main` or `master` branch.

### Setup Instructions

1. **Generate SSH Key Pair** (if you don't have one):

   ```bash
   ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/unraid_deploy
   ```

2. **Copy Public Key to Unraid**:

   ```bash
   ssh-copy-id -i ~/.ssh/unraid_deploy.pub root@[UNRAID-IP]
   ```

   Or manually add the public key (`~/.ssh/unraid_deploy.pub`) to Unraid:

   ```bash
   # On Unraid
   mkdir -p ~/.ssh
   echo "YOUR_PUBLIC_KEY" >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   ```

3. **Add GitHub Secrets**:

   Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

   Add these secrets:
   - `UNRAID_HOST`: Your Unraid server IP (e.g., `192.168.1.133`)
   - `UNRAID_SSH_USER`: SSH username (usually `root`)
   - `UNRAID_SSH_KEY`: Contents of your **private** key file (`~/.ssh/unraid_deploy`)
   - `UNRAID_SSH_PORT`: SSH port (optional, defaults to `22`)
   - `UNRAID_POSTGRES_PASSWORD`: PostgreSQL password for `juda-postgres` container
   - `UNRAID_APP_URL`: Public URL for your app (e.g., `http://192.168.1.133:3000`)

4. **Test the Workflow**:
   - Push to `main` branch, or
   - Go to Actions tab → "Deploy to Unraid" → "Run workflow"

### How It Works

1. On push to `main`/`master`, the workflow:
   - Checks out your code
   - Builds Docker image for `linux/amd64` platform
   - Saves image to tar file
   - Transfers to Unraid via SCP
   - Loads image on Unraid
   - Stops and removes old container
   - Creates and starts new container with proper configuration

### Troubleshooting

- **SSH Connection Failed**: Verify SSH key is correctly added to GitHub secrets and Unraid server
- **Container Won't Start**: Check workflow logs, then SSH into Unraid and run `docker logs juda-app`
- **Build Fails**: Ensure all required files are committed to the repository
