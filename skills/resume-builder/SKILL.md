---
name: resume-builder
description: Analyzes job descriptions and generates highly tailored, ATS-friendly resumes customized to specific country norms (US/Canada, UK, Germany/DACH, India) using a specialized subagent.
---

# Multi-Country Tailored Resume Builder Skill

Use this skill when the user provides a job description (or link) and asks to build, update, or tailor their resume for a position in any market or country.

## Workflow Overview

### Step 1: Detect Target Country & Resolve Paths
Inspect the Job Description, employer headquarters, job location, or user request to identify the target country. 

The templates are located at this absolute base path: `~/.gemini/config/plugins/job-assistant/skills/resume-builder/templates/` (expand `~` to the user's home directory).
- **US & Canada**: `us_canada/`
- **United Kingdom & Ireland**: `uk/`
- **Germany, Austria & Switzerland (DACH)**: `dach_germany/`
- **India**: `india/`
*(If location is ambiguous, ask the user or default to US/Canada).*

### Step 2: Load Required Context via Tools
You must explicitly read the template files into your memory:
1. Use the `view_file` tool to read the contents of the chosen `template.md`.
2. Use the `view_file` tool to read the contents of the chosen `guidelines.md`.
3. Extract the user's background/resume and the target Job Description from the conversation.

### Step 3: Orchestrate the Resume Specialist Subagent
Subagents run in isolation and do not share your memory. You MUST pass all the context you just loaded directly into the subagent's Prompt.

Invoke the `resume-specialist` agent using the `invoke_subagent` tool with this exact Prompt structure:

```text
Please craft a targeted, high-impact, ATS-optimized resume.

TARGET JOB DESCRIPTION:
[Insert the extracted JD here]

CANDIDATE BACKGROUND:
[Insert the user's background/resume here]

COUNTRY GUIDELINES TO ENFORCE:
[Insert the exact text you read from guidelines.md]

REQUIRED TEMPLATE FORMAT:
[Insert the exact text you read from template.md]

INSTRUCTIONS:
Output the complete resume in Markdown, followed by an ATS Keyword & Fit Analysis Breakdown. Ensure strict adherence to the Country Guidelines.
```

### Step 4: Review & Output
- Wait for the subagent to complete.
- Verify the subagent's output strictly followed the anti-bias and length rules from the guidelines.
- Present the final Markdown resume to the user alongside the ATS Optimization Summary.
