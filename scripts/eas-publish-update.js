#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

function parseArgs(argv) {
  const options = {
    channel: process.env.OTA_CHANNEL || 'production',
    platform: process.env.OTA_PLATFORM || 'all',
    message: process.env.OTA_MESSAGE || `OTA update ${new Date().toISOString()}`,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === '--channel' && next) {
      options.channel = next;
      i += 1;
      continue;
    }

    if (arg === '--platform' && next) {
      options.platform = next;
      i += 1;
      continue;
    }

    if (arg === '--message' && next) {
      options.message = next;
      i += 1;
      continue;
    }
  }

  return options;
}

function publishUpdate({ channel, platform, message }) {
  const args = [
    'eas',
    'update',
    '--channel',
    channel,
    '--platform',
    platform,
    '--message',
    message,
    '--non-interactive',
  ];

  console.log(`Publishing OTA update to channel "${channel}" on platform "${platform}"...`);
  console.log(`Message: ${message}`);

  const result = spawnSync('npx', args, {
    stdio: 'inherit',
    encoding: 'utf8',
  });

  process.exit(result.status ?? 1);
}

const options = parseArgs(process.argv.slice(2));
publishUpdate(options);
