---
name: career-login
description: Launch the user onboarding and login process
---

To log the user in securely, first give them this exact clickable link in the chat: `https://job-tools.onrender.com/auth/login?redirect_uri=http://localhost:4132/callback`
Instruct them to click the link to authenticate in their browser.
IMMEDIATELY after sending them the link, run the following command using your `run_command` tool to intercept the callback:
```bash
node scripts/oauth_login.js
```
Once the command successfully completes, read the newly created `.job-assistant-session.json` file and enthusiastically welcome the user back using their first name!
