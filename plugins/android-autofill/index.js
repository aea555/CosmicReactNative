const { withAndroidManifest, withDangerousMod, withPlugins } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SERVICE_NAME = 'CosmicAutofillService';
// Assuming the package name is what's in app.json, but for native code we often defaults.
// We'll try to determine the package path dynamically.

const withAutofillManifest = (config) => {
    return withAndroidManifest(config, (config) => {
        const mainApplication = config.modResults.manifest.application[0];

        // Check if service already exists
        const existingService = mainApplication.service?.find(
            (service) => service.$['android:name'] === `.${SERVICE_NAME}`
        );

        if (!existingService) {
            if (!mainApplication.service) {
                mainApplication.service = [];
            }

            mainApplication.service.push({
                $: {
                    'android:name': `.${SERVICE_NAME}`,
                    'android:label': 'Cosmic Vault',
                    'android:permission': 'android.permission.BIND_AUTOFILL_SERVICE',
                    'android:exported': 'true',
                },
                'intent-filter': [
                    {
                        action: [
                            {
                                $: {
                                    'android:name': 'android.service.autofill.AutofillService',
                                },
                            },
                        ],
                    },
                ],
            });
        }

        return config;
    });
};

const withAutofillServiceSource = (config) => {
    return withDangerousMod(config, [
        'android',
        async (config) => {
            const androidProjectRoot = config.modRequest.platformProjectRoot;
            const packageName = config.android?.package || 'com.ahmetemreakar.cosmicvault'; // Fallback
            const packagePath = packageName.replace(/\./g, '/');

            const sourceDir = path.join(androidProjectRoot, 'app/src/main/java', packagePath);

            // Ensure directory exists
            if (!fs.existsSync(sourceDir)) {
                fs.mkdirSync(sourceDir, { recursive: true });
            }

            // Read template
            // We will store the template in the same directory as this plugin
            const templatePath = path.join(__dirname, 'src/main/java/com/cosmic/vault/CosmicAutofillService.kt');

            // Read and replace package name
            let templateContent = fs.readFileSync(templatePath, 'utf8');
            templateContent = templateContent.replace(/package com.cosmic.vault/g, `package ${packageName}`);

            // Write to destination
            const destPath = path.join(sourceDir, `${SERVICE_NAME}.kt`);
            fs.writeFileSync(destPath, templateContent);

            return config;
        },
    ]);
};

const withAutofillLayout = (config) => {
    return withDangerousMod(config, [
        'android',
        async (config) => {
            const androidProjectRoot = config.modRequest.platformProjectRoot;
            const resDir = path.join(androidProjectRoot, 'app/src/main/res/layout');

            // Ensure directory exists
            if (!fs.existsSync(resDir)) {
                fs.mkdirSync(resDir, { recursive: true });
            }

            // Copy layout file
            const sourcePath = path.join(__dirname, 'src/main/res/layout/item_autofill.xml');
            const destPath = path.join(resDir, 'item_autofill.xml');

            fs.copyFileSync(sourcePath, destPath);

            return config;
        },
    ]);
};

const withAndroidAutofill = (config) => {
    return withPlugins(config, [withAutofillManifest, withAutofillServiceSource, withAutofillLayout]);
};

module.exports = withAndroidAutofill;
