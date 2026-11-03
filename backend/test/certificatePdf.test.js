const test = require("node:test");
const assert = require("node:assert/strict");
const { renderCompletionCertificate } = require("../services/certificatePdf");

test("renders the supplied overall certificate as a landscape PDF", async () => {
    const pdf = await renderCompletionCertificate({
        fullName: "Alexandra Student",
        issuedDate: "October 29, 2026"
    });
    const contents = pdf.toString("latin1");

    assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
    assert.ok(contents.includes("/MediaBox [0 0 1535 1024]"));
    assert.ok(contents.includes("%%EOF"));
});

test("renders long registered names without failing", async () => {
    const pdf = await renderCompletionCertificate({
        fullName: "Alexandra".padEnd(150, " Student"),
        issuedDate: "October 29, 2026"
    });

    assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
});
