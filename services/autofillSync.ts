import CryptoJS from 'crypto-js';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { Secret } from './api';

import { NativeModules } from 'react-native';

const { CosmicAutofillModule } = NativeModules;
const VAULT_MIRROR_FILE = 'vault_mirror.json';
// Key file is no longer used for security reasons
const PENDING_SAVES_FILE = 'pending_saves.json';

/**
 * Encrypts and mirrors the secrets to a local file for the Android AutofillService.
 * Uses AES-256-CBC with an in-memory session key passed to Native Module.
 */
export const clearAutofillData = async () => {
    try {
        const fileUri = FileSystem.documentDirectory + VAULT_MIRROR_FILE;

        // Delete the data file
        await FileSystem.deleteAsync(fileUri, { idempotent: true });

        // Clear the key from memory (RAM) via Native Module
        if (CosmicAutofillModule) {
            CosmicAutofillModule.clearSessionKey();
        }

        console.log('Autofill data cleared securely (File + RAM).');
    } catch (error) {
        console.error('Failed to clear autofill data:', error);
    }
};

export const syncVaultToAutofill = async (secrets: Secret[]) => {
    try {
        const fileUri = FileSystem.documentDirectory + VAULT_MIRROR_FILE;

        // 1. Generate Encryption Key (32 bytes / 256 bits) in Memory
        const randomBytes = await Crypto.getRandomBytesAsync(32);
        const keyHex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');

        // 2. Send Key to Native Module (RAM)
        if (CosmicAutofillModule) {
            CosmicAutofillModule.setSessionKey(keyHex);
        } else {
            console.warn('CosmicAutofillModule is not available');
            return;
        }

        // 3. Prepare Data
        const exportData = secrets.map(s => ({
            id: s.id,
            title: s.title,
            username: s.username,
            password: s.password,
            url: s.url,
            email: s.email
        }));
        const jsonContent = JSON.stringify(exportData);

        // 4. Encrypt
        // Generate random IV (16 bytes)
        const ivBytes = await Crypto.getRandomBytesAsync(16);
        const ivHex = Array.from(ivBytes).map(b => b.toString(16).padStart(2, '0')).join('');

        const key = CryptoJS.enc.Hex.parse(keyHex);
        const iv = CryptoJS.enc.Hex.parse(ivHex);

        const encrypted = CryptoJS.AES.encrypt(jsonContent, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });

        const payload = {
            iv: ivHex,
            // CryptoJS toString() returns Base64 by default
            data: encrypted.toString()
        };

        await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(payload));
        console.log('Vault synced to encrypted Autofill mirror (Memory Key).');
    } catch (error) {
        console.error('Failed to sync vault to autofill:', error);
    }
};

export interface PendingSave {
    packageName: string;
    username: string;
    password: string;
    webDomain?: string; // For web forms, contains the actual domain (e.g., "practicetestautomation.com")
    timestamp: number;
}

export const getPendingSaves = async (): Promise<PendingSave[]> => {
    try {
        const fileUri = FileSystem.documentDirectory + PENDING_SAVES_FILE;
        const info = await FileSystem.getInfoAsync(fileUri);

        if (!info.exists) return [];

        const content = await FileSystem.readAsStringAsync(fileUri);
        const saves = JSON.parse(content) as PendingSave[];

        // Clear the file after reading so we don't process them again
        // Actually, we should probably clear only after successful import, 
        // but for now, extracting them implies we will handle them.


        return saves;
    } catch (error) {
        console.error('Error checking pending saves:', error);
        return [];
    }
};

export const removeFromPendingSaves = async (saveToRemove: PendingSave) => {
    try {
        const fileUri = FileSystem.documentDirectory + PENDING_SAVES_FILE;
        const saves = await getPendingSaves();

        // Remove the match (filtering by value equality)
        const newSaves = saves.filter(s =>
            s.packageName !== saveToRemove.packageName ||
            s.username !== saveToRemove.username ||
            s.password !== saveToRemove.password
        );

        if (newSaves.length === 0) {
            await FileSystem.deleteAsync(fileUri);
        } else {
            await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(newSaves));
        }
    } catch (error) {
        console.error('Error removing pending save:', error);
    }
};
