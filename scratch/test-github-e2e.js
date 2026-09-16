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
  console.log('--- GITHUB INTEGRATION E2E TEST ---');

  // 1. Login Admin to get Token
  console.log('1. Logging in as Admin...');
  const loginRes = await request('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { email: 'admin@qaautomater.local', password: 'AdminPassword123!' },
  });
  if (loginRes.status !== 200 || !loginRes.body.accessToken) {
    throw new Error('Admin login failed');
  }
  const token = loginRes.body.accessToken;

  // 2. Status Check (before connect)
  console.log('2. Checking Integration Status (Pre-Connect)...');
  const statusPre = await request('http://localhost:3000/integrations/github/status', {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('Status Pre-Connect:', statusPre.status, statusPre.body);

  // 3. Get Connect URL
  console.log('3. Fetching Authorization Connect URL...');
  const connectRes = await request('http://localhost:3000/integrations/github/connect', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  console.log('Connect URL Response:', connectRes.status, connectRes.body.authorization_url);

  // 4. Callback
  console.log('4. Processing OAuth Callback...');
  const callbackRes = await request('http://localhost:3000/integrations/github/callback', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: { code: 'code_e2e_test', installationId: 'inst_e2e_999' },
  });
  console.log('Callback Response:', callbackRes.status, callbackRes.body);

  // 5. Status Check (post connect)
  console.log('5. Checking Integration Status (Post-Connect)...');
  const statusPost = await request('http://localhost:3000/integrations/github/status', {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('Status Post-Connect:', statusPost.status, statusPost.body);

  // 6. List Accessible Repositories
  console.log('6. Fetching Accessible Repositories...');
  const reposRes = await request('http://localhost:3000/integrations/github/repositories', {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('Repositories Response Status:', reposRes.status, 'Total Repos:', reposRes.body.total);
  console.log('Sample Repo:', reposRes.body.repositories?.[0]);

  console.log('--- GITHUB INTEGRATION E2E TEST SUCCESSFUL ---');
}

runE2E().catch((err) => {
  console.error('GitHub Integration E2E Failed:', err);
  process.exit(1);
});
