import { eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { db } from "../db";
import { getSessionByToken } from "../db/session";
import { user } from "../db/schema";

const extractBearerToken = (authorizationHeader?: string): string | null => {
    if (!authorizationHeader) {
        return null;
    }

    const [scheme, token] = authorizationHeader.split(" ");
    if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
        return null;
    }

    const normalizedToken = token.trim();
    return normalizedToken.length > 0 ? normalizedToken : null;
};

const identityMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
    try {
        const token = extractBearerToken(req.headers.authorization);
        if (!token) {
            return next();
        }

        const activeSession = await getSessionByToken(token);
        if (!activeSession) {
            return next();
        }

        if (activeSession.expiresAt <= new Date()) {
            return next();
        }

        const roleResult = await db
            .select({ role: user.role })
            .from(user)
            .where(eq(user.id, activeSession.userId))
            .limit(1);

        const userRole = roleResult[0]?.role;
        if (userRole) {
            req.user = { ...req.user, role: userRole };
        }

        return next();
    } catch (error) {
        console.error("Identity middleware error:", error);
        return next();
    }
};

export default identityMiddleware;
