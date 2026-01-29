# Self-Hosting Juda on Unraid

This guide walks you through migrating your Juda application from Vercel/Neon to your own Unraid server.

## Prerequisites

- Unraid Server with **Community Applications** plugin installed.
- **DuckDNS** container installed and configured (as per your existing setup).
- Access to your router configuration for port forwarding.

---

## Step 1: Database Setup (Postgres)

1.  Go to the **Apps** tab in Unraid.
2.  Search for **"Postgres"** (the official library or Bitnami version is fine, but "Postgres 15" or "16" by `postgresql` is recommended).
3.  Click **Install**.
4.  Configure the container:
    - **POSTGRES_PASSWORD**: Set a strong password.
    - **POSTGRES_DB**: Set this to `judaDB`.
    - **Network Type**: Bridge (or your preferred network).
    - **Host Port 1**: 5432 (or change if used).
5.  Click **Apply** to start the database.

---

## Step 2: Migrate Data from Neon

You need to move your data from the Neon cloud database to your local Unraid Postgres.

1.  **Dump Neon Data**:
    On your local machine (where this project is), run:

    ```bash
    npm run db:dump
    ```

    This will create a SQL file in the `dumps/` folder.

2.  **Copy Dump to Unraid**:
    Copy the generated `.sql` file to your Unraid server (e.g., to `/mnt/user/appdata/postgresql/` or any accessible share).

3.  **Import to Unraid Postgres**:
    Open the Unraid Web UI, click the **Postgres** icon, and select **Console**.
    Run the following command (replace `your_dump_file.sql` with the actual filename):
    ```bash
    psql -U postgres -d judaDB < /path/to/your_dump_file.sql
    ```
    _Note: You might need to adjust the path depending on where you copied the file inside the container mapping._

---

## Step 3: Deploy Juda Application

We will use the Docker image built by GitHub Actions.

### 3.1 Get your GitHub Personal Access Token (PAT)

Since your repository/package might be private, Unraid needs permission to pull it.

1.  Go to GitHub -> Settings -> Developer settings -> Personal access tokens (Classic).
2.  Generate a new token with `read:packages` scope.
3.  Save this token.

### 3.2 Add Container in Unraid

1.  Go to the **Docker** tab in Unraid.
2.  Click **Add Container**.
3.  **Name**: `Juda`
4.  **Repository**: `ghcr.io/your-github-username/juda:latest`
    _(Replace `your-github-username` with your actual username)_
5.  **Network Type**: Bridge
6.  **WebUI**: `http://[IP]:[PORT:3000]`
7.  **Add Port**:
    - Host Port: `3000` (or any free port like `3030`)
    - Container Port: `3000`
8.  **Add Variable**: `DATABASE_URL`
    - Value: `postgresql://postgres:YOUR_DB_PASSWORD@UNRAID_IP:5432/judaDB`
    - _Replace `YOUR_DB_PASSWORD` and `UNRAID_IP` with your actual values._
9.  **Add Variable**: `NEXTAUTH_SECRET` (or `ACCESS_TOKEN_SECRET`)
    - Copy the value from your local `.env` file.
10. **Advanced View** -> **Extra Parameters**:
    - Add: `--pull=always` (optional, helps force updates)

**Authentication for Private Image:**
If the image is private, you need to log in to GHCR on your Unraid terminal first:

1.  Open Unraid Terminal.
2.  Run: `docker login ghcr.io -u your-github-username -p YOUR_PAT_TOKEN`
3.  Now click **Apply** in the "Add Container" screen.

---

## Step 4: Configure Auto-Updates (Watchtower)

1.  Go to **Apps** in Unraid and install **Watchtower**.
2.  Add a Variable to the Watchtower container:
    - **Key**: `WATCHTOWER_INCLUDE_STOPPED`
    - **Value**: `true`
3.  Watchtower will automatically check for new images (pushed by GitHub Actions) and update your Juda container.

---

## Step 5: External Access

Since you already have **DuckDNS** set up:

1.  **Port Forwarding**:
    - Log in to your router.
    - Forward an external port (e.g., `3000` or `80` or `443` if using a reverse proxy) to your Unraid Server IP and the Juda Container Port (e.g., `3000`).

    _Example:_
    - External Port: `8080`
    - Internal IP: `192.168.1.10` (Unraid IP)
    - Internal Port: `3000` (Juda Port)

2.  **Access**:
    - You can now access Juda at `http://your-domain.duckdns.org:8080`.

---

## Troubleshooting

- **Database Connection**: Ensure the `DATABASE_URL` in the Juda container uses the Unraid IP, not `localhost` (since `localhost` inside the container refers to the container itself).
- **Migrations**: The container is configured to run database migrations automatically on startup. Check the logs if the app fails to start.
