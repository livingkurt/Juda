#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Deploy Juda to Unraid
 *
 * This script:
 * 1. Builds a Docker image for linux/amd64 platform
 * 2. Saves it to a tar file
 * 3. Transfers it to Unraid via scp
 * 4. Loads it on Unraid
 * 5. Stops and removes old container (if exists)
 * 6. Creates and starts new container with proper configuration
 *
 * Usage: npm run deploy
 *
 * Required environment variables (can be in .env or .env.local):
 * - UNRAID_HOST: Unraid server IP or hostname (e.g., 192.168.1.133)
 * - UNRAID_POSTGRES_PASSWORD: PostgreSQL password for juda-postgres container
 * - UNRAID_SSH_USER: SSH username (default: root)
 *
 * Optional:
 * - UNRAID_APP_URL: Public URL for the app (default: http://[UNRAID_HOST]:3000)
 * - UNRAID_CONTAINER_NAME: Container name (default: juda-app)
 * - UNRAID_IMAGE_NAME: Image name (default: juda-app)
 */

import { execSync } from "child_process";
import { readFileSync, existsSync, statSync, unlinkSync, chmodSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { homedir } from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
function loadEnvFile() {
  const envPaths = [".env.local", ".env"];
  for (const envPath of envPaths) {
    if (existsSync(envPath)) {
      const envContent = readFileSync(envPath, "utf8");
      envContent.split("\n").forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          // Remove inline comments (everything after # that's not in quotes)
          let lineWithoutComment = trimmed;
          const commentIndex = trimmed.indexOf(" #");
          if (commentIndex > 0) {
            lineWithoutComment = trimmed.substring(0, commentIndex).trim();
          }

          const [key, ...valueParts] = lineWithoutComment.split("=");
          if (key && valueParts.length > 0) {
            let value = valueParts.join("=").trim();
            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        }
      });
    }
  }
}

loadEnvFile();

// Configuration
const UNRAID_HOST = process.env.UNRAID_HOST || process.env.UNRAID_IP;
const UNRAID_POSTGRES_PASSWORD = process.env.UNRAID_POSTGRES_PASSWORD;
const UNRAID_SSH_USER = process.env.UNRAID_SSH_USER || "root";
let UNRAID_SSH_KEY = process.env.UNRAID_SSH_KEY; // Optional: path to SSH private key
const UNRAID_APP_URL = process.env.UNRAID_APP_URL || `http://${UNRAID_HOST}:3000`;

// Expand ~ in SSH key path and validate
if (UNRAID_SSH_KEY) {
  if (UNRAID_SSH_KEY.startsWith("~")) {
    UNRAID_SSH_KEY = UNRAID_SSH_KEY.replace("~", homedir());
  }
  // Resolve to absolute path
  if (!UNRAID_SSH_KEY.startsWith("/")) {
    UNRAID_SSH_KEY = resolve(UNRAID_SSH_KEY);
  }
  // Verify key file exists
  if (!existsSync(UNRAID_SSH_KEY)) {
    console.error(`❌ Error: SSH key file not found: ${UNRAID_SSH_KEY}`);
    console.error("   Please check UNRAID_SSH_KEY in your .env file");
    process.exit(1);
  }
  // Set correct permissions (SSH requires 600)
  try {
    chmodSync(UNRAID_SSH_KEY, 0o600);
  } catch {
    // Ignore chmod errors
  }
}

const IMAGE_NAME = process.env.UNRAID_IMAGE_NAME || "juda-app";
const CONTAINER_NAME = process.env.UNRAID_CONTAINER_NAME || "juda-app";
const TAR_FILE = "juda-app.tar";
const REMOTE_PATH = "/tmp/juda-app.tar";

// Build SSH command prefix (use key if provided, otherwise use password auth)
// Add options for large file transfers and keep-alive
const BASE_SSH_OPTS = "-o StrictHostKeyChecking=no -o ServerAliveInterval=60 -o ServerAliveCountMax=3";
const SSH_OPTS = UNRAID_SSH_KEY ? `-i ${UNRAID_SSH_KEY} ${BASE_SSH_OPTS}` : BASE_SSH_OPTS;
// Use single quotes for outer command to avoid quote escaping issues
const SSH_CMD = cmd => {
  // Escape single quotes in the command by replacing ' with '\''
  const escapedCmd = cmd.replace(/'/g, "'\\''");
  return `ssh ${SSH_OPTS} ${UNRAID_SSH_USER}@${UNRAID_HOST} '${escapedCmd}'`;
};
// SCP with compression and keep-alive for large files
const SCP_OPTS = `${SSH_OPTS} -C -o Compression=yes`;
const SCP_CMD = (src, dest) => `scp ${SCP_OPTS} ${src} ${UNRAID_SSH_USER}@${UNRAID_HOST}:${dest}`;

// Validate required environment variables
if (!UNRAID_HOST) {
  console.error("❌ Error: UNRAID_HOST or UNRAID_IP not set");
  console.error("   Add it to .env or .env.local:");
  console.error("   UNRAID_HOST=192.168.1.133");
  process.exit(1);
}

if (!UNRAID_POSTGRES_PASSWORD) {
  console.error("❌ Error: UNRAID_POSTGRES_PASSWORD not set");
  console.error("   Add it to .env or .env.local:");
  console.error("   UNRAID_POSTGRES_PASSWORD=your-secure-password");
  process.exit(1);
}

// Build arguments
const DATABASE_URL = `postgresql://juda:${UNRAID_POSTGRES_PASSWORD}@${UNRAID_HOST}:5432/juda`;

console.log("🚀 Starting Juda deployment to Unraid...\n");
console.log(`📋 Configuration:`);
console.log(`   Unraid Host: ${UNRAID_HOST}`);
console.log(`   SSH User: ${UNRAID_SSH_USER}`);
console.log(`   SSH Key: ${UNRAID_SSH_KEY || "Not set (will use password)"}`);
console.log(`   App URL: ${UNRAID_APP_URL}`);
console.log(`   Image Name: ${IMAGE_NAME}\n`);

try {
  // Step 1: Build Docker image
  console.log("🔨 Step 1/4: Building Docker image (this may take a few minutes)...");
  const buildCommand = `docker build \
    --platform linux/amd64 \
    --build-arg DATABASE_URL="${DATABASE_URL}" \
    --build-arg NEXT_PUBLIC_APP_URL="${UNRAID_APP_URL}" \
    -t ${IMAGE_NAME} .`;

  console.log(`   Running: docker build --platform linux/amd64 ...`);
  execSync(buildCommand, { stdio: "inherit" });
  console.log("   ✅ Build complete\n");

  // Step 2: Save image to tar file
  console.log("💾 Step 2/4: Saving Docker image to tar file...");
  execSync(`docker save ${IMAGE_NAME} > ${TAR_FILE}`, { stdio: "inherit" });
  const stats = statSync(TAR_FILE);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`   ✅ Image saved: ${TAR_FILE} (${sizeMB} MB)\n`);

  // Step 3: Transfer to Unraid
  console.log("📤 Step 3/6: Transferring image to Unraid...");
  const scpCommand = SCP_CMD(TAR_FILE, REMOTE_PATH);
  console.log(`   Running: scp ${TAR_FILE} to Unraid`);
  execSync(scpCommand, { stdio: "inherit" });
  console.log("   ✅ Transfer complete\n");

  // Step 4: Load image on Unraid
  console.log("📥 Step 4/6: Loading image on Unraid...");
  const loadCommand = SSH_CMD(`docker load < ${REMOTE_PATH} && rm ${REMOTE_PATH}`);
  console.log(`   Running: docker load on Unraid`);
  execSync(loadCommand, { stdio: "inherit" });
  console.log("   ✅ Image loaded on Unraid\n");

  // Step 5: Stop and remove old container (if exists)
  console.log("🛑 Step 5/6: Managing container on Unraid...");
  const containerDbUrl = `postgresql://juda:${UNRAID_POSTGRES_PASSWORD}@juda-postgres:5432/juda`;

  // Check if container exists and stop/remove it
  const checkContainer = SSH_CMD(`docker ps -a --filter name=^${CONTAINER_NAME}$ --format '{{.Names}}'`);
  try {
    const existingContainer = execSync(checkContainer, { encoding: "utf8", stdio: "pipe" }).trim();
    if (existingContainer === CONTAINER_NAME) {
      console.log(`   Found existing container: ${CONTAINER_NAME}`);
      console.log("   Stopping container...");
      execSync(SSH_CMD(`docker stop ${CONTAINER_NAME} || true`), { stdio: "inherit" });
      console.log("   Removing container...");
      execSync(SSH_CMD(`docker rm ${CONTAINER_NAME} || true`), { stdio: "inherit" });
      console.log("   ✅ Old container removed\n");
    }
  } catch {
    // Container doesn't exist, that's fine
    console.log("   No existing container found (this is fine for first deployment)\n");
  }

  // Step 6: Create and start new container
  console.log("🚀 Step 6/6: Creating and starting new container...");
  // Build docker run command - use single quotes for env values to avoid escaping issues
  const dockerRunCommand = `docker run -d --name ${CONTAINER_NAME} --network bridge -p 3000:3000 -e DATABASE_URL='${containerDbUrl}' -e NEXT_PUBLIC_APP_URL='${UNRAID_APP_URL}' -e NODE_ENV=production --restart unless-stopped ${IMAGE_NAME}`;

  const createContainer = SSH_CMD(dockerRunCommand);
  console.log(`   Creating container: ${CONTAINER_NAME}`);
  execSync(createContainer, { stdio: "inherit" });
  console.log("   ✅ Container created and started\n");

  // Cleanup local tar file
  console.log("🧹 Cleaning up local tar file...");
  if (existsSync(TAR_FILE)) {
    unlinkSync(TAR_FILE);
    console.log("   ✅ Cleanup complete\n");
  }

  console.log("✅ Deployment complete!\n");
  console.log(`🌐 Your app should be available at: ${UNRAID_APP_URL}\n`);
  console.log("📋 Container Details:");
  console.log(`   Name: ${CONTAINER_NAME}`);
  console.log(`   Image: ${IMAGE_NAME}`);
  console.log(`   Port: 3000:3000`);
  console.log(`   Status: Running\n`);
  console.log("💡 To check logs: ssh into Unraid and run:");
  console.log(`   docker logs ${CONTAINER_NAME}\n`);
} catch (error) {
  console.error("\n❌ Deployment failed!");
  console.error(`   Error: ${error.message}`);
  if (error.stdout) console.error(`   Output: ${error.stdout.toString()}`);
  if (error.stderr) console.error(`   Error: ${error.stderr.toString()}`);
  process.exit(1);
}
