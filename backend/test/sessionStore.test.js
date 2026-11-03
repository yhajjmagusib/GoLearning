const test = require("node:test");
const assert = require("node:assert/strict");
const MySQLSessionStore = require("../config/sessionStore");

function createStore(initialRows = []) {
    const rows = new Map(initialRows.map((row) => [row.session_id, row]));
    const pool = {
        execute: async (sql, values) => {
            if (sql.startsWith("SELECT session_data")) {
                const row = rows.get(values[0]);
                return [row ? [row] : []];
            }
            if (sql.startsWith("INSERT INTO sessions")) {
                rows.set(values[0], { session_id: values[0], session_data: values[1], expires_at: values[2] });
                return [{ affectedRows: 1 }];
            }
            if (sql.startsWith("DELETE FROM sessions WHERE session_id")) {
                rows.delete(values[0]);
                return [{ affectedRows: 1 }];
            }
            if (sql.startsWith("UPDATE sessions")) {
                const row = rows.get(values[1]);
                if (row) row.expires_at = values[0];
                return [{ affectedRows: row ? 1 : 0 }];
            }
            if (sql.startsWith("DELETE FROM sessions WHERE expires_at")) return [{ affectedRows: 0 }];
            throw new Error(`Unexpected query: ${sql}`);
        }
    };
    const store = new MySQLSessionStore(pool);
    store.on("error", () => {});
    return { store, rows };
}

function callStore(store, method, ...args) {
    return new Promise((resolve, reject) => {
        store[method](...args, (error, result) => error ? reject(error) : resolve(result));
    });
}

test("persists and retrieves a session as JSON", async () => {
    const { store, rows } = createStore();
    const value = { user: { id: 8, role: "student" }, cookie: { expires: new Date(Date.now() + 60000) } };
    try {
        await callStore(store, "set", "sid-1", value);
        assert.equal(rows.has("sid-1"), true);
        assert.deepEqual(await callStore(store, "get", "sid-1"), JSON.parse(JSON.stringify(value)));
    } finally {
        store.close();
    }
});

test("does not return expired sessions and removes them", async () => {
    const { store, rows } = createStore([{
        session_id: "old",
        session_data: JSON.stringify({ user: { id: 1 } }),
        expires_at: new Date(Date.now() - 1000)
    }]);
    try {
        assert.equal(await callStore(store, "get", "old"), null);
        assert.equal(rows.has("old"), false);
    } finally {
        store.close();
    }
});

test("updates session expiry and destroys logged-out sessions", async () => {
    const { store, rows } = createStore([{
        session_id: "sid-2", session_data: "{}", expires_at: new Date(Date.now() + 1000)
    }]);
    try {
        await callStore(store, "touch", "sid-2", { cookie: { expires: new Date(Date.now() + 60000) } });
        assert.ok(new Date(rows.get("sid-2").expires_at) > new Date(Date.now() + 30000));
        await callStore(store, "destroy", "sid-2");
        assert.equal(rows.has("sid-2"), false);
    } finally {
        store.close();
    }
});
