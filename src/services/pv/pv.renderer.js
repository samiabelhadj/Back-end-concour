const PdfPrinter = require('pdfmake');
const fonts      = require('./fonts');

function renderPDF(docDefinition) {
  const printer = new PdfPrinter(fonts);
  const doc     = printer.createPdfKitDocument(docDefinition);
  return doc; // this is a readable stream
}

module.exports = { renderPDF };