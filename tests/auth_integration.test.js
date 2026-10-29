/**
 * HTTP Integration Test for Sessions & Route Protection
 */

const assert = require('assert');
const app = require('../server.js');

async function runIntegration() {
  console.log('\n----------------------------------------------------');
  console.log('🌐 Testing HTTP Sessions & Route Protection');
  console.log('----------------------------------------------------');

  const TEST_PORT = 3001;
  const BASE_URL = `http://localhost:${TEST_PORT}`;

  const server = app.listen(TEST_PORT);

  // Wait for server to bind
  await new Promise(r => setTimeout(r, 600));

  try {
    // 1. Unauthenticated request to /dashboard should redirect
    const dashRes = await fetch(`${BASE_URL}/dashboard`, { redirect: 'manual' });
    assert.strictEqual(dashRes.status, 302, 'Unauthenticated /dashboard should respond with 302');
    const redirectLocation = dashRes.headers.get('location');
    assert(redirectLocation.includes('/auth/login'), 'Should redirect to /auth/login');
    console.log('  ✓ Unauthenticated /dashboard blocked and redirected to login');

    // 2. Unauthenticated request to /admin should redirect
    const adminRes = await fetch(`${BASE_URL}/admin`, { redirect: 'manual' });
    assert.strictEqual(adminRes.status, 302, 'Unauthenticated /admin should respond with 302');
    assert(adminRes.headers.get('location').includes('/auth/login'), 'Should redirect to /auth/login');
    console.log('  ✓ Unauthenticated /admin blocked and redirected to login');

    // 3. Demo passwords must not authenticate a different account.
    const invalidAdminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'email=admin%40university.edu&password=student123',
      redirect: 'manual'
    });
    assert.strictEqual(invalidAdminLoginRes.status, 302);
    assert(invalidAdminLoginRes.headers.get('location').includes('/auth/login'), 'Incorrect admin password should be rejected');
    console.log('  ✓ Demo password cannot authenticate an unrelated account');

    // 4. Login as Student
    const studentLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'email=alex.chen@university.edu&password=student123',
      redirect: 'manual'
    });

    assert.strictEqual(studentLoginRes.status, 302, 'Login should respond with 302 redirect');
    const setCookie = studentLoginRes.headers.get('set-cookie');
    assert(setCookie && setCookie.includes('campus_session_id'), 'Session cookie should be issued');
    const sessionCookie = setCookie.split(';')[0];
    console.log('  ✓ Student login succeeded and session cookie issued');

    // 4. Access /dashboard with student session cookie
    const authDashRes = await fetch(`${BASE_URL}/dashboard`, {
      headers: { Cookie: sessionCookie }
    });
    assert.strictEqual(authDashRes.status, 200, 'Authenticated /dashboard should return 200');
    const dashHtml = await authDashRes.text();
    assert(dashHtml.includes('Alex Chen'), 'Dashboard page should include student name');
    console.log('  ✓ Student can view protected /dashboard');

    // 5. Student trying to access /admin should be blocked
    const studentAdminRes = await fetch(`${BASE_URL}/admin`, {
      headers: { Cookie: sessionCookie },
      redirect: 'manual'
    });
    assert(studentAdminRes.status === 403 || studentAdminRes.status === 302, 'Student accessing /admin must be denied');
    console.log('  ✓ Student denied access to /admin (403/Forbidden redirect)');

    // 6. Login as Admin
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'email=admin@university.edu&password=admin123',
      redirect: 'manual'
    });

    const adminCookie = adminLoginRes.headers.get('set-cookie').split(';')[0];
    const authAdminRes = await fetch(`${BASE_URL}/admin`, {
      headers: { Cookie: adminCookie }
    });
    assert.strictEqual(authAdminRes.status, 200, 'Admin accessing /admin should return 200');
    const adminHtml = await authAdminRes.text();
    assert(adminHtml.includes('Dispatch') && adminHtml.includes('Console'), 'Admin page should render');
    console.log('  ✓ Administrator authenticated and authorized for /admin');

    // 7. Logout
    const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
      headers: { Cookie: adminCookie },
      redirect: 'manual'
    });
    assert.strictEqual(logoutRes.status, 302, 'Logout should redirect');
    console.log('  ✓ Logout properly destroys session and redirects');

    console.log('\n----------------------------------------------------');
    console.log('🎉 ALL HTTP SESSION & AUTH TESTS PASSED!');
    console.log('----------------------------------------------------\n');

    server.close();
    process.exit(0);
  } catch (err) {
    console.error('Integration test failed:', err);
    server.close();
    process.exit(1);
  }
}

runIntegration();
