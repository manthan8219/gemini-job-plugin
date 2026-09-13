---
name: resume-scoring
description: Evaluates candidate resumes against target job descriptions, generating fit scores, strength/weakness analyses, missing gap breakdowns, and actionable tailoring recommendations in strict JSON.
---

# Resume Scoring Skill

Use this skill when evaluating how well a candidate's resume matches a target job description. This can be triggered after a job search query or directly by user request (`/career-score`).

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

### Step 3: Parse Structured JSON Response
The `resume-scorer-agent` strictly returns a valid JSON object adhering to this schema:

```json
{
  "overall_score": 82,
  "fit_verdict": "Strong Fit | Competitive Fit | Moderate Fit | Stretch",
  "score_breakdown": {
    "hard_skills": { "score": 30, "max_score": 35, "status": "strong", "summary": "..." },
    "experience_and_seniority": { "score": 22, "max_score": 25, "status": "strong", "summary": "..." },
    "architecture_and_scale": { "score": 15, "max_score": 20, "status": "moderate", "summary": "..." },
    "domain_and_industry": { "score": 8, "max_score": 10, "status": "strong", "summary": "..." },
    "ats_keyword_compatibility": { "score": 7, "max_score": 10, "status": "moderate", "summary": "..." }
  },
  "strong_points": [
    { "area": "...", "detail": "...", "evidence": "..." }
  ],
  "weaknesses": [
    { "area": "...", "detail": "...", "impact": "..." }
  ],
  "missing_gaps": [
    { "requirement": "...", "importance": "high | medium | low", "suggested_action": "..." }
  ],
  "keyword_matrix": {
    "matched": ["string"],
    "partial": ["string"],
    "missing": ["string"]
  },
  "actionable_recommendations": [
    { "category": "resume_revision | skill_highlighting | interview_preparation", "target_section": "...", "recommendation": "..." }
  ]
}
```

Optional: Persist the JSON scoring output to `.career/score-[job-id].json` for programmatic reference by downstream tools.

### Step 4: Display Clean Scorecard to the User
Render the JSON data into a clean, easy-to-read Markdown scorecard for the user in chat:
- Overall Score badge and fit verdict.
- Dimension score breakdown table.
- Bulleted strong points with metrics.
- Weaknesses & missing critical gaps.
- Keyword match summary table.
- Actionable improvement plan.

### Step 5: Seamless Transition to Tailoring
Proactively offer next steps based on the JSON gaps:
- **Auto-Tailor Resume**: Offer to execute `resume-builder` (`/career-resume`) passing `missing_gaps` and `keyword_matrix.missing` from the JSON to automatically weave them into the resume and optimize XYZ bullet points.
- **Draft Referral/Outreach**: Offer to invoke `email-drafter-agent` (`/career-email`) passing `strong_points` from the JSON to craft a compelling outreach email.
