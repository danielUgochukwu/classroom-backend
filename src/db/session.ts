import { createHmac } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { session } from "./schema";
import { decryptTokenAtRest, encryptIndexedTokenAtRest } from "../security/secret-protection";

const getSessionIpHashSalt = (): string => {
    const salt = process.env.SESSION_IP_HASH_SALT;
    if (!salt) {
        throw new Error("SESSION_IP_HASH_SALT must be set to hash session IP addresses.");
    }
    return salt;
};

const normalizeIpAddress = (ipAddress: string): string => ipAddress.trim().toLowerCase();

const hashIpAddressOrNull = (ipAddress?: string | null): string | null => {
    if (!ipAddress || ipAddress.trim().length === 0) {
        return null;
    }

    return hashSessionIpAddress(ipAddress);
};

export const hashSessionIpAddress = (ipAddress: string): string =>
    createHmac("sha256", getSessionIpHashSalt())
        .update(normalizeIpAddress(ipAddress))
        .digest("hex");

export interface CreateSessionInput {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    userAgent?: string | null;
    ipAddress?: string | null;
}

export interface UpdateSessionInput {
    token?: string;
    expiresAt?: Date;
    userAgent?: string | null;
    ipAddress?: string | null;
}

const decryptSessionToken = (record: typeof session.$inferSelect): typeof session.$inferSelect => ({
    ...record,
    token: decryptTokenAtRest(record.token),
});

export const createSession = async (input: CreateSessionInput) => {
    const inserted = await db
        .insert(session)
        .values({
            id: input.id,
            userId: input.userId,
            token: encryptIndexedTokenAtRest(input.token),
            expiresAt: input.expiresAt,
            userAgent: input.userAgent ?? null,
            ipHash: hashIpAddressOrNull(input.ipAddress),
        })
        .returning();

    const created = inserted[0];
    return created ? decryptSessionToken(created) : null;
};

export const updateSession = async (sessionId: string, input: UpdateSessionInput) => {
    const values: Partial<typeof session.$inferInsert> = {};

    if ("token" in input && input.token !== undefined) {
        values.token = encryptIndexedTokenAtRest(input.token);
    }

    if (input.expiresAt !== undefined) {
        values.expiresAt = input.expiresAt;
    }

    if ("userAgent" in input) {
        values.userAgent = input.userAgent ?? null;
    }

    if ("ipAddress" in input) {
        values.ipHash = hashIpAddressOrNull(input.ipAddress);
    }

    if (Object.keys(values).length === 0) {
        return null;
    }

    const updated = await db
        .update(session)
        .set(values)
        .where(eq(session.id, sessionId))
        .returning();

    const row = updated[0];
    return row ? decryptSessionToken(row) : null;
};

export const getSessionById = async (sessionId: string) => {
    const rows = await db.select().from(session).where(eq(session.id, sessionId)).limit(1);
    const row = rows[0];
    return row ? decryptSessionToken(row) : null;
};

export const getSessionByToken = async (plainToken: string) => {
    const encryptedToken = encryptIndexedTokenAtRest(plainToken);
    const rows = await db.select().from(session).where(eq(session.token, encryptedToken)).limit(1);
    const row = rows[0];
    return row ? decryptSessionToken(row) : null;
};
