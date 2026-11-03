const path = require("node:path");
const PDFDocument = require("pdfkit");

const PAGE_WIDTH = 1535;
const PAGE_HEIGHT = 1024;
const TEMPLATE_PATH = path.join(__dirname, "..", "..", "frontend", "certificate", "CompleteAllModule-Certificate.jpg");

function renderCompletionCertificate({ fullName, issuedDate }) {
    return new Promise((resolve, reject) => {
        const document = new PDFDocument({
            size: [PAGE_WIDTH, PAGE_HEIGHT],
            margin: 0,
            compress: true
        });
        const chunks = [];

        document.on("data", (chunk) => chunks.push(chunk));
        document.on("end", () => resolve(Buffer.concat(chunks)));
        document.on("error", reject);

        document.info.Title = "GoLearning Certificate of Completion";
        document.info.Author = "GoLearning";
        document.image(TEMPLATE_PATH, 0, 0, { width: PAGE_WIDTH, height: PAGE_HEIGHT });

        const nameX = 420;
        const nameY = 433;
        const nameWidth = 710;
        const nameHeight = 75;
        let nameFontSize = 44;
        document.font("Helvetica-Bold").fillColor("#124987");
        while (nameFontSize > 12) {
            document.fontSize(nameFontSize);
            if (document.widthOfString(fullName) <= nameWidth - 16) break;
            nameFontSize -= 2;
        }
        document.fontSize(nameFontSize).text(fullName, nameX, nameY, {
            width: nameWidth,
            height: nameHeight,
            align: "center",
            valign: "center",
            lineGap: 0
        });

        document.font("Helvetica-Bold").fontSize(18).fillColor("#ffffff")
            .text(issuedDate, 525, 917, {
                width: 335,
                height: 27,
                align: "center",
                valign: "center",
                lineBreak: false
            });
        document.end();
    });
}

module.exports = { renderCompletionCertificate };
