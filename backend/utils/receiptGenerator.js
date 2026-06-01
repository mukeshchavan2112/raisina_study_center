import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ─── CONFIG ───────────────────────────────────────────────
const PINK = '#C8185A';
const LIGHT_PINK = '#F5D0E0';
const DARK = '#1A1A1A';
const GREY = '#888888';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── LOGO PATH RESOLVER ───────────────────────────────────
// This supports both:
// 1. frontend/public/branding logos
// 2. backend/assets/branding logos, if you add them later
function resolveAsset(fileName) {
  const possiblePaths = [
    // Recommended for deployment later
    path.join(__dirname, '../assets/branding', fileName),
    path.join(process.cwd(), 'assets/branding', fileName),

    // Your current frontend logo location
    path.join(__dirname, '../../frontend/public/branding', fileName),
    path.join(process.cwd(), '../frontend/public/branding', fileName),
    path.join(process.cwd(), 'frontend/public/branding', fileName),
    path.join(process.cwd(), 'public/branding', fileName),
  ];

  return possiblePaths.find((assetPath) => fs.existsSync(assetPath)) || null;
}

const FOUNDATION_LOGO = resolveAsset('raisina-foundation-logo.jpeg');
const STUDY_CENTER_LOGO = resolveAsset('raisina-study-center-logo.jpeg');

// ─── HELPERS ─────────────────────────────────────────────
function amountToWords(amount) {
  const num = Math.floor(amount);

  if (num === 0) return 'Zero Rupees';

  const ones = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];

  const tens = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];

  function words(n) {
    if (n < 20) return ones[n];

    if (n < 100) {
      return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    }

    if (n < 1000) {
      return (
        ones[Math.floor(n / 100)] +
        ' Hundred' +
        (n % 100 ? ' ' + words(n % 100) : '')
      );
    }

    if (n < 100000) {
      return (
        words(Math.floor(n / 1000)) +
        ' Thousand' +
        (n % 1000 ? ' ' + words(n % 1000) : '')
      );
    }

    if (n < 10000000) {
      return (
        words(Math.floor(n / 100000)) +
        ' Lakh' +
        (n % 100000 ? ' ' + words(n % 100000) : '')
      );
    }

    return (
      words(Math.floor(n / 10000000)) +
      ' Crore' +
      (n % 10000000 ? ' ' + words(n % 10000000) : '')
    );
  }

  return words(num) + ' Rupees';
}

function drawLogoImage(doc, imagePath, x, y, width, height, fallbackLines = []) {
  doc.save();

  // White background patch behind logo so the pink stripe background does not disturb logo visibility.
  doc.roundedRect(x, y, width, height, 4).fill('white');

  if (imagePath) {
    try {
      doc.image(imagePath, x + 2, y + 2, {
        fit: [width - 4, height - 4],
        align: 'center',
        valign: 'center',
      });

      doc.restore();
      return;
    } catch (err) {
      console.warn(`Could not load receipt logo: ${imagePath}`, err.message);
    }
  }

  // Fallback if image path is wrong/missing
  doc.rect(x, y, width, height).lineWidth(1).strokeColor(PINK).stroke();

  doc.fontSize(5).font('Helvetica-Bold').fillColor(PINK);

  fallbackLines.forEach((line, index) => {
    doc.text(line, x + 2, y + 8 + index * 7, {
      width: width - 4,
      align: 'center',
    });
  });

  doc.restore();
}

// ─── DRAW ONE STUB ────────────────────────────────────────
// x, y = top-left corner; w = width; h = height
function drawStub(doc, x, y, w, h, data, isOfficeCopy) {
  const pad = 14;
  const innerW = w - pad * 2;

  // --- Vertical stripe lines decorative background ---
  doc.save();
  doc.rect(x, y, w, h).clip();
  doc.strokeColor(LIGHT_PINK).lineWidth(0.5);

  for (let sx = x + 6; sx < x + w; sx += 7) {
    doc.moveTo(sx, y).lineTo(sx, y + h).stroke();
  }

  doc.restore();

  // --- Outer border ---
  doc.rect(x, y, w, h).lineWidth(1.5).strokeColor(PINK).stroke();

  // ── HEADER ──
  const logoTop = y + pad + 2;

  // Left logo: Raisina Foundation
  drawLogoImage(
    doc,
    FOUNDATION_LOGO,
    x + pad,
    logoTop,
    46,
    42,
    ['RAISINA', 'FOUNDATION'],
  );

  // Right logo: Raisina Study Center
  drawLogoImage(
    doc,
    STUDY_CENTER_LOGO,
    x + w - pad - 56,
    logoTop + 3,
    56,
    34,
    ['RAISINA', 'STUDY CENTER'],
  );

  // Center header text
  const headX = x + pad + 52;
  const headW = w - pad * 2 - 110;

  doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .fillColor(PINK)
    .text('RAISINA FOUNDATION', headX, y + pad + 2, {
      width: headW,
      align: 'center',
    });

  doc
    .fontSize(6.5)
    .font('Helvetica')
    .fillColor(DARK)
    .text('Reg.No.:F-0026526', headX, y + pad + 14, {
      width: headW,
      align: 'center',
    });

  doc
    .fontSize(11)
    .font('Helvetica-Bold')
    .fillColor(PINK)
    .text('RAISINA STUDY CENTER', headX, y + pad + 22, {
      width: headW,
      align: 'center',
    });

  // Header separator
  const sepY = y + 62;

  doc
    .moveTo(x + pad, sepY)
    .lineTo(x + w - pad, sepY)
    .lineWidth(1)
    .strokeColor(PINK)
    .stroke();

  // ── COPY LABEL ──
  const label = isOfficeCopy ? 'Office Copy' : 'Donor Copy';

  doc
    .fontSize(6)
    .font('Helvetica')
    .fillColor(GREY)
    .text(label, x + w - pad - 45, y + 4, {
      width: 44,
      align: 'right',
    });

  // ── FIELDS ──
  let fy = sepY + 10;

  const labelFont = 'Helvetica-Bold';
  const valueFont = 'Helvetica';
  const fieldFSize = 8.5;
  const dotColor = PINK;
  const lineH = 20;

  function dotLine(lx, ly, lw) {
    doc.save();
    doc.dash(1, { space: 3 });

    doc
      .moveTo(lx, ly)
      .lineTo(lx + lw, ly)
      .lineWidth(0.5)
      .strokeColor(dotColor)
      .stroke();

    doc.undash();
    doc.restore();
  }

  function field(labelText, value, lx, ly, lw) {
    doc
      .fontSize(fieldFSize)
      .font(labelFont)
      .fillColor(DARK)
      .text(labelText, lx, ly);

    const labelW = doc.widthOfString(labelText);
    const vx = lx + labelW + 3;
    const vw = lw - labelW - 3;

    if (value) {
      doc
        .fontSize(fieldFSize)
        .font(valueFont)
        .fillColor(DARK)
        .text(value, vx, ly, {
          width: vw,
        });
    }

    dotLine(vx, ly + 11, vw);
  }

  // Row 1: Receipt No. | Date
  field(
    'Receipt No.',
    data.receiptNumber ? String(data.receiptNumber) : '',
    x + pad,
    fy,
    innerW * 0.52,
  );

  field(
    'Date :',
    data.date ? new Date(data.date).toLocaleDateString('en-IN') : '   /   /',
    x + pad + innerW * 0.56,
    fy,
    innerW * 0.44,
  );

  fy += lineH;

  field(
    'Name of Donor',
    data.donorName || data.studentName || '',
    x + pad,
    fy,
    innerW,
  );

  fy += lineH;

  field(
    'Address of Donor',
    data.address || data.donorAddress || '',
    x + pad,
    fy,
    innerW,
  );

  fy += lineH;

  field(
    'Donation Amount Rs. in words',
    data.amount ? amountToWords(data.amount) : '',
    x + pad,
    fy,
    innerW,
  );

  // Second words line / continuation dotted line
  fy += lineH - 4;
  dotLine(x + pad, fy + 11, innerW);

  // ── AMOUNT BOX + THANK YOU ──
  fy += 18;

  const boxX = x + pad;
  const boxY = fy;
  const boxW = innerW * 0.42;
  const boxH = 26;

  // Pink amount box
  doc.rect(boxX, boxY, boxW, boxH).fillAndStroke(PINK, PINK);

  // White rupee symbol
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .fillColor('white')
    .text('\u20B9', boxX + 4, boxY + 5, {
      width: 18,
      align: 'left',
    });

  // Amount value area
  const amtBoxX = boxX + 24;

  doc
    .rect(amtBoxX, boxY + 2, boxW - 26, boxH - 4)
    .fillAndStroke('white', 'white');

  if (data.amount) {
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor(DARK)
      .text(Number(data.amount).toLocaleString('en-IN'), amtBoxX + 2, boxY + 7, {
        width: boxW - 30,
      });
  }

  // Thank You
  doc
    .fontSize(13)
    .font('Helvetica-BoldOblique')
    .fillColor(PINK)
    .text('Thank You...', x + pad + boxW + 10, boxY + 4, {
      width: innerW - boxW - 10,
    });

  // ── SIGNATURES ──
  fy = boxY + boxH + 16;

  doc
    .moveTo(x + pad, fy)
    .lineTo(x + w - pad, fy)
    .lineWidth(0.7)
    .strokeColor(PINK)
    .stroke();

  fy += 4;

  doc
    .fontSize(8)
    .font(labelFont)
    .fillColor(DARK)
    .text('Authorised Sign.', x + pad, fy, {
      width: innerW * 0.5,
    });

  doc.text('Donor sign.', x + pad + innerW * 0.5, fy, {
    width: innerW * 0.5,
    align: 'right',
  });
}

// ─── MAIN EXPORT ─────────────────────────────────────────
export function generateDonationReceipt(stream, data) {
  // A5 landscape = 595 × 420 pt
  const pageW = 595;
  const pageH = 420;

  const doc = new PDFDocument({
    size: [pageW, pageH],
    margin: 0,
  });

  doc.pipe(stream);

  const stubW = pageW / 2 - 4;
  const stubH = pageH - 20;
  const topY = 10;

  // Left stub = office copy
  drawStub(doc, 4, topY, stubW, stubH, data, true);

  // Perforated center line
  doc.save();
  doc.dash(3, { space: 4 });

  doc
    .moveTo(pageW / 2, topY)
    .lineTo(pageW / 2, topY + stubH)
    .lineWidth(0.8)
    .strokeColor(GREY)
    .stroke();

  doc.undash();
  doc.restore();

  // Right stub = donor copy
  drawStub(doc, pageW / 2 + 4, topY, stubW, stubH, data, false);

  doc.end();
}

// ─── QUICK TEST ──────────────────────────────────────────
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const out = fs.createWriteStream('./sample_donation_receipt.pdf');

  generateDonationReceipt(out, {
    receiptNumber: 'FEE-2026-0001',
    date: new Date(),
    donorName: 'Mukesh Ramesh Chavan',
    address: 'Aurangabad, Maharashtra',
    amount: 500,
    centerName: 'Raisina Study Center',
  });

  out.on('finish', () => console.log('Receipt generated!'));
}