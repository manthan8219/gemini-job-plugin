---
name: login-logout
description: Handles fetching authentication tokens and managing the local session file for logging users in and out.
---

# Login & Logout Skill

## Model Usage
You may delegate this workflow to a subagent. However, because standard subagents do not inherit MCP tools by default, you **MUST** first use your `define_subagent` tool to define a specialized subagent (e.g., named `auth-agent`) and explicitly set `"enable_mcp_tools": true`. Then, invoke that subagent to handle this workflow.

Use this skill to authenticate an existing or newly registered user, fetch their tokens, and manage their local session file.


## Workflow Overview

### Action 1: Login User
If triggered to log a user in:
1. You will receive the user's `email` (and must ask for their `password` if you don't have it).
2. Call the `passportLogin` tool with their email and password to authenticate them and retrieve their `accessToken`, `refreshToken`, and user details.
3. Save their session locally by writing a file named `.job-assistant-session.json` in the root of the active workspace. The file must contain valid JSON:
   ```json
   {
     "userId": "12345",
     "email": "user@example.com",
     "first_name": "Manthan",
     "token": "eyJhb...",
     "refresh_token": "def456..."
   }
   ```
4. Confirm to the user that they are successfully logged in.

### Action 2: Logout User
If triggered to log a user out:
1. Call the `passportLogout` tool passing the current `userId` to revoke their tokens on the backend.
2. Overwrite the `.job-assistant-session.json` file in the root of the active workspace with an empty JSON object:
   ```json
   {}
   ```
2. Confirm to the user that they have been successfully logged out.
