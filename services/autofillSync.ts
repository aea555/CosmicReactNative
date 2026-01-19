import CryptoJS from 'crypto-js';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { Secret } from './api';

const VAULT_MIRROR_FILE = 'vault_mirror.json';
const VAULT_KEY_FILE = 'vault.key';
const PENDING_SAVES_FILE = 'pending_saves.json';

/**
 * Encrypts and mirrors the secrets to a local file for the Android AutofillService.
 * Uses AES-256-CBC with a synced key file.
 */
export const clearAutofillData = async () => {
    try {
        const fileUri = FileSystem.documentDirectory + VAULT_MIRROR_FILE;
        const keyUri = FileSystem.documentDirectory + VAULT_KEY_FILE;

        // Delete both the data and the key
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
        await FileSystem.deleteAsync(keyUri, { idempotent: true });

        console.log('Autofill data cleared securely.');
    } catch (error) {
        console.error('Failed to clear autofill data:', error);
    }
};

export const syncVaultToAutofill = async (secrets: Secret[]) => {
    try {
        const fileUri = FileSystem.documentDirectory + VAULT_MIRROR_FILE;
        const keyUri = FileSystem.documentDirectory + VAULT_KEY_FILE;

        // 1. Get or Generate Encryption Key (32 bytes / 256 bits)
        let keyHex: string;
        const keyInfo = await FileSystem.getInfoAsync(keyUri);

        if (keyInfo.exists) {
            keyHex = await FileSystem.readAsStringAsync(keyUri);
        } else {
            // Generate distinct 32 bytes
            const randomBytes = await Crypto.getRandomBytesAsync(32);
            // Convert to hex string for easy storage/usage with CryptoJS
            keyHex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
            await FileSystem.writeAsStringAsync(keyUri, keyHex);
        }

        // 2. Prepare Data
        const exportData = secrets.map(s => ({
            id: s.id,
            title: s.title,
            username: s.username,
            password: s.password,
            url: s.url,
            email: s.email
        }));
        const jsonContent = JSON.stringify(exportData);

        // 3. Encrypt
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
        console.log('Vault synced to encrypted Autofill mirror.');
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
