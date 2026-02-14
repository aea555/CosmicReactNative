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
            const packageName = config.android?.package || 'com.ahmetemreakar.cosmicvault';
            const packagePath = packageName.replace(/\./g, '/');

            // 1. Ensure Directory Exists
            const sourceDir = path.join(androidProjectRoot, 'app/src/main/java', packagePath);
            if (!fs.existsSync(sourceDir)) {
                fs.mkdirSync(sourceDir, { recursive: true });
            }

            // 2. Define Files to Copy/Generate
            const filesToCopy = [
                'CosmicAutofillService.kt',
                'VaultSession.kt',
                'AutofillModule.kt',
                'AutofillPackage.kt'
            ];

            // 3. Process each file
            for (const file of filesToCopy) {
                const templatePath = path.join(__dirname, `src/main/java/com/cosmic/vault/${file}`);
                let content = fs.readFileSync(templatePath, 'utf8');

                // Replace package declaration
                content = content.replace(/package com.cosmic.vault/g, `package ${packageName}`);

                // Write to app source
                const destPath = path.join(sourceDir, file);
                fs.writeFileSync(destPath, content);
            }

            return config;
        },
    ]);
};

// NEW: Inject Package into MainApplication.kt
const withAutofillPackageInjection = (config) => {
    return withDangerousMod(config, [
        'android',
        async (config) => {
            const androidProjectRoot = config.modRequest.platformProjectRoot;
            const packageName = config.android?.package || 'com.ahmetemreakar.cosmicvault';
            const packagePath = packageName.replace(/\./g, '/');
            const mainAppPath = path.join(androidProjectRoot, 'app/src/main/java', packagePath, 'MainApplication.kt');

            if (!fs.existsSync(mainAppPath)) {
                // If using Java or different path, finding it is harder. 
                // For now, assuming standard Expo Kotlin template as we saw earlier.
                return config;
            }

            let content = fs.readFileSync(mainAppPath, 'utf8');

            // Check if already added
            if (content.includes('add(AutofillPackage())')) {
                return config;
            }

            // Inject "add(AutofillPackage())" into the getPackages() list
            // Look for: PackageList(this).packages.apply {
            if (content.includes('PackageList(this).packages.apply {')) {
                content = content.replace(
                    'PackageList(this).packages.apply {',
                    'PackageList(this).packages.apply {\n              add(AutofillPackage())'
                );
                fs.writeFileSync(mainAppPath, content);
            }

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
            if (!fs.existsSync(resDir)) {
                fs.mkdirSync(resDir, { recursive: true });
            }
            const sourcePath = path.join(__dirname, 'src/main/res/layout/item_autofill.xml');
            const destPath = path.join(resDir, 'item_autofill.xml');
            fs.copyFileSync(sourcePath, destPath);
            return config;
        },
    ]);
};

const withAndroidAutofill = (config) => {
    return withPlugins(config, [
        withAutofillManifest,
        withAutofillServiceSource,
        withAutofillPackageInjection, // Added
        withAutofillLayout
    ]);
};

module.exports = withAndroidAutofill;
