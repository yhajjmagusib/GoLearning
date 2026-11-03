function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ error: "Please log in to continue." });
    }

    next();
}

function requireAdmin(req, res, next) {
    if (!req.session.user || req.session.user.role !== "admin") {
        return res.status(403).json({ error: "Administrator access is required." });
    }

    next();
}

module.exports = { requireAuth, requireAdmin };
