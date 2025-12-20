import express from "express";
import cors from "cors";
import sessionRoutes from "./routes/sessionRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import quizRoutes from "./routes/quizRoutes.js";
import exportRoutes from "./routes/exportRoutes.js";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

app.use(cors());
app.use(express.json());

// Development helper: loosen CSP and allow devtools/extension connections
app.use((req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
        // allow same-origin and devtools-related connect requests in dev
        res.setHeader(
            'Content-Security-Policy',
            "default-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' http: https: ws:;"
        );
    }
    next();
});

// Provide a placeholder for Chrome DevTools extension probe to avoid 404 noise
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
    if (process.env.NODE_ENV === 'production') return res.status(404).end();
    res.json({ name: 'devtools-probe', description: 'placeholder for devtools' });
});

app.use("/api/session", sessionRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/export", exportRoutes);

// Serve frontend static files (production build) if available
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.join(__dirname, "..", "Frontend", "dist");
import fs from 'fs';

if (fs.existsSync(frontendDist)) {
    // Ensure permissive CSP on static and SPA responses in development to avoid blocking devtools probes
    app.use((req, res, next) => {
        // set a permissive CSP for local development only
        if (process.env.NODE_ENV !== 'production') {
            res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' http: https: ws:;");
        }
        return next();
    });

    app.use(express.static(frontendDist));

    // Fallback: serve index.html for any non-API GET requests (avoid path-to-regexp issues)
    app.use((req, res, next) => {
        if (req.method !== 'GET') return next();
        if (req.path.startsWith('/api/')) return next();
        // ensure index.html responses include the permissive CSP in dev
        if (process.env.NODE_ENV !== 'production') {
            res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' http: https: ws:;");
        }
        res.sendFile(path.join(frontendDist, 'index.html'));
    });
} else {
    console.warn(`Frontend build not found at ${frontendDist}. Skipping static SPA serving.`);
}

// Global error handler
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

export default app;