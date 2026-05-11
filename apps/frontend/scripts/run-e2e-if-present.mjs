#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const testsDir = path.resolve(process.cwd(), 'tests');
const e2ePattern = /\.(spec|e2e)\.(js|jsx|mjs|cjs|ts|tsx)$/;

function findE2EFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return findE2EFiles(entryPath);
    }
    return e2ePattern.test(entry.name) ? [entryPath] : [];
  });
}

const e2eFiles = findE2EFiles(testsDir);

if (e2eFiles.length === 0) {
  console.log('No E2E tests configured; skipping Playwright.');
  process.exit(0);
}

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const result = spawnSync(pnpm, ['exec', 'playwright', 'test', ...process.argv.slice(2)], {
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
