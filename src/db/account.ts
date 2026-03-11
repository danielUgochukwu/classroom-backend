import { and, eq } from "drizzle-orm";
import { db } from "./index";
import { account } from "./schema";
import {
    decryptTokenAtRest,
    encryptTokenAtRest,
    hashPassword,
    isPasswordHash,
} from "../security/secret-protection";

const encryptOptionalToken = (token?: string | null): string | null => {
    if (token === undefined || token === null) {
        return null;
    }

    if (token.length === 0) {
        return null;
    }

    return encryptTokenAtRest(token);
};

const decryptOptionalToken = (token: string | null): string | null => {
    if (token === null) {
        return null;
    }

    return decryptTokenAtRest(token);
};

const hashOptionalPassword = (password?: string | null): string | null => {
    if (password === undefined || password === null) {
        return null;
    }

    if (password.length === 0) {
        return null;
    }

    return isPasswordHash(password) ? password : hashPassword(password);
};

const decryptAccountTokens = (record: typeof account.$inferSelect): typeof account.$inferSelect => ({
    ...record,
    accessToken: decryptOptionalToken(record.accessToken),
    refreshToken: decryptOptionalToken(record.refreshToken),
    idToken: decryptOptionalToken(record.idToken),
});

export interface CreateAccountInput {
    id: string;
    accountId: string;
    providerId: string;
    userId: string;
    accessToken?: string | null;
    refreshToken?: string | null;
    idToken?: string | null;
    accessTokenExpiresAt?: Date | null;
    refreshTokenExpiresAt?: Date | null;
    scope?: string | null;
    password?: string | null;
}

export interface UpdateAccountInput {
    accessToken?: string | null;
    refreshToken?: string | null;
    idToken?: string | null;
    accessTokenExpiresAt?: Date | null;
    refreshTokenExpiresAt?: Date | null;
    scope?: string | null;
    password?: string | null;
}

export const createAccount = async (input: CreateAccountInput) => {
    const inserted = await db
        .insert(account)
        .values({
            id: input.id,
            accountId: input.accountId,
            providerId: input.providerId,
            userId: input.userId,
            accessToken: encryptOptionalToken(input.accessToken),
            refreshToken: encryptOptionalToken(input.refreshToken),
            idToken: encryptOptionalToken(input.idToken),
            accessTokenExpiresAt: input.accessTokenExpiresAt ?? null,
            refreshTokenExpiresAt: input.refreshTokenExpiresAt ?? null,
            scope: input.scope ?? null,
            password: hashOptionalPassword(input.password),
        })
        .returning();

    const created = inserted[0];
    return created ? decryptAccountTokens(created) : null;
};

export const updateAccountById = async (accountIdValue: string, input: UpdateAccountInput) => {
    const values: Partial<typeof account.$inferInsert> = {};

    if ("accessToken" in input) {
        values.accessToken = encryptOptionalToken(input.accessToken);
    }

    if ("refreshToken" in input) {
        values.refreshToken = encryptOptionalToken(input.refreshToken);
    }

    if ("idToken" in input) {
        values.idToken = encryptOptionalToken(input.idToken);
    }

    if ("accessTokenExpiresAt" in input) {
        values.accessTokenExpiresAt = input.accessTokenExpiresAt ?? null;
    }

    if ("refreshTokenExpiresAt" in input) {
        values.refreshTokenExpiresAt = input.refreshTokenExpiresAt ?? null;
    }

    if ("scope" in input) {
        values.scope = input.scope ?? null;
    }

    if ("password" in input) {
        values.password = hashOptionalPassword(input.password);
    }

    if (Object.keys(values).length === 0) {
        return null;
    }

    const updated = await db
        .update(account)
        .set(values)
        .where(eq(account.id, accountIdValue))
        .returning();

    const row = updated[0];
    return row ? decryptAccountTokens(row) : null;
};

export const updateAccountByProviderAccountId = async (
    providerIdValue: string,
    providerAccountId: string,
    input: UpdateAccountInput
) => {
    const values: Partial<typeof account.$inferInsert> = {};

    if ("accessToken" in input) {
        values.accessToken = encryptOptionalToken(input.accessToken);
    }

    if ("refreshToken" in input) {
        values.refreshToken = encryptOptionalToken(input.refreshToken);
    }

    if ("idToken" in input) {
        values.idToken = encryptOptionalToken(input.idToken);
    }

    if ("accessTokenExpiresAt" in input) {
        values.accessTokenExpiresAt = input.accessTokenExpiresAt ?? null;
    }

    if ("refreshTokenExpiresAt" in input) {
        values.refreshTokenExpiresAt = input.refreshTokenExpiresAt ?? null;
    }

    if ("scope" in input) {
        values.scope = input.scope ?? null;
    }

    if ("password" in input) {
        values.password = hashOptionalPassword(input.password);
    }

    if (Object.keys(values).length === 0) {
        return null;
    }

    const updated = await db
        .update(account)
        .set(values)
        .where(and(eq(account.providerId, providerIdValue), eq(account.accountId, providerAccountId)))
        .returning();

    const row = updated[0];
    return row ? decryptAccountTokens(row) : null;
};

export const getAccountById = async (accountIdValue: string) => {
    const rows = await db.select().from(account).where(eq(account.id, accountIdValue)).limit(1);
    const row = rows[0];
    return row ? decryptAccountTokens(row) : null;
};

export const getAccountByProviderAccountId = async (providerIdValue: string, providerAccountId: string) => {
    const rows = await db
        .select()
        .from(account)
        .where(and(eq(account.providerId, providerIdValue), eq(account.accountId, providerAccountId)))
        .limit(1);

    const row = rows[0];
    return row ? decryptAccountTokens(row) : null;
};
