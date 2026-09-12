---
name: user-onboarding
description: Handles the smart, conversational registration of new users by extracting data from their resume or asking them directly, then saving it via MCP tools.
---

# Smart User Onboarding & Registration Skill

Use this skill whenever a new or unregistered user attempts to use the career toolkit, or when triggered by the global Gatekeeper rule.

## Model Usage
You may delegate this workflow to a subagent. However, because standard subagents do not inherit MCP tools by default, you **MUST** first use your `define_subagent` tool to define a specialized subagent (e.g., named `onboarding-agent`) and explicitly set `"enable_mcp_tools": true`. Then, invoke that subagent to handle this workflow.

## Workflow Overview

### Step 0: Identify the User via Email
1. Ask the user for their **Email Address** to check if they have an existing account (if you don't already have it).
2. If the user provides an email and is already registered, check if their onboarding is complete. If so, welcome them back, exit this skill, and resume their original request.
3. If the user is NOT registered, use the `user-creation` skill to create their user record first, then proceed to Step 1.

### Step 1: Request Resume for Pre-filling
1. Greet the user warmly and explain that you need to set up their Job Profile before proceeding.
2. Ask the user to **upload their current resume**. Explain that you will use it to automatically pre-fill their profile preferences (target titles, experience, skills, etc.) to save them time!
3. **STOP** and wait for the user to upload a file.

### Step 2: Resume Analysis & Pre-filling
1. Once the resume is uploaded, analyze it thoroughly.
2. Attempt to extract or infer the following fields based on the resume:
   - **Target Titles** (e.g., Software Engineer, Product Manager based on past roles)
   - **Locations** (Based on their current city or past roles)
   - **Years of Experience** (Calculate total years of relevant experience)
   - **Must-Have Skills** (Top 5-10 core skills from their resume)
   - **Target Industries** (Inferred from past companies)
   - **Work Arrangements** (Default to Remote, Hybrid, On-Site)
   - **Employment Types** (Default to Full-time)
   - **Requires Sponsorship** (Ask them directly, default to unknown)
   - **Expected Salary** (Ask them directly)

### Step 3: Present Draft Profile & Ask for Confirmation
1. Present the extracted profile to the user in a clean, easy-to-read Markdown list.
2. Explicitly highlight the fields you were able to guess from the resume, and point out any missing text fields (like Salary Expectations).
3. **Interactive Enums:** For fields that have strict options, you MUST use your built-in `ask_question` tool to pop open an interactive UI for the user:
   - Use `ask_question` with `is_multi_select: true` to ask for **Work Arrangements** (Remote, Hybrid, On-site).
   - Use `ask_question` with `is_multi_select: true` to ask for **Employment Types** (Full-time, Contract, Part-time).
   - Use `ask_question` with `is_multi_select: false` to ask for **Visa Sponsorship** (Yes, No).
4. After collecting all the data, ask the user to review the drafted profile. Give them the option to **confirm it as-is**, or **provide changes** to any of the text answers via normal chat.
5. If the user provides corrections, update the profile and present the final version.

### Step 4: Database Sync & Session Storage
1. Once the user confirms the profile is correct, call the appropriate MCP tool to save their complete Job Profile.
2. IMPORTANT: You must save their session locally so they stay logged in. Write a file named `.job-assistant-session.json` in the root of the active workspace. The file must contain valid JSON with the `userId`, `email`, and the newly captured profile data.
3. Call `markOnboardingCompleted` to permanently flag the user as fully onboarded in Redis and MongoDB.
4. Wait for the tool to confirm it was successful.

### Step 5: Local Repository Audit & Portfolio Extraction (Final Onboarding Step)
As the final step of onboarding, proactively offer to audit their local repositories to ground their resume in real code and verified metrics:
1. Ask the user:
   > *"Would you like to connect your local repositories to extract your real-world engineering accomplishments and metrics? This powers our resume builder with verified achievements directly from your code."*
2. Request their contribution identities:
   - Their **GitHub username** (e.g. `manthan8219`).
   - Their **Personal email** (e.g. `user@gmail.com`).
   - Their **Work email(s)** (e.g. `name@company.com`, including any past company emails, since workplace git commits are almost always authored under company email addresses).
3. Auto-discover candidate repositories:
   - Run `node scripts/scan_local_repos.js` to scan `~/Desktop`, `~/Projects`, `~/code`, `~/Documents`, and home directory for any folder containing `.git`.
   - The scanner checks author commits against all provided personal and work email aliases.
   - Present the detected repositories to the user to confirm or add additional paths.
4. If confirmed, trigger the `repo-portfolio-builder` skill:
   - Spawns concurrent `repo-work-extractor` subagents for each repository.
   - Performs deep code reading, schema analysis, and XYZ metric extraction.
   - Saves the resulting JSON chunks into `.career/repos-extracted.json`.
5. If the user prefers to skip for now, inform them they can run `/career-portfolio` at any time.

### Step 6: Confirmation & Transition
1. Confirm to the user that onboarding is 100% complete.
2. Add a friendly hint telling the user: *"Hint: Type `/career-connect-socials` to link your Discord or Telegram for real-time job application updates!"*
3. Seamlessly pivot back to their original career request (e.g. tailoring a resume with the `resume-builder` skill).
