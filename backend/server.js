require("dotenv").config();

const path = require("node:path");
const express = require("express");
const session = require("express-session");
const { pool, testConnection } = require("./config/database");
const { requireAuth, requireAdmin } = require("./middleware/auth");
const MySQLSessionStore = require("./config/sessionStore");
const authRoutes = require("./routes/auth");
const moduleRoutes = require("./routes/modules");
const adminRoutes = require("./routes/admin");

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32
    || process.env.SESSION_SECRET.includes("replace-this")) {
    throw new Error("Set SESSION_SECRET to a random value at least 32 characters long in backend/.env.");
}

const app = express();
// Render terminates HTTPS at its proxy. Trust it so express-session can set
// Secure cookies for the Vercel frontend.
app.set("trust proxy", 1);
const frontendDirectory = path.join(__dirname, "..", "frontend");
const crossOriginDeployment = process.env.NODE_ENV === "production"
    || process.env.RENDER === "true"
    || Boolean(process.env.FRONTEND_URL);

function isAllowedOrigin(origin) {
    if (!origin) return false;
    const configuredOrigins = (process.env.FRONTEND_URL || "")
        .split(",")
        .map((value) => value.trim().replace(/\/$/, ""))
        .filter(Boolean);
    return configuredOrigins.includes(origin)
        || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
}

app.use((req, res, next) => {
    const origin = req.get("Origin");
    if (isAllowedOrigin(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
        res.setHeader("Vary", "Origin");
    }
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
});

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", async (req, res, next) => {
    try {
        await testConnection();
        res.json({ status: "ok", database: "connected" });
    } catch (error) {
        next(error);
    }
});

const sessionStore = new MySQLSessionStore(pool);
sessionStore.on("error", (error) => console.error("Session store maintenance failed:", error));
app.use(session({
    name: "golearning.sid",
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: crossOriginDeployment ? "none" : "lax",
        secure: crossOriginDeployment,
        maxAge: 8 * 60 * 60 * 1000
    }
}));

function serveProtectedPage(req, res, next) {
    if (!req.session.user) return res.redirect("/login.html");
    res.sendFile(path.join(frontendDirectory, req.path.slice(1)), (error) => {
        if (error) next(error);
    });
}

app.get("/dashboard.html", serveProtectedPage);
app.get("/module.html", serveProtectedPage);
app.use("/api/auth", authRoutes);
app.use("/api/modules", requireAuth, moduleRoutes.router);
app.use("/api/dashboard", requireAuth, moduleRoutes.dashboardRouter);
app.use("/api/admin", requireAdmin, adminRoutes);
app.use((req, res, next) => {
    let decodedPath;
    try {
        decodedPath = decodeURIComponent(req.path);
    } catch (error) {
        return next(error);
    }
    const resolvedPath = path.resolve(frontendDirectory, `.${decodedPath}`);
    const relativePath = path.relative(frontendDirectory, resolvedPath);
    if (relativePath.split(path.sep)[0].toLowerCase() === "certificate") {
        return res.status(404).json({ error: "Certificate templates are not directly accessible." });
    }
    next();
});
app.use(express.static(frontendDirectory));
app.use("/api", (req, res) => {
    res.status(404).json({ error: "API route not found." });
});

app.use((error, req, res, next) => {
    console.error("Request failed:", error);
    if (res.headersSent) return next(error);

    if (error.type === "entity.parse.failed") {
        return res.status(400).json({ error: "The request body must contain valid JSON." });
    }
    if (error.type === "entity.too.large") {
        return res.status(413).json({ error: "The request body is too large." });
    }
    if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "The PDF exceeds the configured file-size limit." });
    }
    if (error.code && error.code.startsWith("LIMIT_")) {
        return res.status(400).json({ error: "The upload must contain one PDF file." });
    }
    if (Number.isInteger(error.statusCode) && error.statusCode >= 400 && error.statusCode < 500) {
        return res.status(error.statusCode).json({ error: error.message });
    }
    if (error.code === "ER_DUP_ENTRY" || error.code === "23505") {
        return res.status(409).json({ error: "That value already exists." });
    }
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
        return res.status(400).json({ error: "The selected related record does not exist." });
    }
    if (error.code === "ECONNREFUSED" || error.code === "PROTOCOL_CONNECTION_LOST") {
        return res.status(503).json({ error: "The database is unavailable. Check that MySQL is running." });
    }
    res.status(500).json({ error: "The request could not be completed. Check the server log for details." });
});

const PORT = Number(process.env.PORT || 5000);
app.listen(PORT, () => console.log(`GoLearning is available at http://localhost:${PORT}`));
