async function testMemberGitHubFlow() {
  console.log('--- TESTING MEMBER ROLE GITHUB INTEGRATION ---');

  // Sign up a standard member user
  const email = `member_${Date.now()}@qaautomater.local`;
  const password = 'MemberPassword123!';

  const signupRes = await fetch('http://localhost:3000/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, firstName: 'Member', lastName: 'User' }),
  });
  const signupData = await signupRes.json();
  console.log('1. Member Signup:', signupRes.status, 'Role:', signupData.user?.role || 'MEMBER');

  const token = signupData.accessToken;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 2. Check Connect URL as Member
  const connectRes = await fetch('http://localhost:3000/integrations/github/connect', {
    method: 'POST',
    headers,
  });
  console.log('2. Connect URL (Member):', connectRes.status);
  if (connectRes.status !== 200) {
    console.error('FAILED Connect URL:', await connectRes.json());
    process.exit(1);
  }

  // 3. Complete Callback as Member
  const callbackRes = await fetch('http://localhost:3000/integrations/github/callback', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      code: `code_member_${Date.now()}`,
      installationId: `inst_member_${Date.now()}`,
    }),
  });
  console.log('3. Callback (Member):', callbackRes.status);
  if (callbackRes.status !== 200) {
    console.error('FAILED Callback:', await callbackRes.json());
    process.exit(1);
  }

  // 4. Check Status as Member
  const statusRes = await fetch('http://localhost:3000/integrations/github/status', {
    headers,
  });
  const statusData = await statusRes.json();
  console.log('4. Integration Status (Member):', statusRes.status, statusData);

  // 5. Fetch Repositories as Member
  const reposRes = await fetch('http://localhost:3000/integrations/github/repositories', {
    headers,
  });
  const reposData = await reposRes.json();
  console.log(
    '5. List Repositories (Member):',
    reposRes.status,
    `Repos count: ${reposData.repositories?.length}`,
  );

  console.log('--- MEMBER ROLE GITHUB INTEGRATION SUCCESSFUL! ---');
}

testMemberGitHubFlow().catch(console.error);
