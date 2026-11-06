const fs = require("node:fs");
const path = require("node:path");

const inputPath = path.resolve(__dirname, "../../golearning (2).sql");
const schemaPath = path.resolve(__dirname, "../database/schema.supabase.sql");
const outputPath = path.resolve(__dirname, "../database/golearning.supabase.sql");

const source = fs.readFileSync(inputPath, "utf8");
const schema = fs.readFileSync(schemaPath, "utf8");

function splitTopLevel(text) {
    const parts = [];
    let start = 0;
    let depth = 0;
    let quote = false;
    let escaped = false;

    for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        if (quote) {
            if (escaped) escaped = false;
            else if (char === "\\") escaped = true;
            else if (char === "'") {
                if (text[i + 1] === "'") i += 1;
                else quote = false;
            }
            continue;
        }
        if (char === "'") quote = true;
        else if (char === "(") depth += 1;
        else if (char === ")") depth -= 1;
        else if (char === "," && depth === 0) {
            parts.push(text.slice(start, i).trim());
            start = i + 1;
        }
    }
    parts.push(text.slice(start).trim());
    return parts;
}

function extractTuples(valuesText) {
    const tuples = [];
    let start = -1;
    let depth = 0;
    let quote = false;
    let escaped = false;

    for (let i = 0; i < valuesText.length; i += 1) {
        const char = valuesText[i];
        if (quote) {
            if (escaped) escaped = false;
            else if (char === "\\") escaped = true;
            else if (char === "'") {
                if (valuesText[i + 1] === "'") i += 1;
                else quote = false;
            }
            continue;
        }
        if (char === "'") quote = true;
        else if (char === "(") {
            if (depth === 0) start = i + 1;
            depth += 1;
        } else if (char === ")") {
            depth -= 1;
            if (depth === 0) tuples.push(valuesText.slice(start, i));
        }
    }
    return tuples;
}

function postgresLiteral(token, column) {
    const value = token.trim();
    const booleanColumns = new Set([
        "is_required", "requires_approval", "is_active", "passed",
        "is_completed", "is_unlocked"
    ]);
    if (booleanColumns.has(column) && value === "1") return "TRUE";
    if (booleanColumns.has(column) && value === "0") return "FALSE";
    if (value === "NULL" || !value.startsWith("'")) return value;

    // Dollar-quoted strings avoid conflicts between MySQL escapes, JSON quotes,
    // apostrophes, and PostgreSQL's E-string rules.
    let body = value.slice(1, -1).replaceAll("''", "'");
    body = body.replace(/\\(0|b|f|n|r|t|v|\\|"|')/g, (_, escaped) => ({
        0: "\0", b: "\b", f: "\f", n: "\n", r: "\r", t: "\t", v: "\v",
        "\\": "\\", '"': '"', "'": "'"
    }[escaped]));
    const tag = "$golearning$";
    if (body.includes(tag)) throw new Error("Unexpected dollar-quote delimiter in imported data.");
    return `${tag}${body}${tag}`;
}

const inserts = [];
const insertPattern = /INSERT INTO `([^`]+)` \(([^)]+)\) VALUES\s*([\s\S]*?);/g;
let match;
while ((match = insertPattern.exec(source)) !== null) {
    const table = match[1];
    const columns = match[2].split(",").map((column) => column.replaceAll("`", "").trim());
    const tuples = extractTuples(match[3]);
    const renderedTuples = tuples.map((tuple) => {
        const values = splitTopLevel(tuple);
        if (values.length !== columns.length) {
            throw new Error(`Column/value count mismatch in ${table}.`);
        }
        return `(${values.map((value, index) => postgresLiteral(value, columns[index])).join(", ")})`;
    });
    inserts.push({ table, sql: `INSERT INTO ${table} (${columns.join(", ")}) VALUES\n${renderedTuples.join(",\n")};` });
}

const order = [
    "users", "modules", "lessons", "quizzes", "assignments", "quiz_results",
    "assignment_submissions", "assignment_checklist_progress", "student_progress",
    "module_learning_notes", "course_certificates", "sessions"
];
inserts.sort((a, b) => order.indexOf(a.table) - order.indexOf(b.table));

const identityTables = [
    "users", "modules", "lessons", "quizzes", "quiz_results", "assignments",
    "assignment_submissions", "student_progress", "module_learning_notes"
];
const resetSequences = identityTables.map((table) =>
    `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE(MAX(id), 1), true) FROM ${table};`
).join("\n");

const output = [
    "-- Generated from golearning (2).sql (MariaDB dump).",
    "-- Do not run this file against MySQL. Run it in Supabase SQL Editor.",
    "",
    schema.trim(),
    "",
    "-- Imported application data",
    inserts.map((item) => item.sql).join("\n\n"),
    "",
    "-- Keep future generated IDs above the imported IDs",
    resetSequences,
    ""
].join("\n");

fs.writeFileSync(outputPath, output, "utf8");
console.log(`Wrote ${outputPath} (${inserts.length} INSERT statements).`);
