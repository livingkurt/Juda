#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Quick script to test SSH connection to Unraid
 */

import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { homedir } from "os";

// Load .env
const envPath = ".env";
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf8");
  envContent.split("\n").forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const commentIndex = trimmed.indexOf(" #");
      const lineWithoutComment = commentIndex > 0 ? trimmed.substring(0, commentIndex).trim() : trimmed;
      const [key, ...valueParts] = lineWithoutComment.split("=");
      if (key && valueParts.length > 0) {
        let value = valueParts.join("=").trim();
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

const UNRAID_HOST = process.env.UNRAID_HOST || process.env.UNRAID_IP;
const UNRAID_SSH_USER = process.env.UNRAID_SSH_USER || "root";
let UNRAID_SSH_KEY = process.env.UNRAID_SSH_KEY;

if (UNRAID_SSH_KEY) {
  if (UNRAID_SSH_KEY.startsWith("~")) {
    UNRAID_SSH_KEY = UNRAID_SSH_KEY.replace("~", homedir());
  }
}

console.log("🔍 Testing SSH connection to Unraid...\n");
console.log(`Host: ${UNRAID_HOST}`);
console.log(`User: ${UNRAID_SSH_USER}`);
console.log(`SSH Key: ${UNRAID_SSH_KEY || "Not set (will use password)"}\n`);

if (!UNRAID_HOST) {
  console.error("❌ UNRAID_HOST not set in .env");
  process.exit(1);
}

try {
  // Test 1: Basic connection
  console.log("Test 1: Basic SSH connection...");
  const sshCmd = UNRAID_SSH_KEY
    ? `ssh -i ${UNRAID_SSH_KEY} -o StrictHostKeyChecking=no -o ConnectTimeout=5 ${UNRAID_SSH_USER}@${UNRAID_HOST} "echo 'SSH connection successful!'"`
    : `ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 ${UNRAID_SSH_USER}@${UNRAID_HOST} "echo 'SSH connection successful!'"`;

  const result = execSync(sshCmd, { encoding: "utf8", stdio: "pipe" });
  console.log(`✅ ${result.trim()}\n`);

  // Test 2: Docker access
  console.log("Test 2: Docker access...");
  const dockerCmd = UNRAID_SSH_KEY
    ? `ssh -i ${UNRAID_SSH_KEY} -o StrictHostKeyChecking=no ${UNRAID_SSH_USER}@${UNRAID_HOST} "docker ps"`
    : `ssh -o StrictHostKeyChecking=no ${UNRAID_SSH_USER}@${UNRAID_HOST} "docker ps"`;

  const dockerResult = execSync(dockerCmd, { encoding: "utf8", stdio: "pipe" });
  console.log("✅ Docker access working!\n");
  console.log("First few lines:");
  console.log(dockerResult.split("\n").slice(0, 3).join("\n"));
  console.log("\n✅ All tests passed!");
} catch (error) {
  console.error("\n❌ SSH connection failed!");
  console.error(`Error: ${error.message}\n`);

  if (UNRAID_SSH_KEY) {
    console.log("🔧 Troubleshooting steps:");
    console.log("1. Verify public key is on Unraid:");
    console.log(`   cat ~/.ssh/unraid_deploy.pub`);
    console.log(`   Then SSH into Unraid and check:`);
    console.log(`   cat ~/.ssh/authorized_keys | grep "$(cat ~/.ssh/unraid_deploy.pub)"`);
    console.log("\n2. Test SSH manually:");
    console.log(`   ssh -i ${UNRAID_SSH_KEY} -v ${UNRAID_SSH_USER}@${UNRAID_HOST}`);
    console.log("\n3. Check Unraid SSH settings:");
    console.log("   Settings → Management Access → SSH");
    console.log("   Make sure SSH is enabled");
    console.log("\n4. If key auth doesn't work, remove UNRAID_SSH_KEY from .env");
    console.log("   and use password authentication instead");
  } else {
    console.log("💡 Tip: Set up SSH key authentication to avoid password prompts:");
    console.log("   1. ssh-keygen -t ed25519 -f ~/.ssh/unraid_deploy");
    console.log(`   2. ssh-copy-id -i ~/.ssh/unraid_deploy.pub ${UNRAID_SSH_USER}@${UNRAID_HOST}`);
    console.log("   3. Add UNRAID_SSH_KEY=~/.ssh/unraid_deploy to .env");
  }

  process.exit(1);
}
