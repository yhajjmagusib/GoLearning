const crypto = require("node:crypto");

function storageConfig() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "learning-notes";
    if (!url || !key) {
        throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for file storage.");
    }
    return { url: url.replace(/\/$/, ""), key, bucket };
}

function headers(config, extra = {}) {
    return { apikey: config.key, Authorization: `Bearer ${config.key}`, ...extra };
}

function objectUrl(config, fileName) {
    return `${config.url}/storage/v1/object/${encodeURIComponent(config.bucket)}/${encodeURIComponent(fileName)}`;
}

async function readError(response) {
    const body = await response.text();
    return body || `${response.status} ${response.statusText}`;
}

async function uploadLearningNotes(buffer, fileName) {
    const config = storageConfig();
    const response = await fetch(objectUrl(config, fileName), {
        method: "POST",
        headers: headers(config, { "Content-Type": "application/pdf", "x-upsert": "true" }),
        body: buffer
    });
    if (!response.ok) throw new Error(`Supabase Storage upload failed: ${await readError(response)}`);
}

async function removeLearningNotesFile(fileName) {
    if (!fileName || !/^[0-9a-f-]{36}\.pdf$/i.test(fileName)) return;
    const config = storageConfig();
    const response = await fetch(`${config.url}/storage/v1/object/remove`, {
        method: "POST",
        headers: headers(config, { "Content-Type": "application/json" }),
        body: JSON.stringify({ prefixes: [`${config.bucket}/${fileName}`] })
    });
    if (!response.ok && response.status !== 404) {
        throw new Error(`Supabase Storage delete failed: ${await readError(response)}`);
    }
}

async function createLearningNotesSignedUrl(fileName, expiresIn = 300) {
    if (!fileName || !/^[0-9a-f-]{36}\.pdf$/i.test(fileName)) {
        throw new Error("The stored learning notes filename is invalid.");
    }
    const config = storageConfig();
    const response = await fetch(`${config.url}/storage/v1/object/sign/${encodeURIComponent(config.bucket)}/${encodeURIComponent(fileName)}`, {
        method: "POST",
        headers: headers(config, { "Content-Type": "application/json" }),
        body: JSON.stringify({ expiresIn })
    });
    if (!response.ok) throw new Error(`Supabase Storage signed URL failed: ${await readError(response)}`);
    const result = await response.json();
    const signedPath = result.signedURL || result.signedUrl;
    if (!signedPath) throw new Error("Supabase Storage did not return a signed URL.");
    return signedPath.startsWith("http") ? signedPath : `${config.url}/storage/v1${signedPath}`;
}

function newLearningNotesFileName() {
    return `${crypto.randomUUID()}.pdf`;
}

module.exports = {
    createLearningNotesSignedUrl,
    newLearningNotesFileName,
    removeLearningNotesFile,
    uploadLearningNotes
};
