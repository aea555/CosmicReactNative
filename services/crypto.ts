/**
 * Crypto utilities for password/secret generation
 */

import * as Crypto from 'expo-crypto';
import 'react-native-get-random-values';
import * as nacl from 'tweetnacl';
import * as naclUtil from 'tweetnacl-util';

// Configure tweetnacl to use expo-crypto's PRNG
nacl.setPRNG((x: Uint8Array, n: number) => {
    Crypto.getRandomValues(x);
});

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

// Word list for passphrase generation
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
        const binary = String.fromCharCode(...randomBytes);
        return btoa(binary);
    }

    return Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// SSH Key generation using Ed25519 via tweetnacl
export interface SSHKeyPair {
    publicKey: string;
    privateKey: string;
    fingerprint: string;
}

const toBase64 = (arr: Uint8Array) => naclUtil.encodeBase64(arr);

// Helper to write a string with 4-byte big-endian length prefix
const writeString = (s: string): Uint8Array => {
    const buf = new Uint8Array(4 + s.length);
    new DataView(buf.buffer).setUint32(0, s.length, false);
    for (let i = 0; i < s.length; i++) buf[4 + i] = s.charCodeAt(i);
    return buf;
};

// Helper to write a buffer with 4-byte big-endian length prefix
const writeBuffer = (b: Uint8Array): Uint8Array => {
    const buf = new Uint8Array(4 + b.length);
    new DataView(buf.buffer).setUint32(0, b.length, false);
    buf.set(b, 4);
    return buf;
};

// Concatenate multiple Uint8Arrays
const concat = (...bufs: Uint8Array[]): Uint8Array => {
    const total = bufs.reduce((acc, b) => acc + b.length, 0);
    const res = new Uint8Array(total);
    let offset = 0;
    for (const b of bufs) {
        res.set(b, offset);
        offset += b.length;
    }
    return res;
};

export async function generateSSHKey(): Promise<SSHKeyPair> {
    // Generate real Ed25519 key pair using tweetnacl
    const keyPair = nacl.sign.keyPair();

    // Build the public key blob: type string + public key bytes
    const keyTypeStr = writeString("ssh-ed25519");
    const pubKeyBlob = concat(keyTypeStr, writeBuffer(keyPair.publicKey));

    // Format public key: ssh-ed25519 <base64(blob)> <comment>
    const publicKey = `ssh-ed25519 ${toBase64(pubKeyBlob)} cosmic-vault-generated`;

    // Build OpenSSH private key format
    const MAGIC = new Uint8Array([
        0x6f, 0x70, 0x65, 0x6e, 0x73, 0x73, 0x68, 0x2d, 0x6b, 0x65, 0x79, 0x2d, 0x76, 0x31, 0x00
    ]); // "openssh-key-v1\0"

    // Generate random check integers (must match)
    const checkBytes = new Uint8Array(4);
    Crypto.getRandomValues(checkBytes);

    // Private key section: check1 + check2 + keytype + pubkey + privkey + comment + padding
    const privKeySection = concat(
        checkBytes,
        checkBytes, // check2 must equal check1
        keyTypeStr,
        writeBuffer(keyPair.publicKey),
        writeBuffer(keyPair.secretKey), // 64 bytes: seed (32) + public (32)
        writeString("cosmic-vault-generated")
    );

    // Add padding to align to 8 bytes
    const paddingLen = 8 - (privKeySection.length % 8);
    const padding = new Uint8Array(paddingLen);
    for (let i = 0; i < paddingLen; i++) padding[i] = i + 1;
    const paddedPrivSection = concat(privKeySection, padding);

    // Assemble the full private key blob
    const privateKeyBlob = concat(
        MAGIC,
        writeString("none"),                    // cipher
        writeString("none"),                    // kdf
        writeBuffer(new Uint8Array(0)),         // kdf options (empty)
        new Uint8Array([0, 0, 0, 1]),           // number of keys
        writeBuffer(pubKeyBlob),                // public key
        writeBuffer(paddedPrivSection)          // private key section
    );

    // Format as PEM with 70-char line wrapping
    const b64Body = toBase64(privateKeyBlob);
    const wrappedBody = b64Body.match(/.{1,70}/g)?.join('\n') || b64Body;
    const privateKey = `-----BEGIN OPENSSH PRIVATE KEY-----\n${wrappedBody}\n-----END OPENSSH PRIVATE KEY-----`;

    // Generate fingerprint: SHA256 of the public key blob
    const digestHex = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        toBase64(pubKeyBlob)
    );
    const fingerprintBytes = new Uint8Array(
        digestHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );
    const fingerprint = `SHA256:${toBase64(fingerprintBytes).replace(/=+$/, '')}`;

    return { publicKey, privateKey, fingerprint };
}

// Password strength calculator
export function calculatePasswordStrength(password: string): {
    score: number;
    label: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
    feedback: string[];
} {
    const checks = [
        { met: password.length >= 12, label: 'passwordTooShort' },
        { met: /[A-Z]/.test(password), label: 'passwordNoUppercase' },
        { met: /[a-z]/.test(password), label: 'passwordNoLowercase' },
        { met: /[0-9]/.test(password), label: 'passwordNoNumber' },
        { met: /[^a-zA-Z0-9]/.test(password), label: 'passwordNoSpecial' },
    ];

    const unmetChecks = checks.filter(c => !c.met);
    const feedback = unmetChecks.map(c => c.label);

    let score = 0;
    if (unmetChecks.length === 0) {
        score = 2;
        if (password.length >= 16) score += 1;
        if (password.length >= 20) score += 1;
    }

    const labels: Array<'weak' | 'fair' | 'good' | 'strong' | 'very-strong'> = [
        'weak', 'weak', 'fair', 'good', 'strong'
    ];

    return { score, label: labels[score], feedback };
}
