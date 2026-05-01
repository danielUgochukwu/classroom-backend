import AgentAPI from "apminsight";
AgentAPI.config();

import express from "express";
import cors from "cors";

import classRouter from "./routes/class.js";
import subjectRouter from "./routes/subjects.js";
import securityMiddleware from "./middleware/security.js";
import identityMiddleware from "./middleware/identity.js";

import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";

const app = express();
const PORT = Number(process.env.PORT) || 8000;

const frontendUrl = process.env.FRONTEND_URL;

if (!frontendUrl) {
  throw new Error("FRONTEND_URL must be set to an allowed origin");
}

app.set("trust proxy", 1);

app.use(
  cors({
    origin: frontendUrl,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Better Auth handler should stay before express.json()
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/", (_req, res) => {
  res.status(200).json({ message: "Classroom Management API" });
});

app.use(identityMiddleware);
app.use(securityMiddleware);

app.use("/api/classes", classRouter);
app.use("/api/subjects", subjectRouter);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
