import * as Updates from 'expo-updates';

export async function applyOtaUpdateOnLaunch(): Promise<void> {
  if (__DEV__) {
    return;
  }

  if (!Updates.isEnabled) {
    console.log('[OTA] Updates are disabled.');
    return;
  }

  try {
    const update = await Updates.checkForUpdateAsync();
    if (!update.isAvailable) {
      return;
    }

    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
  } catch (error) {
    console.warn('[OTA] Failed to check/apply OTA update at launch:', error);
  }
}
