import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

export const generatePDF = async (sessionId) => {
  const safeSessionId = String(sessionId);
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(safeSessionId)) {
    throw new Error("Invalid sessionId");
  }

  const doc = new PDFDocument();
  const pdfPath = path.join("storage", "reports", `${safeSessionId}.pdf`);

  doc.pipe(fs.createWriteStream(pdfPath));
  doc.text("YouTube Study Assistant Report");
  doc.text(`Session ID: ${safeSessionId}`);
  doc.end();

  return pdfPath;
};
