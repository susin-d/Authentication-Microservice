import PDFDocument from 'pdfkit';
import fs from 'fs';

const data = JSON.parse(fs.readFileSync('test-results.json', 'utf8'));
const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
const stream = fs.createWriteStream('Stellar_Auth_API_Test_Report.pdf');
doc.pipe(stream);

// ── Colors ──
const C = {
    primary: '#4f46e5', white: '#ffffff', pass: '#16a34a', fail: '#dc2626',
    warn: '#d97706', bg: '#f8fafc', border: '#e2e8f0', text: '#1e293b',
    muted: '#64748b', lightBg: '#f1f5f9',
};

// ── Helpers ──
const drawLine = (y, color = C.border) => {
    doc.moveTo(50, y).lineTo(545, y).strokeColor(color).lineWidth(0.5).stroke();
};

const badge = (x, y, label, color) => {
    const w = doc.fontSize(8).widthOfString(label) + 14;
    doc.roundedRect(x, y, w, 16, 3).fill(color);
    doc.fontSize(8).fillColor(C.white).text(label, x + 7, y + 3.5, { width: w - 14 });
    doc.fillColor(C.text);
    return w;
};

// ══════════════════════════════════════
//  COVER / HEADER
// ══════════════════════════════════════
doc.rect(0, 0, 612, 140).fill(C.primary);
doc.fontSize(28).fillColor(C.white).text('Stellar Auth Service', 50, 40);
doc.fontSize(14).fillColor('#c7d2fe').text('API Test Report', 50, 76);
doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 50, 100);
doc.fillColor(C.text);

// ══════════════════════════════════════
//  EXECUTIVE SUMMARY
// ══════════════════════════════════════
let y = 165;
doc.fontSize(16).fillColor(C.primary).text('Executive Summary', 50, y);
y += 28;
drawLine(y); y += 12;

doc.fontSize(10).fillColor(C.text);
doc.text('This report documents the comprehensive API testing of the Stellar Auth Service — a Node.js/Express backend providing JWT-based authentication with email verification, Google OAuth, and password management.', 50, y, { width: 495 });
y += 52;

// Summary boxes
const boxW = 110, boxH = 55;
const boxes = [
    { label: 'Total Tests', value: data.summary.total, color: C.primary },
    { label: 'Passed', value: data.summary.passed, color: C.pass },
    { label: 'Failed', value: data.summary.failed, color: C.fail },
    { label: 'Pass Rate', value: `${Math.round(data.summary.passed / data.summary.total * 100)}%`, color: C.primary },
];
boxes.forEach((b, i) => {
    const bx = 50 + i * (boxW + 15);
    doc.roundedRect(bx, y, boxW, boxH, 4).fill(C.lightBg);
    doc.roundedRect(bx, y, boxW, 4, 0).fill(b.color);
    doc.fontSize(20).fillColor(b.color).text(String(b.value), bx + 10, y + 14, { width: boxW - 20, align: 'center' });
    doc.fontSize(8).fillColor(C.muted).text(b.label, bx + 10, y + 38, { width: boxW - 20, align: 'center' });
});
y += boxH + 20;
doc.fillColor(C.text);

// ══════════════════════════════════════
//  FIXES APPLIED
// ══════════════════════════════════════
doc.fontSize(16).fillColor(C.primary).text('Issues Fixed', 50, y);
y += 25; drawLine(y); y += 12;

const fixes = [
    { title: 'Removed unused ioredis import', file: 'src/server.js', desc: 'The Redis import was never used, causing unnecessary dependency loading.' },
    { title: 'Cleaned JWT_SECRET values', file: '.env', desc: 'Instruction text "(minimum 32 characters - REQUIRED)" was embedded in the actual secret values, creating inconsistent keys.' },
    { title: 'Cleaned JWT_VERIFY_SECRET', file: '.env', desc: 'Same issue as JWT_SECRET — instruction text was part of the verification secret.' },
];

fixes.forEach(f => {
    doc.fontSize(10).fillColor(C.text).text(`• ${f.title}`, 60, y, { continued: true });
    doc.fontSize(8).fillColor(C.muted).text(`  (${f.file})`, { continued: false });
    y += 14;
    doc.fontSize(8).fillColor(C.muted).text(f.desc, 72, y, { width: 460 });
    y += 20;
});
y += 5;

// ══════════════════════════════════════
//  KNOWN ISSUES
// ══════════════════════════════════════
doc.fontSize(16).fillColor(C.primary).text('Known Issues', 50, y);
y += 25; drawLine(y); y += 12;

const issues = [
    { sev: 'CRITICAL', title: 'No database connection', desc: 'DATABASE_URL points to localhost:5432 but no PostgreSQL is running. All DB-dependent endpoints return 500. Configure a Neon DB connection string.' },
    { sev: 'WARN', title: 'Rate limiter triggers during testing', desc: '6 test failures are due to the rate limiter (5 req/15min for auth endpoints). This is correct behavior but means sequential testing hits limits.' },
    { sev: 'INFO', title: 'Unused dependency: express-session', desc: 'Listed in package.json but never imported or used in any source file.' },
];

issues.forEach(iss => {
    const sevColor = iss.sev === 'CRITICAL' ? C.fail : iss.sev === 'WARN' ? C.warn : C.primary;
    const bw = badge(60, y, iss.sev, sevColor);
    doc.fontSize(10).fillColor(C.text).text(iss.title, 60 + bw + 8, y + 1);
    y += 18;
    doc.fontSize(8).fillColor(C.muted).text(iss.desc, 72, y, { width: 460 });
    y += 26;
});

// ══════════════════════════════════════
//  NEW PAGE — TEST RESULTS TABLE
// ══════════════════════════════════════
doc.addPage();
doc.rect(0, 0, 612, 45).fill(C.primary);
doc.fontSize(16).fillColor(C.white).text('Detailed Test Results', 50, 14);
doc.fillColor(C.text);
y = 65;

// Table header
doc.rect(50, y, 495, 22).fill(C.lightBg);
doc.fontSize(8).fillColor(C.muted);
doc.text('#', 55, y + 6, { width: 20 });
doc.text('Test Name', 80, y + 6, { width: 220 });
doc.text('Status', 310, y + 6, { width: 50 });
doc.text('HTTP', 370, y + 6, { width: 40 });
doc.text('Expected', 415, y + 6, { width: 50 });
doc.text('Duration', 475, y + 6, { width: 60 });
y += 24;

data.results.forEach((r, i) => {
    // Page break check
    if (y > 740) {
        doc.addPage();
        y = 50;
        doc.rect(50, y, 495, 22).fill(C.lightBg);
        doc.fontSize(8).fillColor(C.muted);
        doc.text('#', 55, y + 6, { width: 20 });
        doc.text('Test Name', 80, y + 6, { width: 220 });
        doc.text('Status', 310, y + 6, { width: 50 });
        doc.text('HTTP', 370, y + 6, { width: 40 });
        doc.text('Expected', 415, y + 6, { width: 50 });
        doc.text('Duration', 475, y + 6, { width: 60 });
        y += 24;
    }

    // Alternating row background
    if (i % 2 === 0) {
        doc.rect(50, y - 2, 495, 20).fill('#fafbfc');
    }

    doc.fontSize(8).fillColor(C.text);
    doc.text(String(i + 1), 55, y + 2, { width: 20 });
    doc.text(r.name, 80, y + 2, { width: 220 });

    // Status badge
    badge(310, y + 1, r.status, r.status === 'PASS' ? C.pass : C.fail);

    doc.fontSize(8).fillColor(r.httpStatus === r.expectedStatus ? C.text : C.fail);
    doc.text(String(r.httpStatus), 370, y + 2, { width: 40 });
    doc.fillColor(C.text);
    doc.text(String(r.expectedStatus), 415, y + 2, { width: 50 });
    doc.text(r.duration, 475, y + 2, { width: 60 });
    y += 20;

    // Show checks on failure
    if (r.status === 'FAIL' && r.checks.length > 0) {
        r.checks.filter(c => !c.passed).forEach(c => {
            doc.fontSize(7).fillColor(C.fail).text(`  ↳ ${c.description}`, 90, y + 1);
            y += 12;
        });
    }
});

// ══════════════════════════════════════
//  NEW PAGE — ENDPOINT REFERENCE
// ══════════════════════════════════════
doc.addPage();
doc.rect(0, 0, 612, 45).fill(C.primary);
doc.fontSize(16).fillColor(C.white).text('API Endpoint Reference', 50, 14);
doc.fillColor(C.text);
y = 65;

const endpoints = [
    { method: 'GET', path: '/health', desc: 'Health check — returns service status and timestamp', auth: false },
    { method: 'GET', path: '/', desc: 'Root — returns API info and available endpoints', auth: false },
    { method: 'POST', path: '/api/auth/signup', desc: 'Register new user with email, password, and optional name', auth: false },
    { method: 'POST', path: '/api/auth/signin', desc: 'Authenticate with email and password, returns JWT tokens', auth: false },
    { method: 'POST', path: '/api/auth/signout', desc: 'Sign out (JWT invalidated client-side)', auth: true },
    { method: 'POST', path: '/api/auth/session', desc: 'Get current session/user info from access token', auth: true },
    { method: 'POST', path: '/api/auth/google', desc: 'Generate Google OAuth authorization URL with CSRF state', auth: false },
    { method: 'POST', path: '/api/auth/callback/google', desc: 'Handle Google OAuth callback with state validation', auth: false },
    { method: 'POST', path: '/api/auth/refresh', desc: 'Refresh access token using refresh token', auth: false },
    { method: 'POST', path: '/api/auth/refresh-jwt', desc: 'Refresh JWT token using JWT refresh token', auth: false },
    { method: 'POST', path: '/api/auth/reset-password', desc: 'Request password reset email', auth: false },
    { method: 'POST', path: '/api/auth/verify-email', desc: 'Verify email address with verification token', auth: false },
    { method: 'POST', path: '/api/auth/resend-verification', desc: 'Resend email verification link', auth: false },
    { method: 'POST', path: '/api/auth/reset-password/confirm', desc: 'Reset password with reset token and new password', auth: false },
];

endpoints.forEach((ep, i) => {
    if (y > 720) { doc.addPage(); y = 50; }

    if (i % 2 === 0) doc.rect(50, y - 3, 495, 28).fill('#fafbfc');

    const mColor = ep.method === 'GET' ? C.pass : C.primary;
    badge(55, y, ep.method, mColor);

    doc.fontSize(9).font('Courier').fillColor(C.text).text(ep.path, 105, y + 1, { width: 220 });
    doc.font('Helvetica');
    doc.fontSize(7).fillColor(C.muted).text(ep.desc, 105, y + 14, { width: 380 });

    if (ep.auth) {
        badge(490, y, 'AUTH', C.warn);
    }

    y += 32;
});

// ══════════════════════════════════════
//  SECURITY FEATURES
// ══════════════════════════════════════
y += 15;
doc.fontSize(16).fillColor(C.primary).text('Security Features', 50, y);
y += 25; drawLine(y); y += 12;

const security = [
    'Helmet.js for security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)',
    'Rate limiting: 5 req/15min for auth, 10 req/hr for verification, 100 req/15min general',
    'JWT tokens with HS256 algorithm, issuer/audience validation, JTI claims',
    'Token binding to user-agent and IP hash (enforced in production)',
    'bcrypt password hashing with 12 salt rounds',
    'Input sanitization against injection attacks',
    'Constant-time email comparison to prevent timing attacks',
    'OAuth CSRF protection via state parameter with expiration',
    'Request ID tracking for all requests',
    'Sanitized logging to prevent log injection',
    'Request body size limited to 10KB',
];

security.forEach(s => {
    if (y > 740) { doc.addPage(); y = 50; }
    doc.fontSize(8).fillColor(C.text).text(`✓  ${s}`, 60, y, { width: 470 });
    y += 15;
});

// ── Footer on all pages ──
const pages = doc.bufferedPageRange();
for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(7).fillColor(C.muted)
        .text(`Stellar Auth Service — API Test Report  |  Page ${i + 1} of ${pages.count}`, 50, 800, { width: 495, align: 'center' });
}

doc.end();
stream.on('finish', () => {
    console.log('PDF generated: Stellar_Auth_API_Test_Report.pdf');
    console.log(`File size: ${(fs.statSync('Stellar_Auth_API_Test_Report.pdf').size / 1024).toFixed(1)} KB`);
});
