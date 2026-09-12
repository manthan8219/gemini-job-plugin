const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 4132;
const SESSION_FILE = path.join(process.cwd(), '.job-assistant-session.json');

// URL of your Render backend OAuth endpoint
// Update this to match your actual backend route!
const BACKEND_AUTH_URL = `https://job-tools.onrender.com/auth/login?redirect_uri=http://localhost:${PORT}/callback`;

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);

    if (parsedUrl.pathname === '/callback') {
        const query = parsedUrl.query;
        
        const accessToken = query.accessToken;
        const refreshToken = query.refreshToken;
        const userId = query.userId;
        const email = query.email;
        const firstName = query.firstName || 'User';

        if (accessToken && userId) {
            const sessionData = {
                userId: userId,
                email: email,
                first_name: firstName,
                token: accessToken,
                refresh_token: refreshToken
            };

            // Write to session file
            fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2));

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<html><body><h1>Authentication Successful!</h1><p>You can close this window and return to your terminal.</p></body></html>');
            
            console.log('\n[SUCCESS] Successfully authenticated and saved session!');
            
            // Shut down the server gracefully
            setTimeout(() => {
                server.close();
                process.exit(0);
            }, 1000);
        } else {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end('<html><body><h1>Authentication Failed</h1><p>Missing tokens in callback.</p></body></html>');
            console.log('\n[ERROR] Authentication failed. Missing tokens.');
            
            setTimeout(() => {
                server.close();
                process.exit(1);
            }, 1000);
        }
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.log(`Port ${PORT} is already in use. The authentication server is likely already running in the background.`);
        setTimeout(() => process.exit(0), 10000);
    } else {
        console.error(e);
        process.exit(1);
    }
});

server.listen(PORT, () => {
    console.log(`Starting local server on port ${PORT} to intercept OAuth callback...`);
    console.log('Waiting for authentication to complete in the browser...');
});
