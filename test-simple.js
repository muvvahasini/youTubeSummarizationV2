// Simple test without axios
const http = require('http');

function testAPI() {
    const postData = JSON.stringify({
        videoUrl: 'https://www.youtube.com/watch?v=test'
    });

    const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/session/start',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const req = http.request(options, (res) => {
        console.log(`STATUS: ${res.statusCode}`);
        console.log(`HEADERS: ${JSON.stringify(res.headers)}`);

        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            console.log('BODY:', data);
        });
    });

    req.on('error', (e) => {
        console.error(`Problem with request: ${e.message}`);
    });

    req.write(postData);
    req.end();
}

// Test health endpoint first
const healthOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/health',
    method: 'GET'
};

const healthReq = http.request(healthOptions, (res) => {
    console.log(`HEALTH STATUS: ${res.statusCode}`);

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('HEALTH BODY:', data);

        // Now test the session start
        console.log('\n--- Testing session start ---');
        testAPI();
    });
});

healthReq.on('error', (e) => {
    console.error(`Health request problem: ${e.message}`);
});

healthReq.end();
