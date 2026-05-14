const https = require('https');

const data = JSON.stringify({
  username: 'feras1960@gmail.com',
  password: 'bF8ayJJuFw'
});

const req = https.request({
  hostname: '153.92.222.17',
  port: 443,
  path: '/control/login',
  method: 'POST',
  rejectUnauthorized: false,
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, res => {
  let body = '';
  const cookies = res.headers['set-cookie'];
  console.log('Cookies:', cookies);
  
  res.on('data', d => body += d);
  res.on('end', () => {
    if (cookies) {
      const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');
      const tokenReq = https.request({
        hostname: '153.92.222.17',
        port: 443,
        path: '/control/logintoken',
        method: 'POST',
        rejectUnauthorized: false,
        headers: { 'Cookie': cookieHeader }
      }, tRes => {
        let tBody = '';
        tRes.on('data', d => tBody += d);
        tRes.on('end', () => console.log('Token:', tBody));
      });
      tokenReq.end();
    }
  });
});
req.write(data);
req.end();
