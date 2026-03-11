import {
    createCipheriv,
    createDecipheriv,
    createHmac,
    randomBytes,
    scryptSync,
    timingSafeEqual,
} from "node:crypto";

const PASSWORD_HASH_PREFIX = "scrypt.v1";
const RANDOM_ENCRYPTION_PREFIX = "enc.v1.r";
const DETERMINISTIC_ENCRYPTION_PREFIX = "enc.v1.d";

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEY_LENGTH = 64;

let cachedEncryptionKey: Buffer | null = null;

const requireEnv = (name: string): string => {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} must be set from secure secret storage.`);
    }
    return value;
};

const decodeKey = (rawValue: string): Buffer => {
    if (rawValue.startsWith("hex:")) {
        return Buffer.from(rawValue.slice(4), "hex");
    }

    if (rawValue.startsWith("base64:")) {
        return Buffer.from(rawValue.slice(7), "base64");
    }

    if (/^[0-9a-fA-F]{64}$/.test(rawValue)) {
        return Buffer.from(rawValue, "hex");
    }

    try {
        return Buffer.from(rawValue, "base64");
    } catch {
        return Buffer.alloc(0);
    }
};

const getEncryptionKey = (): Buffer => {
    if (cachedEncryptionKey) {
        return cachedEncryptionKey;
    }

    const key = decodeKey(requireEnv("DATA_ENCRYPTION_KEY"));
    if (key.length !== 32) {
        throw new Error(
            "DATA_ENCRYPTION_KEY must decode to 32 bytes (use base64:, hex:, or a raw 64-char hex value)."
        );
    }

    cachedEncryptionKey = key;
    return key;
};

const toB64Url = (value: Buffer): string => value.toString("base64url");
const fromB64Url = (value: string): Buffer => Buffer.from(value, "base64url");

const encrypt = (plainText: string, prefix: string, iv: Buffer): string => {
    const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${prefix}:${toB64Url(iv)}:${toB64Url(encrypted)}:${toB64Url(authTag)}`;
};

const deriveDeterministicIv = (plainText: string): Buffer =>
    createHmac("sha256", getEncryptionKey())
        .update("deterministic-token-iv")
        .update(plainText)
        .digest()
        .subarray(0, 12);

const isEncryptedPayload = (value: string): boolean =>
    value.startsWith(`${RANDOM_ENCRYPTION_PREFIX}:`) || value.startsWith(`${DETERMINISTIC_ENCRYPTION_PREFIX}:`);

export const encryptTokenAtRest = (plainText: string): string =>
    encrypt(plainText, RANDOM_ENCRYPTION_PREFIX, randomBytes(12));

export const encryptIndexedTokenAtRest = (plainText: string): string =>
    encrypt(plainText, DETERMINISTIC_ENCRYPTION_PREFIX, deriveDeterministicIv(plainText));

export const decryptTokenAtRest = (storedValue: string): string => {
    if (!isEncryptedPayload(storedValue)) {
        return storedValue;
    }

    const [prefix, ivEncoded, cipherEncoded, tagEncoded] = storedValue.split(":");
    if (!prefix || !ivEncoded || !cipherEncoded || !tagEncoded) {
        throw new Error("Encrypted payload has invalid format.");
    }

    const iv = fromB64Url(ivEncoded);
    const cipherText = fromB64Url(cipherEncoded);
    const authTag = fromB64Url(tagEncoded);

    const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(cipherText), decipher.final()]);
    return decrypted.toString("utf8");
};

export const isPasswordHash = (value: string): boolean => value.startsWith(`${PASSWORD_HASH_PREFIX}:`);

export const hashPassword = (plainPassword: string): string => {
    const pepper = requireEnv("ACCOUNT_PASSWORD_PEPPER");
    const salt = randomBytes(16);
    const derived = scryptSync(`${plainPassword}${pepper}`, salt, SCRYPT_KEY_LENGTH, {
        N: SCRYPT_N,
        r: SCRYPT_R,
        p: SCRYPT_P,
    });

    return `${PASSWORD_HASH_PREFIX}:${toB64Url(salt)}:${toB64Url(derived)}`;
};

export const verifyPassword = (plainPassword: string, storedHash: string): boolean => {
    if (!isPasswordHash(storedHash)) {
        return false;
    }

    const parts = storedHash.split(":");
    if (parts.length !== 3) {
        return false;
    }

    const saltPart = parts[1];
    const expectedPart = parts[2];
    if (!saltPart || !expectedPart) {
        return false;
    }

    const salt = fromB64Url(saltPart);
    const expected = fromB64Url(expectedPart);
    const pepper = requireEnv("ACCOUNT_PASSWORD_PEPPER");
    const actual = scryptSync(`${plainPassword}${pepper}`, salt, expected.length, {
        N: SCRYPT_N,
        r: SCRYPT_R,
        p: SCRYPT_P,
    });

    if (actual.length !== expected.length) {
        return false;
    }

    return timingSafeEqual(actual, expected);
};
