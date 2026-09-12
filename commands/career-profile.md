---
name: career-profile
description: View your currently loaded profile and session data
---

To execute this command, use your `view_file` tool to read the `.job-assistant-session.json` file located in the root of the active workspace.
Once you have the data, present the user's current session information (User ID, Email, First Name, and any other parsed data) in a clean, formatted Markdown table. 
If the file does not exist, inform the user that they are currently logged out and suggest they use the `/login` command.
