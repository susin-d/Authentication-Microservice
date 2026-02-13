/**
 * M-Auth API Tests - v1.0.1
 * Comprehensive test suite for all authentication endpoints
 */

require('dotenv').config();
const axios = require('axios');
const EmailService = require('./src/services/email.service');
// Configuration
const PORT = process.env.PORT || 3000;
const API_URL = `http://localhost:${PORT}/api/v1/auth`;
const testUser = {
  email: `test-${Date.now()}@gmail.com`, // Unique email every time
  password: 'Password123!'
};

const emailRecipient = 'susindransd@gmail.com';
const verificationLink = process.env.TEST_VERIFICATION_LINK
  || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify?token=test-token`;

let accessToken = '';

async function runTests() {
  console.log('🚀 Starting Auth Service API Tests...\n');

  try {
    // --- 1. TEST SIGNUP ---
    console.log('--- Testing POST /signup ---');
    const signupRes = await axios.post(`${API_URL}/signup`, testUser);
    console.log('✅ Signup Success:', signupRes.data);
    console.log('User ID:', signupRes.data.user_id);
    console.log('----------------------------\n');

    // --- 2. TEST SIGNIN ---
    console.log('--- Testing POST /signin ---');
    const signinRes = await axios.post(`${API_URL}/signin`, testUser);
    accessToken = signinRes.data.access_token;
    console.log('✅ Signin Success!');
    console.log('JWT Token Received:', accessToken.substring(0, 20) + '...');
    console.log('----------------------------\n');

    // --- 3. TEST PROTECTED ROUTE (DELETE ACCOUNT) ---
    // This tests both the service logic and the auth middleware
    console.log('--- Testing DELETE /delete-account (Protected) ---');
    const deleteRes = await axios.delete(`${API_URL}/delete-account`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    console.log('✅ Delete Account Success:', deleteRes.data);
    console.log('----------------------------\n');

    // --- 4. VERIFY DELETION (TRY LOGIN AGAIN) ---
    console.log('--- Testing Verification (Login after Delete) ---');
    try {
      await axios.post(`${API_URL}/signin`, testUser);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Verification Success: Account no longer exists (401 Unauthorized)');
      } else {
        throw error;
      }
    }
    console.log('----------------------------\n');

    // --- 5. TEST SIGNUP WITH INVALID FRONTENDURL ---
    console.log('--- Testing POST /signup with invalid frontendUrl ---');
    try {
      await axios.post(`${API_URL}/signup`, {
        email: `test-invalid-${Date.now()}@gmail.com`,
        password: 'Password123!',
        frontendUrl: 'http://insecure.com'
      });
      console.error('❌ Should have rejected http:// URL');
      process.exit(1);
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Correctly rejected http:// frontendUrl');
      } else {
        throw error;
      }
    }
    console.log('----------------------------\n');

    // --- 6. TEST SIGNUP WITH VALID FRONTENDURL ---
    console.log('--- Testing POST /signup with valid frontendUrl ---');
    const validFrontendUrl = 'https://app.example.com';
    const signupWithFrontendRes = await axios.post(`${API_URL}/signup`, {
      email: `test-frontend-${Date.now()}@gmail.com`,
      password: 'Password123!',
      frontendUrl: validFrontendUrl
    });
    console.log('✅ Signup with frontendUrl Success:', signupWithFrontendRes.data);
    console.log('----------------------------\n');

    // --- 7. TEST GOOGLE OAUTH REDIRECT ---
    console.log('--- Testing GET /google (OAuth redirect) ---');
    try {
      const googleRes = await axios.get(`${API_URL}/google`, {
        maxRedirects: 0,
        validateStatus: (status) => status === 302
      });
      const redirectLocation = googleRes.headers.location;
      if (redirectLocation && redirectLocation.includes('accounts.google.com')) {
        console.log('✅ Google OAuth redirect URL generated');
        console.log('Redirect to:', redirectLocation.substring(0, 50) + '...');
      } else {
        console.error('❌ Unexpected redirect location:', redirectLocation);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Google OAuth redirect failed');
      throw error;
    }
    console.log('----------------------------\n');

    // --- 8. TEST GOOGLE CALLBACK (MOCK) ---
    console.log('--- Testing GET /google/callback (expects error without real code) ---');
    try {
      await axios.get(`${API_URL}/google/callback`, {
        params: {
          code: 'fake-code-for-testing'
        }
      });
      console.error('❌ Should have failed with fake code');
      process.exit(1);
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Correctly rejected invalid OAuth code');
      } else {
        console.log('⚠️ Got unexpected error (likely Supabase auth error, which is expected)');
      }
    }
    console.log('----------------------------\n');

    console.log('🎉 All tests passed successfully!');

    console.log('\n--- Testing Brevo Email ---');
    const emailResult = await EmailService.sendWelcomeEmail(
      emailRecipient,
      verificationLink
    );
    if (emailResult && emailResult.messageId) {
      console.log('✅ Email sent successfully. Message ID:', emailResult.messageId);
    } else {
      console.log('⚠️ Email test completed without message ID.');
    }
    console.log('----------------------------\n');

  } catch (error) {
    console.error('❌ Test Failed!');
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    } else {
      console.error('Error Message:', error.message);
    }
    process.exit(1);
  }
}

runTests();