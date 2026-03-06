const { withAndroidManifest, withInfoPlist } = require('@expo/config-plugins');

const ANDROID_META_KEY_ENABLED = 'expo.modules.updates.ENABLED';
const ANDROID_META_KEY_CHECK_ON_LAUNCH = 'expo.modules.updates.EXPO_UPDATES_CHECK_ON_LAUNCH';
const ANDROID_META_KEY_LAUNCH_WAIT_MS = 'expo.modules.updates.EXPO_UPDATES_LAUNCH_WAIT_MS';
const ANDROID_META_KEY_UPDATE_URL = 'expo.modules.updates.EXPO_UPDATE_URL';

function setAndroidMetaData(mainApplication, name, value) {
  if (!mainApplication['meta-data']) {
    mainApplication['meta-data'] = [];
  }

  const existing = mainApplication['meta-data'].find((item) => item.$?.['android:name'] === name);
  if (existing) {
    existing.$['android:value'] = value;
    return;
  }

  mainApplication['meta-data'].push({
    $: {
      'android:name': name,
      'android:value': value,
    },
  });
}

const withAndroidOtaMeta = (config) => {
  return withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest.application?.[0];
    if (!app) {
      return config;
    }

    const updatesConfig = config.updates ?? {};
    const enabled = Boolean(updatesConfig.enabled);

    setAndroidMetaData(app, ANDROID_META_KEY_ENABLED, String(enabled));
    setAndroidMetaData(app, ANDROID_META_KEY_CHECK_ON_LAUNCH, 'ALWAYS');
    setAndroidMetaData(app, ANDROID_META_KEY_LAUNCH_WAIT_MS, '0');

    if (updatesConfig.url) {
      setAndroidMetaData(app, ANDROID_META_KEY_UPDATE_URL, updatesConfig.url);
    }

    return config;
  });
};

const withIosOtaMeta = (config) => {
  return withInfoPlist(config, (config) => {
    const updatesConfig = config.updates ?? {};

    config.modResults.EXUpdatesEnabled = Boolean(updatesConfig.enabled);
    config.modResults.EXUpdatesCheckOnLaunch = 'ALWAYS';
    config.modResults.EXUpdatesLaunchWaitMs = 0;

    if (updatesConfig.url) {
      config.modResults.EXUpdatesURL = updatesConfig.url;
    }

    return config;
  });
};

module.exports = (config) => {
  config = withAndroidOtaMeta(config);
  config = withIosOtaMeta(config);
  return config;
};
