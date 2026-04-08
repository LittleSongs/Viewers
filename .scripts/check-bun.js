#!/usr/bin/env node

const { spawnSync } = require('child_process');

const result = spawnSync('bun', ['--version'], {
  stdio: 'ignore',
  shell: process.platform === 'win32',
});

if (result.status === 0) {
  process.exit(0);
}

console.error(`
OHIF development now expects Bun to be available on your PATH.

Install Bun, then retry:
  https://bun.sh/docs/installation

Common macOS option:
  brew install oven-sh/bun/bun
`);

process.exit(1);
