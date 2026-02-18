#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO = "https://github.com/ofershap/cursor-usage-tracker.git";
const dirName = process.argv[2] || "cursor-usage-tracker";
const targetDir = resolve(process.cwd(), dirName);

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: "inherit", ...opts });
}

function log(msg) {
  console.log(`\n\x1b[36m${msg}\x1b[0m`);
}

if (existsSync(targetDir)) {
  console.error(`\x1b[31mDirectory "${dirName}" already exists.\x1b[0m`);
  process.exit(1);
}

log(`Cloning cursor-usage-tracker into ${dirName}...`);
run(`git clone --depth 1 ${REPO} "${targetDir}"`);

log("Installing dependencies...");
run("npm install", { cwd: targetDir });

const envExample = resolve(targetDir, ".env.example");
const envFile = resolve(targetDir, ".env");
if (existsSync(envExample) && !existsSync(envFile)) {
  copyFileSync(envExample, envFile);
}

log("Done! Next steps:");
console.log(`
  cd ${dirName}

  1. Edit .env and add your CURSOR_ADMIN_API_KEY
     Get it from: Cursor dashboard → Settings → Advanced → Admin API Keys

  2. Start the dashboard:
     npm run dev

  3. Collect your first data:
     npm run collect

  4. Open http://localhost:3000

  Docs: https://github.com/ofershap/cursor-usage-tracker
`);
