const LEARNING_NOTES_MAX_BYTES = Number(process.env.LEARNING_NOTES_MAX_BYTES || 10 * 1024 * 1024);
if (!Number.isSafeInteger(LEARNING_NOTES_MAX_BYTES) || LEARNING_NOTES_MAX_BYTES < 1
    || LEARNING_NOTES_MAX_BYTES > 4294967295) {
    throw new Error("LEARNING_NOTES_MAX_BYTES must be a whole number from 1 to 4,294,967,295.");
}

module.exports = { LEARNING_NOTES_MAX_BYTES };
