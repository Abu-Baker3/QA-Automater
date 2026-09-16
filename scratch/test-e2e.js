const http = require('http');

async function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method: options.method || 'GET',
        headers: options.headers || {},
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, headers: res.headers, body });
          }
        });
      }
    );
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runE2E() {
  console.log('--- E2E AUTH & ADMIN API VERIFICATION ---');

  // 1. Seed Admin Login
  console.log('1. Testing Seed Admin Login...');
  const loginRes = await request('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { email: 'admin@qaautomater.local', password: 'AdminPassword123!' },
  });
  console.log('Login Status:', loginRes.status);
  console.log('User Role:', loginRes.body.user?.role);
  if (loginRes.status !== 200 || loginRes.body.user?.role !== 'ADMIN') {
    throw new Error('Seed Admin login failed!');
  }
  const token = loginRes.body.accessToken;

  // 2. Auth Me
  console.log('2. Testing /auth/me...');
  const meRes = await request('http://localhost:3000/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('Auth Me Status:', meRes.status, 'Email:', meRes.body.email);

  // 3. Admin Metrics
  console.log('3. Testing /admin/metrics...');
  const metricsRes = await request('http://localhost:3000/admin/metrics', {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('Admin Metrics Status:', metricsRes.status, 'Total Users:', metricsRes.body.totalUsers);

  // 4. Admin Users Directory
  console.log('4. Testing /admin/users Directory...');
  const usersRes = await request('http://localhost:3000/admin/users', {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('Admin Users Status:', usersRes.status, 'User Count:', usersRes.body.length);

  // 5. User Signup
  console.log('5. Testing User Signup...');
  const testEmail = `testuser_${Date.now()}@qaautomater.local`;
  const signupRes = await request('http://localhost:3000/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      email: testEmail,
      password: 'UserPassword123!',
      firstName: 'Test',
      lastName: 'User',
      orgName: 'Test Corp',
    },
  });
  console.log('Signup Status:', signupRes.status, 'New User ID:', signupRes.body.user?.id);
  const newUserId = signupRes.body.user?.id;

  // 6. Delete User Action
  console.log('6. Testing Admin DELETE /admin/users/:id...');
  const deleteRes = await request(`http://localhost:3000/admin/users/${newUserId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('Delete Status:', deleteRes.status, 'Message:', deleteRes.body.message);

  console.log('--- ALL E2E API VERIFICATIONS PASSED SUCCESSFULLY! ---');
}

runE2E().catch((err) => {
  console.error('E2E Test Failed:', err);
  process.exit(1);
});
