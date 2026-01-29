# Quick Deployment Guide

## Local Deployment (npm run deploy)

1. **Add to `.env` or `.env.local`:**

```bash
UNRAID_HOST=192.168.1.133
UNRAID_POSTGRES_PASSWORD=your-password
UNRAID_SSH_USER=root
UNRAID_APP_URL=http://192.168.1.133:3000
```

2. **Deploy:**

```bash
npm run deploy
```

That's it! The script will:

- ✅ Build Docker image
- ✅ Transfer to Unraid
- ✅ Stop old container
- ✅ Start new container

## GitHub Actions CI/CD

### Initial Setup (One Time)

1. **Generate SSH key:**

```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/unraid_deploy
```

2. **Add public key to Unraid:**

```bash
ssh-copy-id -i ~/.ssh/unraid_deploy.pub root@192.168.1.133
```

3. **Add GitHub Secrets** (Repository → Settings → Secrets → Actions):
   - `UNRAID_HOST`: `192.168.1.133`
   - `UNRAID_SSH_USER`: `root`
   - `UNRAID_SSH_KEY`: Contents of `~/.ssh/unraid_deploy` (private key)
   - `UNRAID_POSTGRES_PASSWORD`: Your PostgreSQL password
   - `UNRAID_APP_URL`: `http://192.168.1.133:3000`

### Automatic Deployment

Now every push to `main` branch automatically deploys! 🚀

## Troubleshooting

**Container won't start:**

```bash
ssh root@192.168.1.133
docker logs juda-app
```

**Check container status:**

```bash
docker ps -a | grep juda-app
```

**Restart container:**

```bash
docker restart juda-app
```
