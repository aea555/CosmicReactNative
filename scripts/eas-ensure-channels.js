#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

const DEFAULT_CHANNELS = ['development', 'preview', 'production'];

function run(command, args, capture = true) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: capture ? ['inherit', 'pipe', 'pipe'] : 'inherit',
  });

  if (result.status !== 0) {
    if (capture) {
      if (result.stdout) process.stdout.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
    }
    process.exit(result.status ?? 1);
  }

  return capture ? result.stdout : '';
}

function getExistingChannelNames() {
  const raw = run('npx', ['eas', 'channel:list', '--json', '--non-interactive']);

  let channels = [];
  try {
    channels = JSON.parse(raw);
  } catch (error) {
    console.error('Failed to parse `eas channel:list --json` output.');
    process.exit(1);
  }

  if (!Array.isArray(channels)) {
    console.error('Unexpected channel list format from EAS CLI.');
    process.exit(1);
  }

  return new Set(
    channels
      .map((channel) => channel?.name)
      .filter((name) => typeof name === 'string' && name.trim().length > 0)
  );
}

function createMissingChannels(channelNames) {
  const existing = getExistingChannelNames();

  for (const channelName of channelNames) {
    if (existing.has(channelName)) {
      console.log(`Channel already exists: ${channelName}`);
      continue;
    }

    console.log(`Creating missing channel: ${channelName}`);
    run(
      'npx',
      ['eas', 'channel:create', channelName, '--branch', channelName, '--non-interactive'],
      false
    );
  }
}

const requested = process.argv
  .slice(2)
  .map((value) => value.trim())
  .filter(Boolean);
const channelsToEnsure = requested.length > 0 ? requested : DEFAULT_CHANNELS;

createMissingChannels(channelsToEnsure);
console.log(`Done. Ensured channels: ${channelsToEnsure.join(', ')}`);
