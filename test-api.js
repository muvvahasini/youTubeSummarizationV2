// Simple test script to check API endpoints
const axios = require('axios');

async function testAPI() {
    try {
        console.log('Testing health endpoint...');
        const healthResponse = await axios.get('http://localhost:5000/api/health');
        console.log('Health check:', healthResponse.data);

        console.log('\nTesting session start endpoint...');
        const startResponse = await axios.post('http://localhost:5000/api/session/start', {
            videoUrl: 'https://www.youtube.com/watch?v=test'
        });
        console.log('Session start:', startResponse.data);

    } catch (error) {
        if (error.response) {
            console.error('Error:', error.response.status, error.response.data);
        } else if (error.request) {
            console.error('No response received:', error.message);
            console.error('Is the backend server running on port 5000?');
        } else {
            console.error('Error:', error.message);
        }
    }
}

testAPI();
