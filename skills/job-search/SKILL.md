---
name: job-search
description: Discovers, retrieves, and automatically scores job openings against the candidate's resume/profile using PostgreSQL database search, real-time board scrapers, and the resume scoring agent.
---

# Job Discovery & Search Skill

Use this skill whenever a user wants to find job openings matching their target profile, or when transitioning from user onboarding.

## Workflow Overview

### Step 1: Profile Retrieval & Criteria Confirmation
1. Verify user authentication and profile setup (`checkOnboardingCompleted`).
2. Retrieve the user's target job preferences via `getJobProfile` or `.job-assistant-session.json`:
   - Extract `targetTitles`, `locations`, `workArrangements`, `employmentTypes`, `mustHaveSkills`, and `experienceYears`.
3. **Always Confirm Before Searching (Mandatory Gatekeeper)**:
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

### Step 2: Query Jobs (Database & Scrapers)
1. Once confirmed, invoke the `searchJobsDatabase` MCP tool:
   - `query`: Target title (e.g. `Backend Engineer`).
   - `workArrangement`: Match preferred arrangement (e.g. `remote` or `hybrid`).
   - `countryCode`: ISO country code (e.g. `IN`, `US`).
   - `skills`: User's top skills.
   - `limit`: 10-20.
2. If few results are returned or the user requests fresh external postings:
   - Invoke `scrapeJobs` across the 8 supported platforms (`ashby`, `greenhouse`, `lever`, `himalayas`, `remotive`, etc.) with `saveToDatabase: true`.

### Step 3: Mandatory Automated Resume Scoring Against Each Job
**CRITICAL REQUIREMENT**: As soon as job listings are retrieved, you MUST evaluate and score **every single job** against the candidate's resume/profile before presenting the results to the user. Do not simply list raw jobs without fit scores!

1. **Retrieve Resume / Verified Experience**:
   - Check local resume files (`.career/resume.md`, `.career/repos-extracted.json`) or fetch via `getUser` / `searchSimilarResumes`.
2. **Score Each Job**:
   - For every retrieved job, evaluate its requirements against the candidate's verified skills, seniority, and scale using `resume-scorer-agent` (or batch evaluation against the 5 dimensions).
   - Calculate:
     - **Match Score (0 - 100%)** and **Fit Verdict** (`Strong Fit`, `Competitive Fit`, `Moderate Fit`, `Stretch`).
     - **💪 Key Strengths / Overlap**: Primary technologies and scale matching the role.
     - **⚠️ Critical Gaps / What's Missing**: Essential requirements in the JD that are missing or weak in the candidate's background.
3. **Rank Listings**:
   - Sort the jobs descending by their **Match Score** so the highest-fit opportunities are presented first.

### Step 4: Present Scored Job Openings Table
Display the results in a structured, actionable table featuring the **Match Score** for each job:

```markdown
### 🎯 Matched & Scored Job Openings

| Company | Role | Location & Type | Fit Score | Key Strengths & Missing Gaps | Link |
| :--- | :--- | :--- | :---: | :--- | :---: |
| **[Company A]** | [Job Title] | Remote (India) • Full-Time | 🟢 **92%** (Strong Fit) | **Strong**: Java, K8s, Distributed Scale<br>**Missing**: Terraform | [View Job](url) |
| **[Company B]** | [Job Title] | Worldwide Remote • Full-Time | 🟡 **81%** (Competitive) | **Strong**: Microservices, PostgreSQL<br>**Missing**: FinOps / AWS Cost | [View Job](url) |
| **[Company C]** | [Job Title] | Remote (India) • Contract | 🟠 **65%** (Moderate) | **Strong**: Python, REST APIs<br>**Missing**: Agentic Workflows | [View Job](url) |
```

For the top recommended jobs, provide a brief bulleted breakdown:
- **What makes you fit**: Direct match with their core stack.
- **What is left / Gaps**: Specific keywords or requirements to address before applying.

### Step 5: Next Steps & Application Workflow
Ask the user which listing interests them most:
1. **Deep-Dive Score Report**: Type `/career-score [Job #]` to see the complete 5-dimension JSON breakdown, ATS keyword matrix, and interview prep questions for that specific role.
2. **Tailor Resume**: Execute `resume-builder` (`/career-resume`) to tailor an ATS-optimized PDF that explicitly closes the identified gaps for that job.
3. **Draft Outreach Email**: Invoke `email-drafter-agent` (`/career-email`) to draft a warm referral or recruiter outreach email highlighting the matched strengths.
