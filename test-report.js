import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = 'http://localhost:3000/api/auth';
const REPORT_PATH = './Stellar_Auth_Test_Report.pdf';

/**
 * Helper to wait for a specific time
 */
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Helper to run a test case
 */
async function runTest(name, url, method, body = null, headers = {}) {
    const start = Date.now();
    try {
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            body: body ? JSON.stringify(body) : null
        });

        const data = await response.json();
        const duration = Date.now() - start;

        return {
            name,
            status: response.status,
            success: response.ok,
            duration: `${duration}ms`,
            data
        };
    } catch (error) {
        return {
            name,
            status: 'ERROR',
            success: false,
            duration: `${Date.now() - start}ms`,
            error: error.message
        };
    }
}

/**
 * Generate PDF Report
 */
function createPDFReport(results) {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(REPORT_PATH);
    doc.pipe(stream);

    // Title
    doc.fontSize(25).fillColor('#4A90E2').text('Stellar Auth Service', { align: 'center' });
    doc.fontSize(20).fillColor('#333').text('Integration Test Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).fillColor('#666').text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);

    // Summary
    const passed = results.filter(r => r.success).length;
    const failed = results.length - passed;

    doc.fontSize(16).fillColor('#333').text('Test Summary');
    doc.rect(50, doc.y, 500, 2).fill('#4A90E2');
    doc.moveDown();

    doc.fontSize(12).fillColor('#333').text(`Total Tests: ${results.length}`);
    doc.fillColor('#27AE60').text(`Passed: ${passed}`);
    doc.fillColor('#E74C3C').text(`Failed: ${failed}`);
    doc.moveDown(2);

    // Results
    doc.fontSize(16).fillColor('#333').text('Test Details');
    doc.rect(50, doc.y, 500, 2).fill('#4A90E2');
    doc.moveDown();

    results.forEach((res, index) => {
        doc.fontSize(12).fillColor('#333').text(`${index + 1}. ${res.name}`, { underline: true });
        doc.fontSize(10).fillColor(res.success ? '#27AE60' : '#E74C3C')
            .text(`Status: ${res.status} | Duration: ${res.duration}`);

        if (!res.success && res.error) {
            doc.fillColor('#E74C3C').text(`Error: ${res.error}`);
        } else {
            const message = res.data?.message || 'No message';
            doc.fillColor('#666').text(`Message: ${message}`);
        }
        doc.moveDown();
    });

    doc.end();
    return new Promise(resolve => stream.on('finish', resolve));
}

/**
 * Main execution
 */
async function main() {
    console.log('Starting backend server for testing...');
    const server = spawn('node', ['src/server.js'], {
        env: { ...process.env, MOCK_DB: 'true', PORT: '3001' } // Use different port to avoid conflict
    });

    const LOCAL_API = 'http://localhost:3001/api/auth';

    // Wait for server to start
    await wait(3000);

    const results = [];

    console.log('Running tests...');

    // Test 1: Sign Up
    results.push(await runTest(
        'User Registration',
        `${LOCAL_API}/signup`,
        'POST',
        { name: 'Reporter', email: 'report@stellar.com', password: 'Password123!' }
    ));

    // Test 2: Sign In
    results.push(await runTest(
        'User Login',
        `${LOCAL_API}/signin`,
        'POST',
        { email: 'report@stellar.com', password: 'Password123!' }
    ));

    // Test 3: Get Session (Requires token)
    const loginRes = results[1].data;
    const token = loginRes?.data?.token;

    results.push(await runTest(
        'Session Retrieval',
        `${LOCAL_API}/session`,
        'POST',
        { access_token: token }
    ));

    // Test 4: Delete Account
    results.push(await runTest(
        'Account Deletion',
        `${LOCAL_API}/delete-account`,
        'DELETE',
        null,
        { 'Authorization': `Bearer ${token}` }
    ));

    console.log('Generating PDF report...');
    await createPDFReport(results);

    console.log(`Report generated: ${REPORT_PATH}`);

    server.kill();
    process.exit(0);
}

main().catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
});
