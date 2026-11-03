const test = require("node:test");
const assert = require("node:assert/strict");
const { combineLegacyLessons } = require("../services/legacyLessons");

test("combines legacy lesson titles and content in their existing order", () => {
    assert.equal(
        combineLegacyLessons([
            { title: "Topic one", content: "First paragraph.\nSecond paragraph." },
            { title: "Topic two", content: "Another topic." }
        ]),
        "Topic one\n\nFirst paragraph.\nSecond paragraph.\n\nTopic two\n\nAnother topic."
    );
});

test("leaves a module with no legacy lessons without fabricated content", () => {
    assert.equal(combineLegacyLessons([]), "");
});
