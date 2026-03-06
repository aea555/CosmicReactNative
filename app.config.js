require('dotenv/config');

const appJson = require('./app.json');

const baseExpoConfig = appJson.expo ?? {};
const configuredProjectId = baseExpoConfig?.extra?.eas?.projectId ?? '';
const projectId = process.env.EXPO_EAS_PROJECT_ID || configuredProjectId;
const otaEnabled = Boolean(projectId);

const plugins = [...(baseExpoConfig.plugins ?? [])];
const ensurePlugin = (pluginName) => {
  const exists = plugins.some((plugin) => {
    if (typeof plugin === 'string') {
      return plugin === pluginName;
    }
    return Array.isArray(plugin) && plugin[0] === pluginName;
  });
  if (!exists) {
    plugins.push(pluginName);
  }
};

ensurePlugin('expo-updates');
ensurePlugin('./plugins/with-ota-updates');

module.exports = () => {
  return {
    ...baseExpoConfig,
    runtimeVersion: baseExpoConfig.runtimeVersion ?? { policy: 'appVersion' },
    updates: {
      ...baseExpoConfig.updates,
      enabled: otaEnabled,
      checkAutomatically: 'ON_LOAD',
      fallbackToCacheTimeout: 0,
      ...(otaEnabled ? { url: `https://u.expo.dev/${projectId}` } : {}),
    },
    extra: {
      ...baseExpoConfig.extra,
      eas: {
        ...(baseExpoConfig.extra?.eas ?? {}),
        ...(otaEnabled ? { projectId } : {}),
      },
      otaEnabled,
    },
    plugins,
  };
};
