async function testSignupAndLogin() {
  console.log('--- TESTING SIGNUP AND IMMEDIATELY LOGGING IN ---');

  const testEmail = `newuser_${Date.now()}@qaautomater.local`;
  const testPassword = 'MySecretPassword123!';

  // 1. Sign Up
  console.log(`1. Signing up with Email: ${testEmail}...`);
  const signupRes = await fetch('http://localhost:3000/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      firstName: 'New',
      lastName: 'User',
    }),
  });

  const signupData = await signupRes.json();
  console.log('Signup Status:', signupRes.status, signupData);

  if (signupRes.status !== 201) {
    console.error('SIGNUP FAILED');
    process.exit(1);
  }

  // 2. Sign In (Login) with the exact same credentials
  console.log(`2. Logging in with created credentials: ${testEmail}...`);
  const loginRes = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });

  const loginData = await loginRes.json();
  console.log('Login Status:', loginRes.status, loginData);

  if (loginRes.status !== 200 || !loginData.accessToken) {
    console.error('LOGIN FAILED WITH SIGNED UP CREDENTIALS');
    process.exit(1);
  }

  // 3. Test case insensitivity (e.g. UPPERCASE email login)
  console.log('3. Testing Login with Uppercase Email...');
  const upperLoginRes = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail.toUpperCase(),
      password: testPassword,
    }),
  });
  console.log('Uppercase Email Login Status:', upperLoginRes.status);

  if (upperLoginRes.status !== 200) {
    console.error('UPPERCASE LOGIN FAILED');
    process.exit(1);
  }

  console.log('--- SIGNUP AND LOGIN VERIFICATION SUCCESSFUL ---');
}

testSignupAndLogin().catch(console.error);
