import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/index.js";
import * as schema from "../db/schema/auth.js";

const betterAuthUrl = process.env.BETTER_AUTH_URL;
const frontendUrl = process.env.FRONTEND_URL;

if (!betterAuthUrl) {
    throw new Error("BETTER_AUTH_URL must be set for Better Auth callbacks and redirects");
}

if (!frontendUrl) {
    throw new Error("FRONTEND_URL must be set to an allowed origin");
}

export const auth = betterAuth({
    baseURL: betterAuthUrl,
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: [frontendUrl],
  database: drizzleAdapter(db, {
      provider: "pg",
      schema,
  }),
  emailAndPassword: {
    enabled: true,
    },
    user: {
        additionalFields: {
            role: {
              type: "string", required: false, defaultValue: 'student', input: true
            },
            imageCldPubId: {
                type: "string",required: false, input: true,
            }
      }
  }
});
