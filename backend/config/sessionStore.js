const session = require("express-session");

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;

class MySQLSessionStore extends session.Store {
    constructor(pool) {
        super();
        this.pool = pool;
        this.cleanupTimer = setInterval(() => {
            this.pool.execute("DELETE FROM sessions WHERE expires_at <= CURRENT_TIMESTAMP")
                .catch((error) => this.emit("error", error));
        }, CLEANUP_INTERVAL_MS);
        this.cleanupTimer.unref();
    }

    get(sessionId, callback) {
        this.pool.execute(
            "SELECT session_data, expires_at FROM sessions WHERE session_id = ?",
            [sessionId]
        ).then(([rows]) => {
            if (!rows.length) return callback(null, null);
            if (new Date(rows[0].expires_at).getTime() <= Date.now()) {
                this.destroy(sessionId, (error) => callback(error, null));
                return;
            }
            let storedSession;
            try {
                storedSession = JSON.parse(rows[0].session_data);
            } catch (error) {
                callback(error);
                return;
            }
            callback(null, storedSession);
        }).catch(callback);
    }

    set(sessionId, storedSession, callback = () => {}) {
        const expiresAt = storedSession.cookie && storedSession.cookie.expires
            ? new Date(storedSession.cookie.expires)
            : new Date(Date.now() + SESSION_TTL_MS);
        this.pool.execute(
            `INSERT INTO sessions (session_id, session_data, expires_at)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE session_data = VALUES(session_data), expires_at = VALUES(expires_at)`,
            [sessionId, JSON.stringify(storedSession), expiresAt]
        ).then(() => callback()).catch(callback);
    }

    destroy(sessionId, callback = () => {}) {
        this.pool.execute("DELETE FROM sessions WHERE session_id = ?", [sessionId])
            .then(() => callback()).catch(callback);
    }

    touch(sessionId, storedSession, callback = () => {}) {
        const expiresAt = storedSession.cookie && storedSession.cookie.expires
            ? new Date(storedSession.cookie.expires)
            : new Date(Date.now() + SESSION_TTL_MS);
        this.pool.execute(
            "UPDATE sessions SET expires_at = ? WHERE session_id = ?",
            [expiresAt, sessionId]
        ).then(() => callback()).catch(callback);
    }

    close() {
        clearInterval(this.cleanupTimer);
    }
}

module.exports = MySQLSessionStore;
