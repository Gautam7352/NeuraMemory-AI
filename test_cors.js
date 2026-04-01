const http = require('http');

const options = {
  hostname: 'localhost',
  port: 8080, // Default port? Let's check config
  path: '/health',
  method: 'GET',
  headers: {
    // Intentionally omit Origin
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.end();
