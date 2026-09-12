const fs = require('fs');
const path = require('path');

function checkAuth() {
    const sessionPaths = [
        path.join(process.cwd(), '.job-assistant-session.json'),
        path.join(process.env.USERPROFILE || process.env.HOME || '', '.job-assistant-session.json')
    ];
    
    for (const file of sessionPaths) {
        if (fs.existsSync(file)) {
            try {
                const data = JSON.parse(fs.readFileSync(file, 'utf8'));
                if (data.userId && data.email) {
                    console.log(`[AUTHENTICATED] User ID: ${data.userId}, Email: ${data.email}, Name: ${data.first_name}`);
                    process.exit(0);
                }
            } catch (e) {
                // Ignore parsing errors
            }
        }
    }
    
    console.log('[UNAUTHENTICATED]');
    process.exit(0);
}

checkAuth();
