---
name: job-search
description: Discovers and filters relevant job openings based on the user's target profile criteria using PostgreSQL database search and real-time board scrapers.
---

# Job Discovery & Search Skill

Use this skill whenever a user wants to find job openings matching their target profile, or when transitioning from user onboarding.

## Workflow Overview

### Step 1: Profile Retrieval & Criteria Confirmation
1. Retrieve the user's target job preferences:
   - Check `.job-assistant-session.json` or call `getJobProfile`.
   - Extract `targetTitles`, `locations`, `workArrangements`, `employmentTypes`, `mustHaveSkills`, and `experienceYears`.
2. **Always Confirm Before Searching (Mandatory Gatekeeper)**:
   - Present the detected search criteria clearly to the user:
     > *"We think this is what you're looking for based on your profile criteria:*
     > - **Target Roles**: [e.g., Senior Software Engineer, Backend Engineer]
     > - **Locations**: [e.g., Pune, Bengaluru, Remote]
     > - **Work Arrangement**: [e.g., Remote, Hybrid]
     > - **Key Skills**: [e.g., Java, Spring Boot, Kubernetes, AWS]
     > 
     > *Would you like us to proceed with searching for matching jobs based on these criteria?"*
   - Give the user an immediate opportunity to confirm or supply additional filters (specific companies, salary minimum, remote-only).
   - **Do NOT execute the search tool until the user confirms.**

### Step 2: Query PostgreSQL Jobs Database
1. Once confirmed, invoke the `searchJobsDatabase` MCP tool:
   - `query`: Target title (e.g. `Backend Engineer`).
   - `workArrangement`: Match preferred arrangement (e.g. `remote` or `hybrid`).
   - `countryCode`: ISO country code (e.g. `IN`, `US`).
   - `skills`: User's top skills.
   - `limit`: 10-20.
2. If few results are returned or the user prefers live board scrapes:
   - Invoke `scrapeJobs` across the 8 supported platforms (`ashby`, `greenhouse`, `lever`, `himalayas`, `remotive`, etc.) with `saveToDatabase: true`.

### Step 3: Present Curated Matches
1. Format the results in a clean, structured table or bullet list:
   - **Job Title & Company**: e.g., `Senior Backend Engineer @ Stripe`
   - **Location & Arrangement**: `Remote (India / Global)`
   - **Salary / Compensation**: If available, or `Not specified`
   - **Match Score / Rationale**: Highlight why this fits their skills (e.g. "Direct match for Java, Kubernetes, and Distributed Systems")
   - **Direct Apply URL**: Link to the application page
2. Keep listings concise and highlight the top 3-5 best fits.

### Step 4: Next Steps & Application Workflow
Ask the user which listing interests them most:
- **Score Resume against Job**: Invoke `resume-scorer-agent` to evaluate fit, strengths, weaknesses, and missing keywords against the selected JD.
- **Tailor Resume**: Offer to run `resume-builder` (`/career-resume`) with the job description to generate an ATS-optimized PDF.
- **Draft Outreach**: Offer to draft a cold outreach email or referral request for that company via `email-drafter-agent`.
