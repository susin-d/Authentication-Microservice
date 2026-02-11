import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const markdown = fs.readFileSync('API_DOCS.md', 'utf8');
const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
const stream = fs.createWriteStream('Stellar_Auth_API_Docs.pdf');
doc.pipe(stream);

// ── Colors ──
const C = {
    primary: '#4f46e5', white: '#ffffff', bg: '#f8fafc',
    border: '#e2e8f0', text: '#1e293b', muted: '#64748b',
    lightBg: '#f1f5f9', codeBg: '#1e293b', codeText: '#e2e8f0'
};

// ── Header ──
doc.rect(0, 0, 612, 120).fill(C.primary);
doc.fontSize(24).fillColor(C.white).text('Stellar Auth Service', 50, 40);
doc.fontSize(14).fillColor('#c7d2fe').text('API Documentation Reference', 50, 70);
doc.fontSize(9).text(`Last Updated: ${new Date().toLocaleDateString()}`, 50, 95);

let y = 140;

const checkNewPage = (needed) => {
    if (y + needed > 750) {
        doc.addPage();
        y = 50;
    }
};

// Simplified Markdown Parser (Headings, Lists, Code blocks)
const lines = markdown.split('\n');
let inCodeBlock = false;

for (let line of lines) {
    if (line.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        if (inCodeBlock) {
            y += 5;
        } else {
            y += 10;
        }
        continue;
    }

    if (inCodeBlock) {
        checkNewPage(12);
        doc.rect(50, y, 495, 14).fill(C.codeBg);
        doc.fontSize(8).font('Courier').fillColor(C.codeText).text(line, 60, y + 3);
        y += 14;
        continue;
    }

    if (line.startsWith('# ')) {
        y += 20;
        checkNewPage(30);
        doc.fontSize(20).font('Helvetica-Bold').fillColor(C.primary).text(line.substring(2), 50, y);
        y += 30;
    } else if (line.startsWith('## ')) {
        y += 15;
        checkNewPage(25);
        doc.fontSize(16).font('Helvetica-Bold').fillColor(C.primary).text(line.substring(3), 50, y);
        y += 25;
    } else if (line.startsWith('### ')) {
        y += 10;
        checkNewPage(20);
        doc.fontSize(12).font('Helvetica-Bold').fillColor(C.text).text(line.substring(4), 50, y);
        y += 20;
    } else if (line.trim().startsWith('- ')) {
        checkNewPage(15);
        doc.fontSize(10).font('Helvetica').fillColor(C.text).text('• ' + line.trim().substring(2), 60, y);
        y += 15;
    } else if (line.trim() === '---') {
        y += 10;
        doc.moveTo(50, y).lineTo(545, y).strokeColor(C.border).lineWidth(0.5).stroke();
        y += 15;
    } else if (line.trim().length > 0) {
        const text = line.replace(/\*\*/g, ''); // Crude bold removal
        const h = doc.fontSize(10).heightOfString(text, { width: 495 });
        checkNewPage(h + 5);
        doc.fontSize(10).font('Helvetica').fillColor(C.text).text(text, 50, y, { width: 495 });
        y += h + 8;
    }
}

// ── Footer ──
const pages = doc.bufferedPageRange();
for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).fillColor(C.muted)
        .text(`Stellar Auth Service API Documentation  |  Page ${i + 1} of ${pages.count}`, 50, 800, { width: 495, align: 'center' });
}

doc.end();
stream.on('finish', () => {
    console.log('PDF generated: Stellar_Auth_API_Docs.pdf');
});
