# EAS OTA Updates Guide (CosmicReactNative)

## 1. Prerequisites

1. Install dependencies:
   ```bash
   npm install
   ```
2. Login to Expo:
   ```bash
   npx eas login
   ```
3. Ensure this project is linked to Expo and get the project id:
   ```bash
   npx eas project:info
   ```
4. Set `EXPO_EAS_PROJECT_ID` in your shell (or CI env):
   ```bash
   export EXPO_EAS_PROJECT_ID="<your-project-id>"
   ```

`app.config.js` uses this value to enable OTA and generate:

- `updates.url = https://u.expo.dev/<project-id>`
- `extra.eas.projectId = <project-id>`

## 2. Make Native OTA Config Persistent

This repo includes `./plugins/with-ota-updates` to keep OTA flags in native files across prebuilds.

After changing OTA config, regenerate native config:

```bash
npx expo prebuild --clean
```

Verify native values:

```bash
rg -n "expo.modules.updates.ENABLED|EXPO_UPDATES_CHECK_ON_LAUNCH|EXPO_UPDATE_URL" android/app/src/main/AndroidManifest.xml
rg -n "EXUpdatesEnabled|EXUpdatesCheckOnLaunch|EXUpdatesURL" ios/**/Supporting/Expo.plist
```

## 3. Check Existing Channels

```bash
npm run ota:channels:list --json --non-interactive
```

## 4. Create Missing Channels

```bash
npx eas channel:create <channel-name>
```

```bash
npx eas channel:edit <channel-name> --branch <branch-name>
```

## 5. Publish OTA Updates

Publish to production:

```bash
npm run ota:publish:production
```

Publish to preview:

```bash
npm run ota:publish:preview
```

Publish with explicit args:

```bash
npm run ota:publish -- --channel production --platform android --message "Fix login flow"
```

## 6. Build-to-Channel Mapping

`eas.json` profiles are mapped as:

- `development` build profile -> `development` channel
- `preview` build profile -> `preview` channel
- `production` build profile -> `production` channel

Build examples:

```bash
npx eas build --platform android --profile preview
npx eas build --platform android --profile production
```

## 7. Runtime Behavior

At app launch, `services/otaUpdates.ts` runs:

1. `checkForUpdateAsync()`
2. `fetchUpdateAsync()` when an update exists
3. `reloadAsync()` to apply immediately

If updates are disabled or not configured, it safely skips OTA.
