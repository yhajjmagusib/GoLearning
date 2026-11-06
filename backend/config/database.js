const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
    throw new Error("Missing DATABASE_URL. Add the Supabase PostgreSQL connection string to backend/.env.");
}

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" || process.env.DATABASE_SSL === "true"
        ? { rejectUnauthorized: false }
        : undefined,
    max: Number(process.env.DB_POOL_MAX || 5),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000
});

const insertIdTables = new Set(["users", "modules", "lessons", "quizzes", "assignments"]);
const conflictTargets = {
    student_progress: "student_id, module_id",
    module_learning_notes: "module_id",
    assignment_checklist_progress: "assignment_id, student_id",
    assignment_submissions: "student_id, assignment_id",
    sessions: "session_id"
};

function translateMySqlToPostgres(sql) {
    let text = sql.trim().replace(/;\s*$/, "");
    const insertIgnore = /^INSERT\s+IGNORE\s+INTO\s+/i.test(text);
    text = text.replace(/^INSERT\s+IGNORE\s+INTO\s+/i, "INSERT INTO ");
    text = text.replace(/JSON_ARRAY\(\)/gi, "'[]'::jsonb");
    text = text.replace(/DATE_FORMAT\(issued_at,\s*'%M %e, %Y'\)/gi, "to_char(issued_at, 'FMMonth FMDD, YYYY')");
    text = text.replace(/\bVALUES\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/g, "EXCLUDED.$1");
    let parameterIndex = 0;
    text = text.replace(/\?/g, () => `$${++parameterIndex}`);
    if (insertIgnore) text += " ON CONFLICT DO NOTHING";

    const insertMatch = text.match(/^INSERT\s+INTO\s+([A-Za-z_][A-Za-z0-9_]*)\b/i);
    if (/ON DUPLICATE KEY UPDATE/i.test(text)) {
        const table = insertMatch?.[1]?.toLowerCase();
        const target = conflictTargets[table];
        if (!target) throw new Error(`No PostgreSQL conflict target configured for ${table}.`);
        text = text.replace(/ON DUPLICATE KEY UPDATE/i, `ON CONFLICT (${target}) DO UPDATE SET`);
    }
    if (insertMatch && insertIdTables.has(insertMatch[1].toLowerCase()) && !/\bRETURNING\b/i.test(text)) {
        text += " RETURNING id";
    }
    return text;
}

function metadata(result) {
    return { affectedRows: result.rowCount, insertId: result.rows[0]?.id };
}

function rowsWithMetadata(result) {
    // mysql2 returns metadata as the first value for INSERT/UPDATE/DELETE,
    // while SELECT returns rows. Keep both calling styles working during the
    // PostgreSQL migration.
    Object.assign(result.rows, metadata(result));
    return result.rows;
}

function makeConnection(client) {
    async function execute(sql, parameters = []) {
        const result = await client.query(translateMySqlToPostgres(sql), parameters);
        return [rowsWithMetadata(result), metadata(result)];
    }
    return {
        execute,
        query: execute,
        beginTransaction: () => client.query("BEGIN"),
        commit: () => client.query("COMMIT"),
        rollback: () => client.query("ROLLBACK"),
        release: () => client.release()
    };
}

const pool = {
    async execute(sql, parameters = []) {
        const result = await pgPool.query(translateMySqlToPostgres(sql), parameters);
        return [rowsWithMetadata(result), metadata(result)];
    },
    async query(sql, parameters = []) {
        const result = await pgPool.query(translateMySqlToPostgres(sql), parameters);
        return [rowsWithMetadata(result), metadata(result)];
    },
    async getConnection() { return makeConnection(await pgPool.connect()); },
    async end() { await pgPool.end(); }
};

async function testConnection() {
    const [rows] = await pool.query("SELECT 1 AS connected");
    return Number(rows[0].connected) === 1;
}

module.exports = { pool, testConnection };
