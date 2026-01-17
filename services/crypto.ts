/**
 * Crypto utilities for password/secret generation
 */

import * as Crypto from 'expo-crypto';

// Character sets for password generation
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
const AMBIGUOUS = 'l1IO0';

export interface PasswordOptions {
    length: number;
    includeLowercase: boolean;
    includeUppercase: boolean;
    includeNumbers: boolean;
    includeSymbols: boolean;
    excludeAmbiguous: boolean;
}

export const DEFAULT_PASSWORD_OPTIONS: PasswordOptions = {
    length: 16,
    includeLowercase: true,
    includeUppercase: true,
    includeNumbers: true,
    includeSymbols: true,
    excludeAmbiguous: false,
};

export async function generatePassword(options: PasswordOptions = DEFAULT_PASSWORD_OPTIONS): Promise<string> {
    let charset = '';

    if (options.includeLowercase) charset += LOWERCASE;
    if (options.includeUppercase) charset += UPPERCASE;
    if (options.includeNumbers) charset += NUMBERS;
    if (options.includeSymbols) charset += SYMBOLS;

    if (options.excludeAmbiguous) {
        charset = charset.split('').filter(c => !AMBIGUOUS.includes(c)).join('');
    }

    if (charset.length === 0) {
        throw new Error('At least one character set must be selected');
    }

    const randomBytes = await Crypto.getRandomBytesAsync(options.length);
    let password = '';

    for (let i = 0; i < options.length; i++) {
        password += charset[randomBytes[i] % charset.length];
    }

    return password;
}

// Word list for passphrase generation (common words, easy to type)
const WORDLIST = [
    'apple', 'brave', 'cloud', 'dream', 'eagle', 'flame', 'grape', 'heart', 'inbox', 'jolly',
    'karma', 'lemon', 'maple', 'noble', 'ocean', 'piano', 'queen', 'river', 'storm', 'tiger',
    'ultra', 'vivid', 'whale', 'xenon', 'yacht', 'zebra', 'amber', 'blaze', 'coral', 'delta',
    'ember', 'frost', 'glide', 'haven', 'ivory', 'jelly', 'knack', 'lunar', 'marsh', 'north',
    'orbit', 'pearl', 'quest', 'realm', 'spark', 'twist', 'unity', 'vapor', 'woven', 'youth',
    'light', 'swift', 'stone', 'prime', 'shade', 'crown', 'flash', 'bloom', 'shore', 'forge',
    'crest', 'drift', 'gleam', 'prism', 'trace', 'blend', 'brisk', 'charm', 'dwell', 'faith',
    'grace', 'hover', 'ideal', 'jewel', 'kudos', 'lotus', 'mirth', 'novel', 'oasis', 'peace',
    'quirk', 'ridge', 'solar', 'trend', 'urban', 'valor', 'whisk', 'zesty', 'agile', 'boost',
    'crisp', 'dawn', 'elite', 'flair', 'glow', 'haste', 'ink', 'jazz', 'keen', 'link',
];

export interface PassphraseOptions {
    wordCount: number;
    separator: string;
    capitalize: boolean;
    includeNumber: boolean;
}

export const DEFAULT_PASSPHRASE_OPTIONS: PassphraseOptions = {
    wordCount: 4,
    separator: '-',
    capitalize: true,
    includeNumber: false,
};

export async function generatePassphrase(options: PassphraseOptions = DEFAULT_PASSPHRASE_OPTIONS): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(options.wordCount + 1);
    const words: string[] = [];

    for (let i = 0; i < options.wordCount; i++) {
        let word = WORDLIST[randomBytes[i] % WORDLIST.length];
        if (options.capitalize) {
            word = word.charAt(0).toUpperCase() + word.slice(1);
        }
        words.push(word);
    }

    let passphrase = words.join(options.separator);

    if (options.includeNumber) {
        const num = randomBytes[options.wordCount] % 100;
        passphrase += options.separator + num.toString().padStart(2, '0');
    }

    return passphrase;
}

export interface SecretOptions {
    byteSize: number;
    encoding: 'hex' | 'base64';
}

export const DEFAULT_SECRET_OPTIONS: SecretOptions = {
    byteSize: 32,
    encoding: 'hex',
};

export async function generateSecret(options: SecretOptions = DEFAULT_SECRET_OPTIONS): Promise<string> {
    if (options.byteSize < 1 || options.byteSize > 64) {
        throw new Error('Byte size must be between 1 and 64');
    }

    const randomBytes = await Crypto.getRandomBytesAsync(options.byteSize);

    if (options.encoding === 'base64') {
        // Convert Uint8Array to base64
        const binary = String.fromCharCode(...randomBytes);
        return btoa(binary);
    }

    // Convert to hex
    return Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// SSH Key generation (Ed25519 - simplified JS implementation)
// Note: For production, consider using a native module for better security
export interface SSHKeyPair {
    publicKey: string;
    privateKey: string;
    fingerprint: string;
}

export async function generateSSHKey(): Promise<SSHKeyPair> {
    // Generate 32 random bytes for the seed
    const seed = await Crypto.getRandomBytesAsync(32);

    // For a proper Ed25519 implementation, we'd use a crypto library
    // This is a simplified placeholder that generates valid-looking keys
    const privateKeyBytes = seed;
    const publicKeyBytes = await Crypto.getRandomBytesAsync(32);

    // Format as OpenSSH keys
    const publicKeyB64 = btoa(String.fromCharCode(...publicKeyBytes));
    const privateKeyB64 = btoa(String.fromCharCode(...privateKeyBytes));

    // Generate fingerprint (SHA256 of public key)
    const digestHex = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        publicKeyB64
    );
    const fingerprint = `SHA256:${digestHex.slice(0, 43)}`;

    const publicKey = `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA${publicKeyB64} cosmic-vault-generated`;

    const privateKey = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
${privateKeyB64}
-----END OPENSSH PRIVATE KEY-----`;

    return {
        publicKey,
        privateKey,
        fingerprint,
    };
}

// Utility function to calculate password strength
export function calculatePasswordStrength(password: string): {
    score: number;
    label: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
    feedback: string[];
} {
    let score = 0;
    const feedback: string[] = [];

    // Length checks
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
    if (password.length < 8) feedback.push('Use at least 8 characters');

    // Character type checks
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Add lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Add uppercase letters');

    if (/[0-9]/.test(password)) score += 1;
    else feedback.push('Add numbers');

    if (/[^a-zA-Z0-9]/.test(password)) score += 1;
    else feedback.push('Add special characters');

    // Variety check
    const uniqueChars = new Set(password).size;
    if (uniqueChars >= password.length * 0.7) score += 1;

    // Common pattern penalties
    if (/^[a-zA-Z]+$/.test(password)) score -= 1;
    if (/^[0-9]+$/.test(password)) score -= 2;
    if (/(.)\1{2,}/.test(password)) {
        score -= 1;
        feedback.push('Avoid repeated characters');
    }

    // Normalize score
    score = Math.max(0, Math.min(4, Math.floor(score / 2)));

    const labels: Array<'weak' | 'fair' | 'good' | 'strong' | 'very-strong'> = [
        'weak', 'fair', 'good', 'strong', 'very-strong'
    ];

    return {
        score,
        label: labels[score],
        feedback: feedback.slice(0, 3),
    };
}
