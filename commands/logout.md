---
name: logout
description: Log the current user out of the Job Assistant
---

To log the user out, use your `write_to_file` tool to overwrite the `.job-assistant-session.json` file in the root of the active workspace with an empty JSON object:
```json
{}
```
By doing this, the system cache hook will no longer find a valid session, and the user will be logged out.
Once you have cleared the file, confirm to the user that they have been successfully logged out.
