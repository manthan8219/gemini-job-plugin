---
name: user-onboarding
description: Handles the smart, conversational registration of new users by extracting data from their resume or asking them directly, then saving it via MCP tools.
---

# Smart User Onboarding & Registration Skill

Use this skill whenever a new or unregistered user attempts to use the career toolkit, or when triggered by the global Gatekeeper rule.

## Model Usage
This is a straightforward, conversational task. To save resources and reduce latency, execute this skill by delegating it to a subagent with the `Model` argument set to `flash`.

## Workflow Overview

### Step 0: Identify the User via Email
1. Ask the user for their **Email Address** to check if they have an existing account (if you don't already have it).
2. If the user provides an email and is already registered, check if their onboarding is complete. If so, welcome them back, exit this skill, and resume their original request.
3. If the user is NOT registered, use the `user-creation` skill to create their user record first, then proceed to Step 1.

### Step 1: Smart Data Collection
1. Greet the user warmly and explain that you need to set up their profile before proceeding.
2. Tell the user they can **EITHER**:
   - Provide their **First Name**, **Last Name**, and **Email Address** directly in the chat.
   - **OR** simply upload their current resume, and you will extract the information for them.
3. **STOP** and wait for the user to reply or upload a file.

### Step 2: Resume Analysis & Gap Filling
1. If the user provided a resume, analyze it immediately. 
2. Extract the First Name, Last Name, and Email.
3. Check for missing fields. If any required information is missing, ask the user ONLY for the pending information. 
4. Wait for them to provide the missing details.

### Step 3: Database Sync & Session Storage
1. Once you have all the required details, call `register` or `createUser` (if applicable) to save their profile.
2. IMPORTANT: You must save their session locally so they stay logged in. Write a file named `.job-assistant-session.json` in the root of the active workspace. The file must contain valid JSON with the `userId`, `email`, and any returned authentication tokens or frequent user info. Example:
   ```json
   {
     "userId": "12345",
     "email": "user@example.com",
     "first_name": "Manthan",
     "token": "eyJhb...",
     "refresh_token": "def456..."
   }
   ```
3. Call `markOnboardingCompleted` to permanently flag the user as fully onboarded in Redis and MongoDB.
4. Wait for the tool to confirm it was successful.

### Step 4: Confirmation & Transition
1. Confirm to the user that their profile has been successfully registered.
2. Seamlessly pivot back to their original request (e.g., if they uploaded a resume for onboarding, you can now transition into using that same resume for the `resume-builder` skill).
