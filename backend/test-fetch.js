const authUrl = 'http://localhost:5000/api/auth/login';
const txUrl = 'http://localhost:5000/api/transactions';

async function testFetch() {
  try {
    const res1 = await fetch(authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'password' })
    });
    const authData = await res1.json();
    console.log('Auth data:', authData);

    if (!authData.token) {
      console.log('No token returned');
      return;
    }

    const res2 = await fetch(txUrl, {
      headers: { 'Authorization': 'Bearer ' + authData.token }
    });
    const txData = await res2.json();
    console.log('TX count:', Array.isArray(txData) ? txData.length : txData);
    if (Array.isArray(txData) && txData.length > 0) {
      console.log('TX [0]:', txData[0]);
    }
  } catch(e) {
    console.error('Test error:', e);
  }
}

testFetch();
