---
name: user-onboarding
description: Handles the smart, conversational registration of new users by extracting data from their resume or asking them directly, then saving it via MCP tools.
---

# Smart User Onboarding & Registration Skill

Use this skill whenever a new or unregistered user attempts to use the career toolkit, or when triggered by the global Gatekeeper rule.

## Workflow Overview

### Step 1: Smart Data Collection
1. Greet the user warmly and explain that you need to set up their profile before proceeding.
2. Tell the user they can **EITHER**:
   - Provide their **First Name**, **Last Name**, and **Email Address** directly in the chat.
   - **OR** simply upload their current resume, and you will extract the information for them.
3. **STOP** and wait for the user to reply or upload a file.

### Step 2: Resume Analysis & Gap Filling
1. If the user provided a resume, analyze it immediately. 
2. Extract the First Name, Last Name, and Email.
3. Check for missing fields. If any required information (First Name, Last Name, or Email) is missing from the resume, ask the user ONLY for the pending information. 
4. Wait for them to provide the missing details.

### Step 3: Database Sync (MCP Tool)
1. Once you have all the required details (extracted or provided manually), prepare the data.
2. Call the `save_user_profile` tool (provided by the local MCP server) passing the First Name, Last Name, and Email.
3. Wait for the tool to confirm the database save was successful.

### Step 4: Confirmation & Transition
1. Confirm to the user that their profile has been successfully registered.
2. Seamlessly pivot back to their original request (e.g., if they uploaded a resume for onboarding, you can now transition into using that same resume for the `resume-builder` skill).
