---
name: user-management
description: Handles user login, profile checking, and basic user registration.
---

# User Management Skill

## Model Usage
You may delegate this workflow to a subagent. However, because standard subagents do not inherit MCP tools by default, you **MUST** first use your `define_subagent` tool to define a specialized subagent (e.g., named `auth-agent`) and explicitly set `"enable_mcp_tools": true`. Then, invoke that subagent to handle this workflow.

Use this skill whenever a user attempts to log in, needs to register, or when triggered by the global Gatekeeper rule to ensure the user is authenticated.


## Workflow Overview

### Step 1: Identify the User
1. Check if the user's **Email Address** is already in your memory (injected by the system cache). If not, ask the user for their **Email Address** to check if they have an existing account.
2. If the user is already logged in (email is in memory) or provides an email that is already registered, enthusiastically say "Welcome back!" (using their name if available). Then, immediately execute the `login-logout` skill to fetch/refresh their tokens and save their session, then exit this skill to resume their original request.
3. If the user is NOT registered and not in memory, explain that you need to set up their basic profile before proceeding, and move to Step 2.

### Step 2: User Registration Details
1. Ask the unregistered user to provide their **First Name** and **Last Name**.
2. **STOP** and wait for the user to reply.
3. If they miss any required fields, gently prompt them again until you have their First Name, Last Name, and Email Address.

### Step 3: Registration & Session Storage
1. Once you have all the required details, call the `createUser` tool to create their profile. (If your workflow requires a password, ask the user for one and use the `register` tool instead).
2. IMPORTANT: As soon as the user is successfully registered, you must IMMEDIATELY execute the `login-logout` skill passing their email. This will complete the login workflow by fetching their authentication token and refresh token, and creating the `.job-assistant-session.json` file.

### Step 4: Confirmation
1. Confirm to the user that their profile has been successfully registered and they are logged in.
2. Seamlessly pivot back to their original request.
