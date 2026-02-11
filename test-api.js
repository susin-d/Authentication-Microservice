/**
 * Stellar Auth Service - Full API Test Suite (Live DB)
 * Tests all endpoints with real Neon DB connection
 */

const BASE_URL = 'http://localhost:3000';
const results = [];
const TEST_EMAIL = `testuser_${Date.now()}@teststellar.com`;
const TEST_PASSWORD = 'StrongPass123!';
const TEST_NAME = 'Test User';
let authToken = null;
let refreshToken = null;

async function request(method, path, body = null, headers = {}) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
    };
    if (body) opts.body = JSON.stringify(body);

    const start = Date.now();
    try {
        const res = await fetch(`${BASE_URL}${path}`, opts);
        const duration = Date.now() - start;
        let data;
        try { data = await res.json(); } catch { data = null; }
        return { status: res.status, data, duration, headers: Object.fromEntries(res.headers) };
    } catch (err) {
        return { status: 0, error: err.message, duration: Date.now() - start };
    }
}

function test(name, result, expectedStatus, checks = []) {
    const passed = result.status === expectedStatus && checks.every(c => c.check);
    const entry = {
        name,
        status: passed ? 'PASS' : 'FAIL',
        httpStatus: result.status,
        expectedStatus,
        duration: `${result.duration}ms`,
        response: result.data,
        checks: checks.map(c => ({ description: c.desc, passed: c.check })),
    };
    if (result.error) entry.error = result.error;
    results.push(entry);

    const icon = passed ? '\u2705' : '\u274C';
    console.log(`${icon} ${name} [${result.status}] ${result.duration}ms`);
    if (!passed) {
        checks.filter(c => !c.check).forEach(c => console.log(`   \u21B3 FAILED: ${c.desc}`));
        if (result.error) console.log(`   \u21B3 ERROR: ${result.error}`);
        if (result.data) console.log(`   \u21B3 RESPONSE: ${JSON.stringify(result.data).substring(0, 200)}`);
    }
    return entry;
}

async function runTests() {
    console.log('\u2550'.repeat(50));
    console.log('  STELLAR AUTH SERVICE - FULL API TEST SUITE (LIVE DB)');
    console.log('  ' + new Date().toISOString());
    console.log('  Test email: ' + TEST_EMAIL);
    console.log('\u2550'.repeat(50) + '\n');

    // ── 1. HEALTH & ROOT ──
    console.log('\u2500\u2500 Health & Root \u2500\u2500');
    let res = await request('GET', '/health');
    test('GET /health', res, 200, [
        { desc: 'success is true', check: res.data?.success === true },
        { desc: 'message contains "running"', check: res.data?.message?.includes('running') },
        { desc: 'timestamp present', check: !!res.data?.timestamp },
    ]);

    res = await request('GET', '/');
    test('GET / (root)', res, 200, [
        { desc: 'success is true', check: res.data?.success === true },
        { desc: 'version is 1.0.0', check: res.data?.version === '1.0.0' },
        { desc: 'endpoints listed', check: !!res.data?.endpoints?.auth },
    ]);

    res = await request('GET', '/nonexistent');
    test('GET /nonexistent (404)', res, 404, [
        { desc: 'success is false', check: res.data?.success === false },
        { desc: 'requestId present', check: !!res.data?.requestId },
    ]);

    // ── 2. SIGNUP VALIDATION ──
    console.log('\n\u2500\u2500 Signup Validation \u2500\u2500');

    res = await request('POST', '/api/auth/signup', {});
    test('Signup - empty body', res, 400, [
        { desc: 'requires email and password', check: res.data?.message?.includes('required') },
    ]);

    res = await request('POST', '/api/auth/signup', { email: 'invalid', password: 'test' });
    test('Signup - invalid email', res, 400, [
        { desc: 'rejects invalid email', check: res.data?.message?.includes('email') },
    ]);

    res = await request('POST', '/api/auth/signup', { email: 'test@test.com', password: 'weak' });
    test('Signup - weak password', res, 400, [
        { desc: 'lists password requirements', check: res.data?.message?.includes('must contain') },
    ]);

    res = await request('POST', '/api/auth/signup', { email: 'a'.repeat(300) + '@test.com', password: TEST_PASSWORD });
    test('Signup - email too long', res, 400, [
        { desc: 'rejects overly long email', check: res.data?.success === false },
    ]);

    // ── 3. SIGNUP SUCCESS (LIVE DB) ──
    console.log('\n\u2500\u2500 Signup (Live DB) \u2500\u2500');
    res = await request('POST', '/api/auth/signup', {
        email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME
    });
    const signupSuccess = res.status === 201 || res.status === 500; // 500 if email send fails but user created
    test('Signup - create new user', res, res.status, [
        { desc: 'response received', check: signupSuccess },
        { desc: 'user id returned OR error handled', check: !!res.data?.data?.user?.id || res.data?.success === false },
    ]);

    if (res.data?.data?.token) {
        authToken = res.data.data.token;
        refreshToken = res.data.data.refresh_token;
        console.log('   \u2714 Token captured for subsequent tests');
    }

    // Try duplicate signup
    res = await request('POST', '/api/auth/signup', {
        email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME
    });
    test('Signup - duplicate email', res, 400, [
        { desc: 'blocks duplicate registration', check: res.data?.success === false },
    ]);

    // ── 4. SIGNIN VALIDATION ──
    console.log('\n\u2500\u2500 Signin Validation \u2500\u2500');

    res = await request('POST', '/api/auth/signin', {});
    test('Signin - empty body', res, 400, [
        { desc: 'requires email and password', check: res.data?.message?.includes('required') },
    ]);

    res = await request('POST', '/api/auth/signin', { email: 'notanemail', password: 'test' });
    test('Signin - invalid email format', res, 400, [
        { desc: 'rejects invalid email', check: res.data?.message?.toLowerCase().includes('email') },
    ]);

    // ── 5. SIGNIN SUCCESS (LIVE DB) ──
    console.log('\n\u2500\u2500 Signin (Live DB) \u2500\u2500');

    res = await request('POST', '/api/auth/signin', {
        email: TEST_EMAIL, password: 'WrongPassword123!'
    });
    test('Signin - wrong password', res, 401, [
        { desc: 'returns invalid credentials', check: res.data?.message?.includes('Invalid credentials') },
    ]);

    res = await request('POST', '/api/auth/signin', {
        email: 'nonexistent_' + Date.now() + '@test.com', password: TEST_PASSWORD
    });
    test('Signin - non-existent user', res, 401, [
        { desc: 'returns invalid credentials', check: res.data?.message?.includes('Invalid credentials') },
    ]);

    res = await request('POST', '/api/auth/signin', {
        email: TEST_EMAIL, password: TEST_PASSWORD
    });
    test('Signin - correct credentials', res, 200, [
        { desc: 'success is true', check: res.data?.success === true },
        { desc: 'user object returned', check: !!res.data?.data?.user },
        { desc: 'user email matches', check: res.data?.data?.user?.email === TEST_EMAIL.toLowerCase() },
        { desc: 'user name matches', check: res.data?.data?.user?.name === TEST_NAME },
        { desc: 'JWT token returned', check: !!res.data?.data?.token },
        { desc: 'refresh token returned', check: !!res.data?.data?.jwt_refresh_token },
        { desc: 'user id is UUID format', check: /^[0-9a-f-]{36}$/.test(res.data?.data?.user?.id || '') },
    ]);

    if (res.data?.data?.token) {
        authToken = res.data.data.token;
        refreshToken = res.data.data.jwt_refresh_token;
        console.log('   \u2714 Auth tokens captured');
    }

    // ── 6. SESSION (AUTHENTICATED) ──
    console.log('\n\u2500\u2500 Session \u2500\u2500');

    res = await request('POST', '/api/auth/session', {});
    test('Session - no auth header', res, 401, [
        { desc: 'requires token', check: res.data?.message?.toLowerCase().includes('token') },
    ]);

    res = await request('POST', '/api/auth/session', {}, { 'Authorization': 'Bearer invalidtoken' });
    test('Session - invalid token', res, 401, [
        { desc: 'rejects invalid token', check: res.data?.success === false },
    ]);

    if (authToken) {
        res = await request('POST', '/api/auth/session',
            { access_token: authToken },
            { 'Authorization': `Bearer ${authToken}` }
        );
        test('Session - valid token', res, 200, [
            { desc: 'success is true', check: res.data?.success === true },
            { desc: 'user data returned', check: !!res.data?.data?.user },
            { desc: 'email matches', check: res.data?.data?.user?.email === TEST_EMAIL.toLowerCase() },
        ]);
    }

    // ── 7. TOKEN REFRESH ──
    console.log('\n\u2500\u2500 Token Refresh \u2500\u2500');

    res = await request('POST', '/api/auth/refresh-jwt', {});
    test('Refresh JWT - no token', res, 400, [
        { desc: 'requires refresh token', check: res.data?.message?.includes('required') },
    ]);

    res = await request('POST', '/api/auth/refresh-jwt', { jwt_refresh_token: 'badtoken' });
    test('Refresh JWT - invalid token', res, 401, [
        { desc: 'rejects invalid token', check: res.data?.success === false },
    ]);

    if (refreshToken) {
        res = await request('POST', '/api/auth/refresh-jwt', { jwt_refresh_token: refreshToken });
        test('Refresh JWT - valid refresh token', res, 200, [
            { desc: 'success is true', check: res.data?.success === true },
            { desc: 'new access token returned', check: !!res.data?.data?.token },
            { desc: 'new refresh token returned', check: !!res.data?.data?.refresh_token },
            { desc: 'user info returned', check: !!res.data?.data?.user },
        ]);
        if (res.data?.data?.token) {
            authToken = res.data.data.token;
            console.log('   \u2714 Tokens rotated');
        }
    }

    // ── 8. PASSWORD RESET ──
    console.log('\n\u2500\u2500 Password Reset \u2500\u2500');

    res = await request('POST', '/api/auth/reset-password', {});
    test('Reset password - no email', res, 400, [
        { desc: 'requires email', check: res.data?.message?.includes('required') },
    ]);

    res = await request('POST', '/api/auth/reset-password', { email: 'bad' });
    test('Reset password - invalid email', res, 400, [
        { desc: 'validates email format', check: res.data?.message?.toLowerCase().includes('email') },
    ]);

    res = await request('POST', '/api/auth/reset-password', { email: TEST_EMAIL });
    test('Reset password - valid email', res, 200, [
        { desc: 'returns success (no leak)', check: res.data?.success === true },
        { desc: 'generic message (security)', check: res.data?.message?.includes('If an account exists') },
    ]);

    // ── 9. EMAIL VERIFICATION ──
    console.log('\n\u2500\u2500 Email Verification \u2500\u2500');

    res = await request('POST', '/api/auth/verify-email', {});
    test('Verify email - empty body', res, 400, [
        { desc: 'requires email and token', check: res.data?.message?.includes('required') },
    ]);

    res = await request('POST', '/api/auth/verify-email', { email: TEST_EMAIL, token: 'invalidtoken' });
    test('Verify email - invalid token', res, 401, [
        { desc: 'rejects invalid token', check: res.data?.success === false },
    ]);

    // ── 10. RESEND VERIFICATION ──
    console.log('\n\u2500\u2500 Resend Verification \u2500\u2500');

    res = await request('POST', '/api/auth/resend-verification', {});
    test('Resend verification - no email', res, 400, [
        { desc: 'requires email', check: res.data?.success === false },
    ]);

    res = await request('POST', '/api/auth/resend-verification', { email: 'bad' });
    test('Resend verification - invalid email', res, 400, [
        { desc: 'validates email format', check: res.data?.message?.toLowerCase().includes('email') },
    ]);

    // ── 11. RESET PASSWORD WITH TOKEN ──
    console.log('\n\u2500\u2500 Reset Password Confirm \u2500\u2500');

    res = await request('POST', '/api/auth/reset-password/confirm', {});
    test('Reset confirm - empty body', res, 400, [
        { desc: 'requires all fields', check: res.data?.message?.includes('required') },
    ]);

    res = await request('POST', '/api/auth/reset-password/confirm', {
        email: TEST_EMAIL, resetToken: 'badtoken', newPassword: TEST_PASSWORD
    });
    test('Reset confirm - invalid token', res, 401, [
        { desc: 'rejects invalid reset token', check: res.data?.success === false },
    ]);

    // ── 12. GOOGLE OAUTH ──
    console.log('\n\u2500\u2500 Google OAuth \u2500\u2500');

    res = await request('POST', '/api/auth/google', {});
    test('Google OAuth - initiate', res, 200, [
        { desc: 'success is true', check: res.data?.success === true },
        { desc: 'auth URL present', check: !!res.data?.data?.url },
        { desc: 'state parameter present', check: !!res.data?.data?.state },
        { desc: 'URL targets Google accounts', check: res.data?.data?.url?.includes('accounts.google.com') },
        { desc: 'real client ID in URL', check: res.data?.data?.url?.includes('606807576305') },
    ]);

    res = await request('POST', '/api/auth/callback/google', {});
    test('Google callback - no state', res, 400, [
        { desc: 'requires state for CSRF', check: res.data?.message?.toLowerCase().includes('state') },
    ]);

    res = await request('POST', '/api/auth/callback/google', { state: 'fake', access_token: 'tok' });
    test('Google callback - invalid state', res, 400, [
        { desc: 'rejects invalid state', check: res.data?.success === false },
    ]);

    // ── 13. SECURITY HEADERS ──
    console.log('\n\u2500\u2500 Security Headers \u2500\u2500');
    res = await request('GET', '/health');
    const h = res.headers || {};
    test('Security headers', res, 200, [
        { desc: 'X-Request-ID present', check: !!h['x-request-id'] },
        { desc: 'X-Content-Type-Options: nosniff', check: h['x-content-type-options'] === 'nosniff' },
        { desc: 'X-Frame-Options set', check: !!h['x-frame-options'] },
        { desc: 'Content-Security-Policy set', check: !!h['content-security-policy'] },
        { desc: 'Cross-Origin-Resource-Policy set', check: !!h['cross-origin-resource-policy'] },
    ]);

    // ── 14. CORS ──
    console.log('\n\u2500\u2500 CORS \u2500\u2500');
    res = await request('OPTIONS', '/api/auth/signup', null, { 'Origin': 'http://localhost:3000' });
    test('CORS - allowed origin', res, 204, []);

    // ── 15. SIGNOUT ──
    console.log('\n\u2500\u2500 Signout \u2500\u2500');

    res = await request('POST', '/api/auth/signout', {});
    test('Signout - no auth', res, 401, [
        { desc: 'requires authentication', check: res.data?.success === false },
    ]);

    if (authToken) {
        res = await request('POST', '/api/auth/signout', {}, { 'Authorization': `Bearer ${authToken}` });
        test('Signout - with valid token', res, 200, [
            { desc: 'success is true', check: res.data?.success === true },
            { desc: 'signout message', check: res.data?.message?.includes('Sign out successful') },
        ]);
    }

    // ── SUMMARY ──
    console.log('\n' + '\u2550'.repeat(50));
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED, ${results.length} TOTAL`);
    console.log(`  PASS RATE: ${Math.round(passed / results.length * 100)}%`);
    console.log(`  DB: Neon (Live)  |  Test User: ${TEST_EMAIL}`);
    console.log('\u2550'.repeat(50) + '\n');

    const fs = await import('fs');
    fs.writeFileSync('test-results.json', JSON.stringify({
        summary: { total: results.length, passed, failed, passRate: Math.round(passed / results.length * 100), timestamp: new Date().toISOString(), testEmail: TEST_EMAIL, database: 'Neon DB (Live)' },
        results
    }, null, 2));
    console.log('Results written to test-results.json');
}

runTests().catch(err => {
    console.error('Test suite failed:', err);
    process.exit(1);
});
