// utils/pdfService.js
// Generates PDF bills and GST invoices for TechSphere orders
// Uses pdfkit — no external services needed
// Run: npm install pdfkit

const PDFDocument = require('pdfkit');

// ─── Config ───────────────────────────────────────────────────────────────────
const COMPANY = {
  name:    'Jeecom Information Technology',
  address: 'Sector 4, Urban Estate',
  city:    'Gurugram, Haryana — 122001',
  phone:   '+91 87895 52086',
  email:   process.env.GMAIL_USER || 'jeecominformationtechnology@gmail.com',
  gstin:   process.env.COMPANY_GSTIN || '03AABCT1332L000',  // Set in .env
  pan:     process.env.COMPANY_PAN   || 'AABCT1332L',       // Set in .env
  website: 'www.jeecominformationtech.in',
};

// India GST rate (18% for electronics — split 9% CGST + 9% SGST for intra-state)
const GST_RATE = 0.18;

function formatINR(amount) {
  return '\u20B9' + Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

// Convert number to words (for invoice total)
function numberToWords(num) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';

  function helper(n) {
    if (n === 0) return '';
    if (n < 20) return ones[n] + ' ';
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '') + ' ';
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred ' + helper(n % 100);
    if (n < 100000) return helper(Math.floor(n / 1000)) + 'Thousand ' + helper(n % 1000);
    if (n < 10000000) return helper(Math.floor(n / 100000)) + 'Lakh ' + helper(n % 100000);
    return helper(Math.floor(n / 10000000)) + 'Crore ' + helper(n % 10000000);
  }

  return helper(Math.floor(num)).trim() + ' Rupees Only';
}

// ─── Draw helpers ─────────────────────────────────────────────────────────────

function drawHLine(doc, y, x1 = 50, x2 = 560, color = '#e2ddd6', thickness = 0.5) {
  doc.moveTo(x1, y).lineTo(x2, y).strokeColor(color).lineWidth(thickness).stroke();
}

function drawRect(doc, x, y, w, h, fillColor) {
  doc.rect(x, y, w, h).fill(fillColor);
}

// ═════════════════════════════════════════════════════════════════════════════
// BILL PDF — Standard invoice sent with every order confirmation email
// ═════════════════════════════════════════════════════════════════════════════
const generateBillPDF = (order) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];

      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const pageWidth = 595;
      const contentWidth = pageWidth - 100;

      // ── Header ──────────────────────────────────────────────────────────────
      drawRect(doc, 0, 0, pageWidth, 90, '#1a3a5c');

      doc.fontSize(22).font('Helvetica-Bold').fillColor('#ffffff')
        .text('JEECOM', 50, 22);
      doc.fontSize(9).font('Helvetica').fillColor('#d4a843')
        .text('INFORMATION TECHNOLOGY', 50, 48);
      doc.fontSize(8).fillColor('rgba(255,255,255,0.7)')
        .text(COMPANY.address, 50, 62)
        .text(`${COMPANY.city} | ${COMPANY.phone}`, 50, 74);

      // Bill title on right
      doc.fontSize(18).font('Helvetica-Bold').fillColor('#d4a843')
        .text('INVOICE', 400, 25, { width: 145, align: 'right' });
      doc.fontSize(9).font('Helvetica').fillColor('rgba(255,255,255,0.8)')
        .text(`#${order.orderNumber}`, 400, 50, { width: 145, align: 'right' });
      doc.fontSize(8).fillColor('rgba(255,255,255,0.6)')
        .text(formatDate(order.createdAt), 400, 65, { width: 145, align: 'right' });

      // Gold accent line
      drawRect(doc, 0, 90, pageWidth, 3, '#b8860b');

      let y = 110;

      // ── Bill To / Order Info ─────────────────────────────────────────────────
      // Left: Bill To
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#9a948e')
        .text('BILL TO', 50, y, { characterSpacing: 1 });
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a1714')
        .text(order.customer.name, 50, y + 14);
      doc.fontSize(9).font('Helvetica').fillColor('#5a5650')
        .text(order.customer.email, 50, y + 28);
      if (order.customer.phone)
        doc.text(order.customer.phone, 50, y + 40);
      if (order.customer.address) {
        doc.text(order.customer.address, 50, y + 52, { width: 220 });
      }

      // Right: Order Details box
      drawRect(doc, 350, y - 5, 210, 90, '#f7f6f3');
      doc.rect(350, y - 5, 210, 90).strokeColor('#e2ddd6').lineWidth(0.5).stroke();

      const infoData = [
        ['Order No.', `#${order.orderNumber}`],
        ['Date', formatDate(order.createdAt)],
        ['Payment', order.paymentMethod],
        ['Status', order.status],
      ];
      infoData.forEach(([label, value], i) => {
        const iy = y + i * 18;
        doc.fontSize(8).font('Helvetica').fillColor('#9a948e').text(label, 360, iy + 3);
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#1a3a5c').text(value, 440, iy + 3, { width: 115, align: 'right' });
      });

      y += 115;
      drawHLine(doc, y);
      y += 15;

      // ── Items Table ──────────────────────────────────────────────────────────
      // Table header
      drawRect(doc, 50, y, contentWidth, 22, '#1a3a5c');
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
      doc.text('ITEM DESCRIPTION', 58, y + 7);
      doc.text('QTY', 340, y + 7, { width: 40, align: 'center' });
      doc.text('UNIT PRICE', 385, y + 7, { width: 80, align: 'right' });
      doc.text('AMOUNT', 470, y + 7, { width: 80, align: 'right' });

      y += 22;

      // Table rows
      order.items.forEach((item, i) => {
        const rowBg = i % 2 === 0 ? '#ffffff' : '#f9f8f6';
        drawRect(doc, 50, y, contentWidth, 22, rowBg);

        doc.fontSize(9).font('Helvetica').fillColor('#1a1714')
          .text(item.name, 58, y + 7, { width: 275, ellipsis: true });
        doc.fillColor('#5a5650')
          .text(item.quantity.toString(), 340, y + 7, { width: 40, align: 'center' });
        doc.text(formatINR(item.price), 385, y + 7, { width: 80, align: 'right' });
        doc.font('Helvetica-Bold').fillColor('#1a1714')
          .text(formatINR(item.price * item.quantity), 470, y + 7, { width: 80, align: 'right' });

        // Row border
        doc.rect(50, y, contentWidth, 22).strokeColor('#e2ddd6').lineWidth(0.3).stroke();
        y += 22;
      });

      // ── Totals ───────────────────────────────────────────────────────────────
      y += 8;

      const totalsX = 370;
      const totalsValX = 470;
      const totalsW = 90;

      // Subtotal row
      drawHLine(doc, y, totalsX, 560);
      y += 6;
      doc.fontSize(9).font('Helvetica').fillColor('#5a5650')
        .text('Subtotal:', totalsX, y)
        .text(formatINR(order.totalAmount), totalsValX, y, { width: totalsW, align: 'right' });
      y += 16;

      // Payment method row
      doc.fontSize(9).font('Helvetica').fillColor('#5a5650')
        .text('Payment Method:', totalsX, y)
        .text(order.paymentMethod, totalsValX, y, { width: totalsW, align: 'right' });
      y += 10;

      drawHLine(doc, y, totalsX, 560, '#1a3a5c', 1);
      y += 8;

      // Grand total
      drawRect(doc, 365, y - 4, 200, 26, '#1a3a5c');
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff')
        .text('TOTAL AMOUNT:', totalsX + 5, y + 4)
        .text(formatINR(order.totalAmount), totalsValX, y + 4, { width: totalsW, align: 'right' });
      y += 36;

      // Amount in words
      doc.fontSize(8).font('Helvetica').fillColor('#9a948e')
        .text(`Amount in Words: ${numberToWords(order.totalAmount)}`, 50, y);
      y += 25;

      // ── Footer ───────────────────────────────────────────────────────────────
      drawHLine(doc, y, 50, 560, '#b8860b', 1);
      y += 10;

      doc.fontSize(8).font('Helvetica').fillColor('#9a948e')
        .text('Thank you for choosing Jeecom Information Technology! For any queries, contact us at ' + COMPANY.email, 50, y, { align: 'center', width: contentWidth });
      y += 14;
      doc.fontSize(7).fillColor('#cdc7bd')
        .text('This is a computer-generated invoice and does not require a signature.', 50, y, { align: 'center', width: contentWidth });

      // Page border
      doc.rect(20, 20, pageWidth - 40, doc.page.height - 40)
        .strokeColor('#e2ddd6').lineWidth(0.5).stroke();

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

// ═════════════════════════════════════════════════════════════════════════════
// GST INVOICE PDF — Full tax invoice with GSTIN, CGST, SGST breakdowns
// ═════════════════════════════════════════════════════════════════════════════
const generateGSTInvoicePDF = (order) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];

      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const pageWidth = 595;
      const contentWidth = pageWidth - 100;

      // Calculate tax — work backwards from GST-inclusive total
      // If total already includes GST: taxable = total / 1.18
      // Items are assumed GST-inclusive at 18%
      const taxableAmount   = Math.round(order.totalAmount / (1 + GST_RATE));
      const totalGST        = order.totalAmount - taxableAmount;
      const cgst            = Math.round(totalGST / 2);
      const sgst            = totalGST - cgst;

      // GST invoice number = INV- prefix + order number
      const invoiceNumber = `INV-${order.orderNumber}`;

      // ── Header ──────────────────────────────────────────────────────────────
      drawRect(doc, 0, 0, pageWidth, 95, '#1a3a5c');
      doc.fontSize(20).font('Helvetica-Bold').fillColor('#ffffff').text('JEECOM', 50, 20);
      doc.fontSize(8).font('Helvetica').fillColor('#d4a843').text('INFORMATION TECHNOLOGY', 50, 44);
      doc.fontSize(7.5).fillColor('rgba(255,255,255,0.7)')
        .text(COMPANY.address, 50, 56)
        .text(COMPANY.city, 50, 67)
        .text(`GSTIN: ${COMPANY.gstin}  |  PAN: ${COMPANY.pan}`, 50, 78);

      doc.fontSize(16).font('Helvetica-Bold').fillColor('#d4a843')
        .text('TAX INVOICE', 350, 20, { width: 195, align: 'right' });
      doc.fontSize(8).font('Helvetica').fillColor('rgba(255,255,255,0.75)')
        .text(`Invoice No: ${invoiceNumber}`, 350, 44, { width: 195, align: 'right' })
        .text(`Date: ${formatDate(order.createdAt)}`, 350, 56, { width: 195, align: 'right' })
        .text(`Order Ref: #${order.orderNumber}`, 350, 68, { width: 195, align: 'right' });

      drawRect(doc, 0, 95, pageWidth, 3, '#b8860b');

      let y = 112;

      // ── Billed To + Ship To ──────────────────────────────────────────────────
      // Left box: Bill To
      doc.rect(50, y, 240, 95).strokeColor('#e2ddd6').lineWidth(0.5).stroke();
      drawRect(doc, 50, y, 240, 16, '#f0ede8');
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#5a5650')
        .text('BILLED TO', 58, y + 4, { characterSpacing: 0.8 });

      doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a1714')
        .text(order.customer.name, 58, y + 22);
      doc.fontSize(8).font('Helvetica').fillColor('#5a5650')
        .text(order.customer.email, 58, y + 35)
        .text(order.customer.phone || '', 58, y + 47);
      if (order.customer.address)
        doc.text(order.customer.address, 58, y + 59, { width: 225 });

      // GST number if customer provided it
      if (order.customer.gstin) {
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#b8860b')
          .text(`GSTIN: ${order.customer.gstin}`, 58, y + 80);
      }

      // Right box: Invoice Summary
      doc.rect(310, y, 240, 95).strokeColor('#e2ddd6').lineWidth(0.5).stroke();
      drawRect(doc, 310, y, 240, 16, '#f0ede8');
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#5a5650')
        .text('INVOICE DETAILS', 318, y + 4, { characterSpacing: 0.8 });

      const detailRows = [
        ['Invoice No.', invoiceNumber],
        ['Invoice Date', formatDate(order.createdAt)],
        ['Payment Mode', order.paymentMethod],
        ['Place of Supply', 'Haryana (06)'],
        ['Supply Type', 'Intra-State (CGST+SGST)'],
      ];
      detailRows.forEach(([label, val], i) => {
        const ry = y + 22 + i * 14;
        doc.fontSize(7.5).font('Helvetica').fillColor('#9a948e').text(label, 318, ry);
        doc.font('Helvetica-Bold').fillColor('#1a3a5c').text(val, 400, ry, { width: 145, align: 'right' });
      });

      y += 110;

      // ── Items Table ──────────────────────────────────────────────────────────
      drawRect(doc, 50, y, contentWidth, 20, '#1a3a5c');
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff');
      doc.text('#',  58, y + 6, { width: 15 });
      doc.text('DESCRIPTION', 75, y + 6, { width: 185 });
      doc.text('HSN', 263, y + 6, { width: 40, align: 'center' });
      doc.text('QTY', 305, y + 6, { width: 30, align: 'center' });
      doc.text('UNIT PRICE', 338, y + 6, { width: 60, align: 'right' });
      doc.text('TAXABLE', 400, y + 6, { width: 55, align: 'right' });
      doc.text('GST', 458, y + 6, { width: 40, align: 'right' });
      doc.text('TOTAL', 500, y + 6, { width: 55, align: 'right' });
      y += 20;

      // HSN code for electronics = 8471
      order.items.forEach((item, i) => {
        const rowTaxable = Math.round((item.price * item.quantity) / (1 + GST_RATE));
        const rowGST     = item.price * item.quantity - rowTaxable;
        const rowBg      = i % 2 === 0 ? '#ffffff' : '#f9f8f6';
        const rowH       = 20;

        drawRect(doc, 50, y, contentWidth, rowH, rowBg);
        doc.rect(50, y, contentWidth, rowH).strokeColor('#e2ddd6').lineWidth(0.3).stroke();

        doc.fontSize(8).font('Helvetica').fillColor('#5a5650')
          .text((i + 1).toString(), 58, y + 6, { width: 15 });
        doc.fillColor('#1a1714')
          .text(item.name, 75, y + 6, { width: 185, ellipsis: true });
        doc.fillColor('#5a5650')
          .text('8471', 263, y + 6, { width: 40, align: 'center' })
          .text(item.quantity.toString(), 305, y + 6, { width: 30, align: 'center' })
          .text(formatINR(item.price), 338, y + 6, { width: 60, align: 'right' })
          .text(formatINR(rowTaxable), 400, y + 6, { width: 55, align: 'right' })
          .text(formatINR(rowGST), 458, y + 6, { width: 40, align: 'right' });
        doc.font('Helvetica-Bold').fillColor('#1a1714')
          .text(formatINR(item.price * item.quantity), 500, y + 6, { width: 55, align: 'right' });

        y += rowH;
      });

      y += 10;

      // ── Tax Summary Box ──────────────────────────────────────────────────────
      // Left: tax breakdown table
      const taxBoxY = y;
      doc.rect(50, taxBoxY, 270, 80).strokeColor('#e2ddd6').lineWidth(0.5).stroke();
      drawRect(doc, 50, taxBoxY, 270, 16, '#f0ede8');
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#5a5650')
        .text('TAX SUMMARY', 58, taxBoxY + 4, { characterSpacing: 0.8 });

      // Tax table headers
      const txh = taxBoxY + 20;
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#9a948e')
        .text('TAX TYPE', 58, txh)
        .text('RATE', 140, txh, { width: 40, align: 'right' })
        .text('TAXABLE AMT', 185, txh, { width: 75, align: 'right' })
        .text('TAX AMT', 265, txh, { width: 50, align: 'right' });

      drawHLine(doc, txh + 12, 58, 315);

      const taxRows = [
        ['CGST', '9%', formatINR(taxableAmount), formatINR(cgst)],
        ['SGST', '9%', '', formatINR(sgst)],
        ['TOTAL GST', '18%', formatINR(taxableAmount), formatINR(totalGST)],
      ];

      taxRows.forEach(([type, rate, base, tax], i) => {
        const ty = txh + 18 + i * 14;
        const isBold = i === 2;
        doc.fontSize(8)
          .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
          .fillColor(isBold ? '#1a3a5c' : '#1a1714')
          .text(type, 58, ty)
          .text(rate, 140, ty, { width: 40, align: 'right' })
          .text(base, 185, ty, { width: 75, align: 'right' })
          .text(tax, 265, ty, { width: 50, align: 'right' });
        if (isBold) drawHLine(doc, ty - 2, 58, 315);
      });

      // Right: Totals
      const totR = 340;
      doc.rect(totR, taxBoxY, 220, 80).strokeColor('#e2ddd6').lineWidth(0.5).stroke();
      drawRect(doc, totR, taxBoxY, 220, 16, '#f0ede8');
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#5a5650')
        .text('AMOUNT SUMMARY', totR + 8, taxBoxY + 4, { characterSpacing: 0.8 });

      const summaryRows = [
        ['Taxable Amount:', formatINR(taxableAmount)],
        ['CGST (9%):', formatINR(cgst)],
        ['SGST (9%):', formatINR(sgst)],
        ['Round Off:', '0.00'],
      ];
      summaryRows.forEach(([label, val], i) => {
        const sy = taxBoxY + 22 + i * 13;
        doc.fontSize(8).font('Helvetica').fillColor('#5a5650').text(label, totR + 8, sy);
        doc.font('Helvetica').fillColor('#1a1714').text(val, totR + 120, sy, { width: 92, align: 'right' });
      });

      y = taxBoxY + 90;

      // Grand total bar
      drawRect(doc, 50, y, contentWidth, 28, '#1a3a5c');
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff')
        .text('GRAND TOTAL (Incl. GST):', 58, y + 9);
      doc.fontSize(13).fillColor('#d4a843')
        .text(formatINR(order.totalAmount), 380, y + 6, { width: 170, align: 'right' });

      y += 40;

      // Amount in words
      doc.fontSize(8).font('Helvetica').fillColor('#9a948e')
        .text(`Amount in Words: ${numberToWords(order.totalAmount)}`, 50, y);

      y += 25;

      // ── Declaration + Signature ───────────────────────────────────────────────
      doc.rect(50, y, contentWidth, 55).strokeColor('#e2ddd6').lineWidth(0.5).stroke();

      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#5a5650')
        .text('DECLARATION:', 58, y + 6);
      doc.fontSize(7.5).font('Helvetica').fillColor('#9a948e')
        .text('We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.\nAll disputes are subject to Gurugram jurisdiction. Goods once sold will not be taken back.', 58, y + 17, { width: 300 });

      doc.fontSize(7.5).font('Helvetica').fillColor('#5a5650')
        .text('For Jeecom Information Technology', 400, y + 6, { width: 155, align: 'center' });
      doc.fontSize(7.5).fillColor('#9a948e')
        .text('Authorised Signatory', 400, y + 38, { width: 155, align: 'center' });
      drawHLine(doc, y + 36, 400, 555, '#9a948e', 0.5);

      y += 65;

      // ── Footer ───────────────────────────────────────────────────────────────
      drawRect(doc, 0, doc.page.height - 40, pageWidth, 40, '#1a3a5c');
      doc.fontSize(7.5).font('Helvetica').fillColor('rgba(255,255,255,0.6)')
        .text(`${COMPANY.website}  |  ${COMPANY.email}  |  ${COMPANY.phone}  |  GSTIN: ${COMPANY.gstin}`,
          50, doc.page.height - 25, { align: 'center', width: contentWidth });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateBillPDF, generateGSTInvoicePDF };