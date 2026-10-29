/**
 * Phase 2 Automated Verification Tests (Supabase Edition)
 * Tests Validation, Password Hashing, Profiles, Storage Rules, and Route Protection
 */

const assert = require('assert');
const bcrypt = require('bcryptjs');
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');
const { validateRegister, validateItemReport, validateClaim } = require('../middleware/validation');
const { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } = require('../services/storageService');

async function runTests() {
  console.log('----------------------------------------------------');
  console.log('🧪 Starting Phase 2 Tests (Supabase Architecture)');
  console.log('----------------------------------------------------');

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
    }
  }

  async function testAsync(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
    }
  }

  // ==========================================
  // 1. Password Hashing & Security Tests
  // ==========================================
  console.log('\n[1] Password Hashing & Security Tests:');

  await testAsync('Bcrypt hashes plain passwords and validates correctly', async () => {
    const rawPassword = 'StudentSecret2026!';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(rawPassword, salt);

    assert(hash && hash.startsWith('$2'), 'Hash should be valid bcrypt format');
    const isCorrect = await bcrypt.compare(rawPassword, hash);
    const isWrong = await bcrypt.compare('WrongPassword', hash);

    assert.strictEqual(isCorrect, true, 'Correct password must match hash');
    assert.strictEqual(isWrong, false, 'Wrong password must be rejected');
  });

  // ==========================================
  // 2. Storage Service & Image Validation
  // ==========================================
  console.log('\n[2] Supabase Storage Rules & Validation:');

  test('Storage rules enforce allowed MIME types & 5MB file limit', () => {
    assert(ALLOWED_MIME_TYPES.includes('image/jpeg'));
    assert(ALLOWED_MIME_TYPES.includes('image/png'));
    assert(ALLOWED_MIME_TYPES.includes('image/webp'));
    assert(!ALLOWED_MIME_TYPES.includes('application/pdf'), 'PDF files must not be allowed as item images');
    assert.strictEqual(MAX_FILE_SIZE, 5 * 1024 * 1024, 'Max upload limit must be 5MB');
  });

  // ==========================================
  // 3. Auth & Role Middleware Tests
  // ==========================================
  console.log('\n[3] Authentication Middleware Tests:');

  test('ensureAuthenticated blocks guests and redirects to login with returnUrl', () => {
    let redirectedTo = null;
    let flashed = null;
    const req = {
      session: {},
      originalUrl: '/dashboard',
      flash: (key, msg) => { flashed = { key, msg }; }
    };
    const res = {
      redirect: (url) => { redirectedTo = url; }
    };
    let nextCalled = false;

    ensureAuthenticated(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, false, 'next() should not be called for guests');
    assert(redirectedTo.includes('/auth/login?redirect='), 'Should redirect to login');
    assert.strictEqual(flashed.key, 'error_msg');
  });

  test('ensureAuthenticated allows logged in profiles', () => {
    const req = {
      session: { user: { id: 'usr-123', role: 'student' } }
    };
    let nextCalled = false;
    ensureAuthenticated(req, {}, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true, 'next() must be called when user session exists');
  });

  test('ensureAdmin blocks students with 403 and permits administrators', () => {
    let studentBlocked = false;
    const studentReq = {
      session: { user: { id: 'usr-123', role: 'student' } },
      flash: () => {}
    };
    const studentRes = {
      status: (code) => {
        if (code === 403) studentBlocked = true;
        return { redirect: () => {} };
      }
    };
    ensureAdmin(studentReq, studentRes, () => {});
    assert.strictEqual(studentBlocked, true, 'Student user should receive 403 status');

    let adminAllowed = false;
    const adminReq = {
      session: { user: { id: 'usr-admin', role: 'admin' } }
    };
    ensureAdmin(adminReq, {}, () => { adminAllowed = true; });
    assert.strictEqual(adminAllowed, true, 'Admin user should be allowed');
  });

  // ==========================================
  // 4. Validation Middleware Tests
  // ==========================================
  console.log('\n[4] Validation Middleware Tests:');

  test('validateRegister catches password mismatches and short passwords', () => {
    let errorMsg = null;
    const req = {
      body: {
        name: 'Alex',
        email: 'alex@uni.edu',
        password: '123',
        confirmPassword: '456'
      },
      flash: (k, msg) => { errorMsg = msg; }
    };
    const res = { redirect: () => {} };
    let nextCalled = false;

    validateRegister(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, false);
    assert(errorMsg.includes('at least 6 characters'));
    assert(errorMsg.includes('do not match'));
  });

  test('validateClaim catches empty or short proof', () => {
    let errorMsg = null;
    const req = {
      body: {
        itemId: '101',
        proofDescription: 'Short'
      },
      flash: (k, msg) => { errorMsg = msg; },
      header: () => '/items/101'
    };
    const res = { redirect: () => {} };
    let nextCalled = false;

    validateClaim(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, false);
    assert(errorMsg.includes('at least 10 characters'));
  });

  console.log('\n----------------------------------------------------');
  console.log(`Results: ${passed} / ${total} tests passed!`);
  console.log('----------------------------------------------------');

  if (passed === total) {
    console.log('🎉 ALL SUPABASE ARCHITECTURE TESTS COMPLETED SUCCESSFULLY!\n');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
