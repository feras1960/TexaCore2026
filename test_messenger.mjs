import https from 'https';
const req = https.get('https://153.92.222.17/meshcentral.js', { rejectUnauthorized: false }, res => {
  let d = '';
  res.on('data', chunk => d+=chunk);
  res.on('end', () => {
     const matches = d.match(/view\s*===?\s*\d+/g);
     console.log(Array.from(new Set(matches)));
  });
});
