---
name: resume-scoring
description: Evaluates candidate resumes against target job descriptions, generating fit scores, strength/weakness analyses, missing gap breakdowns, and actionable tailoring recommendations.
---

# Resume Scoring Skill

Use this skill when evaluating how well a candidate's resume matches a target job description. This can be triggered after a job search query or directly by user request.

## Workflow Overview

### Step 1: Input Collection
1. **Resume**:
   - Check if a resume exists in `.career/` (e.g. `resume.md`, `resume.json`), or retrieve the user's latest resume via MCP `searchSimilarResumes` / `getUser`.
   - If no resume is available, prompt the user to provide their current resume or paste its content.
2. **Job Description**:
   - If the user selected a job from `searchJobsDatabase` or `scrapeJobs`, use the job's title, requirements, and full description (via `getJobDetails` if needed).
   - If the user provided a link or pasted a JD, use that text.

### Step 2: Invoke Scoring Agent
Invoke the `resume-scorer-agent` subagent:
- Pass the full resume content and the complete target job description.
- The subagent evaluates across 5 dimensions:
  1. Hard Skills & Tech Stack (35%)
  2. Experience Level & Seniority (25%)
  3. System Architecture & Scale (20%)
  4. Domain & Industry (10%)
  5. ATS & Keyword Match (10%)

### Step 3: Present Match Scorecard & Gap Analysis
Display the subagent's structured scorecard to the user:
- **Overall Score** (0-100) and Fit Verdict (Strong, Competitive, Moderate, Stretch).
- **Strengths**: Key competitive advantages and matching proof points.
- **Weaknesses**: Under-emphasized claims or lack of quantifiable metrics.
- **Missing Gaps**: What is left or completely absent.
- **ATS Keyword Gap Table**: Matched vs. missing keywords.
- **Actionable Optimization Steps**: Recommendations on what to rewrite or add.

### Step 4: Seamless Transition to Tailoring
Proactively offer next steps:
- **Auto-Tailor Resume**: Offer to execute `resume-builder` (`/career-resume`) to automatically incorporate the missing keywords and optimize XYZ bullet points for this specific job.
- **Draft Referral/Outreach**: Offer to invoke `email-drafter-agent` (`/career-email`) to draft a referral or application email highlighting their top matching strengths.
