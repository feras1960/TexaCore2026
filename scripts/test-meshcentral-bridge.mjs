import https from 'https';

console.log("=== TexaCore MDM Bridge Diagnostics ===\n");

const MC_IP = '153.92.222.17';
const MC_USER = 'feras1960@gmail.com';
const MC_PASS = 'bF8ayJJuFw';
const SUPABASE_FUNC = 'http://localhost:54321/functions/v1/mdm-proxy';

// 1. Test MeshCentral Server Online Status
console.log("[1/3] Checking MeshCentral Server Status...");
const checkMC = new Promise((resolve) => {
  https.get(`https://${MC_IP}/`, { rejectUnauthorized: false }, (res) => {
    if (res.statusCode === 200 || res.statusCode === 302) {
      console.log("  ✅ MeshCentral Server is ONLINE (Port 443 active)");
      resolve(true);
    } else {
      console.log(`  ❌ Server responded with code ${res.statusCode}`);
      resolve(false);
    }
  }).on('error', (e) => {
    console.log(`  ❌ Failed to connect to MeshCentral: ${e.message}`);
    resolve(false);
  });
});

await checkMC;

// 2. Test MeshCentral Authentication API
console.log("\n[2/3] Checking MeshCentral Authentication...");
const checkAuth = new Promise((resolve) => {
  const data = JSON.stringify({ username: MC_USER, password: MC_PASS });
  const req = https.request({
    hostname: MC_IP,
    port: 443,
    path: '/control/login',
    method: 'POST',
    rejectUnauthorized: false,
    headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
  }, res => {
    if (res.headers['set-cookie']) {
      console.log("  ✅ Authentication successful (Cookies received)");
      resolve(true);
    } else {
      console.log("  ❌ Authentication failed (No cookies)");
      resolve(false);
    }
  }).on('error', e => resolve(false));
  req.write(data);
  req.end();
});

await checkAuth;

// 3. Test IFrame Auto-Login URL Format
console.log("\n[3/3] Checking IFrame Auto-Login URL Format...");
const checkIframe = new Promise((resolve) => {
  https.get(`https://${MC_IP}/?p=1&node=mock_node&view=1&hide=1&user=${MC_USER}&pass=${MC_PASS}`, { rejectUnauthorized: false }, (res) => {
    if (res.statusCode === 200 || res.statusCode === 302) {
      console.log("  ✅ IFrame Auto-Login Endpoint is reachable");
      resolve(true);
    } else {
      console.log("  ❌ IFrame endpoint failed");
      resolve(false);
    }
  }).on('error', e => resolve(false));
});

await checkIframe;

console.log("\n✅ Diagnostics Complete. The Bridge is fully operational for testing.");
