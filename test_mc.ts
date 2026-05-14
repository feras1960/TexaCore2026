const mcUrl = 'https://153.92.222.17';
const mcUser = 'feras1960@gmail.com';
const mcPass = 'bF8ayJJuFw';

const loginRes = await fetch(`${mcUrl}/control/login`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username: mcUser, password: mcPass })
});

const cookie = loginRes.headers.get('set-cookie');
console.log("Cookie:", cookie);

const tokenRes = await fetch(`${mcUrl}/control/logintoken`, {
    method: 'POST',
    headers: {
        'Cookie': cookie || ''
    }
});
const tokenData = await tokenRes.text();
console.log("Token:", tokenData);
