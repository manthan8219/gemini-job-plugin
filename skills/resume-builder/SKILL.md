---
name: resume-builder
description: Analyzes job descriptions and orchestrates an iterative quality loop between resume-specialist and hr-reviewer-agent until the resume achieves a passing HR score (>=85), then converts to PDF and persists to database.
---

# Multi-Country Tailored Resume Builder with Automated HR Review Loop

Use this skill when the user provides a job description (or link) and asks to build, update, or tailor their resume for a position.

---

## Workflow Overview

### Step 1: Detect Target Country & Resolve Templates
1. Inspect the Job Description, employer headquarters, job location, or user request to identify the target country.
2. The templates are located at `~/.gemini/config/plugins/job-assistant/skills/resume-builder/templates/` (or relative `skills/resume-builder/templates/`):
   - **US & Canada**: `us_canada/`
   - **United Kingdom & Ireland**: `uk/`
   - **Germany, Austria & Switzerland (DACH)**: `dach_germany/`
   - **India**: `india/`
   *(Default to US/Canada if location is remote or unspecified).*

### Step 2: Gather Comprehensive Candidate Context
1. **Read Country Guidelines & Templates**:
   - Use `view_file` to read `template.md` and `guidelines.md` for the chosen region.
2. **Read Candidate History & Verified Git Forensics**:
   - Load candidate profile from `.job-assistant-session.json` or call `getJobProfile`.
   - Read verified code achievements and metrics from `.career/repos-extracted.json` (or call `getUserWorkList`).
   - Read candidate's baseline resume from previous sessions or `.career/resume.md` if available.
3. **Target Job Description**:
   - Extract the target job requirements, responsibilities, tech stack, and company culture.

---

### Step 2b: Existing Resume Reuse Check & Instant HR Pre-Screen (Mandatory)
Before generating a brand-new resume from scratch, check whether an existing resume in the database or local workspace already qualifies:

1. **Query Existing Resumes**:
   - Call `getResumeForJob({ jobId })` if this request targets a specific job ID.
   - Or call `getUserResumes` / `getLatestResume` to fetch the user's latest stored resumes.
   - Or check `.career/tailored-resume.md` / `.career/resume.md`.

2. **Evaluate Existing Resume via `hr-reviewer-agent`**:
   If an existing resume is retrieved, pass it immediately to `hr-reviewer-agent` with the target Job Description:
   ```json
   {
     "resume_content": "<Existing Resume Markdown>",
     "job_description": "<Target JD>"
   }
   ```

3. **Branch Decision**:
   - **Case A: HR Passes Existing Resume (Score >= 85)**:
     - **Reuse the existing resume!** Do not waste time or tokens regenerating what already works.
     - Notify the user:
       > *"🎯 Found an existing resume in your database that scored **<score>/100 (PASS)** for this role! It satisfies all ATS keywords, Google XYZ metrics, and recruiter requirements. Reusing this resume."*
     - Skip directly to **Step 5: Post-Pass Finalization** (convert to PDF via `convertMdToPdf` if needed and present the final resume).

   - **Case B: HR Flags Deficiencies (Score < 85)**:
     - The existing resume has gaps compared to this specific job description.
     - Notify the user:
       > *"ℹ️ Existing resume evaluated by HR scored **<score>/100 (Needs Revision)** for this specific role.*
       > *Missing requirements: <list of missing keywords/gaps>.*
       > *Initiating the Resume Specialist refinement loop to produce a targeted version..."*
     - Pass the existing resume along with the HR's specific critique and revision instructions directly to `resume-specialist` in **Step 3 / Step 4** to produce a targeted, passing version.

4. **If No Existing Resume Exists**:
   - Proceed directly to **Step 3** to craft the initial draft from candidate profile and verified git forensics.

---

### Step 3: Initial Draft Generation (`resume-specialist`)
Invoke the `resume-specialist` subagent to generate Draft 1 (or refine the existing resume):

```text
Please craft a targeted, high-impact, ATS-optimized resume.

TARGET JOB DESCRIPTION:
[Extracted JD]

CANDIDATE BACKGROUND & VERIFIED FORENSICS:
[Profile + Extracted Repo Forensics + Prior Resume]

COUNTRY GUIDELINES TO ENFORCE:
[Content of guidelines.md]

REQUIRED TEMPLATE FORMAT:
[Content of template.md]

HR PRE-SCREEN FEEDBACK (If existing resume was evaluated):
[Insert HR critique, missing keywords, and revision instructions, or 'None - Initial Draft']

INSTRUCTIONS:
Output the complete resume in Markdown format following Google's XYZ formula.
```

Wait for `resume-specialist` to return the draft.

---

### Step 4: The Automated HR Review Loop (`resume-agent` + `hr-reviewer-agent`)
Run an iterative adversarial loop between the candidate resume generator and the HR reviewer:

```
┌────────────────────────────────────────────────────────┐
│               1. resume-specialist                     │
│           (Generates / Refines Resume)                 │
└───────────────────────────┬────────────────────────────┘
                            │ (Draft N)
                            ▼
┌────────────────────────────────────────────────────────┐
│               2. hr-reviewer-agent                     │
│         (Evaluates & Scores against JD)                │
└───────────────────────────┬────────────────────────────┘
                            │
               ┌────────────┴────────────┐
               │  HR Score >= 85 (PASS)? │
               └────────────┬────────────┘
                            │
              NO (Score < 85)│           YES (Score >= 85)
              (Needs Revision)│           (Good to go!)
                            │                   │
                            ▼                   ▼
    Feed HR critique & instructions     Proceed to Step 5
    back to resume-specialist           (Convert to PDF &
    (Max 4 iterations)                   Save to DB)
```

#### Loop Execution:
1. **Send Draft to HR Screener**:
   Invoke `hr-reviewer-agent` with:
   - Current Resume Draft Markdown
   - Target Job Description
   - Iteration Number (e.g. Iteration 1)

2. **Evaluate HR Verdict**:
   Parse the structured JSON returned by `hr-reviewer-agent`:
   ```json
   {
     "score": 88,
     "passing_threshold": 85,
     "passed": true,
     "verdict": "PASS",
     "category_scores": { ... },
     "feedback": { ... }
   }
   ```

3. **Branch Logic**:
   - **If `passed === false` (Score < 85)**:
     - Inform the candidate in chat:
       > *"🔄 HR Screening Iteration <N>: Score **<score>/100** (Needs Revision).*
       > *HR Feedback: <summary of deficiencies>.*
       > *Sending back to Resume Specialist for targeted revisions..."*
     - Re-invoke `resume-specialist` in **Revision Mode**:
       - Pass the previous resume draft.
       - Pass the target Job Description.
       - Pass `feedback.deficiencies_and_weaknesses`, `feedback.missing_critical_keywords`, and `feedback.revision_instructions`.
     - Receive the revised draft and loop back to **Step 4.1**.
     - *(Safety Cap: Stop after 4 iterations if threshold is not reached and select the highest-scoring revision).*

   - **If `passed === true` (Score >= 85)**:
     - HR approves!
     - Inform the candidate in chat:
       > *"✅ **HR Screening PASSED!** (Iteration <N>, Score: **<score>/100** - Verdict: **PASS**).*
       > *The resume meets all hiring manager criteria, ATS keyword thresholds, and Google XYZ impact standards."*
     - Break out of the loop and proceed to **Step 5**.

---

### Step 5: Post-Pass Finalization ("The Other Things")
Once the resume passes the HR review:

1. **Save Final Markdown**:
   - Write the approved resume to `.career/tailored-resume.md` in the active workspace.

2. **Convert to ATS-Optimized PDF (`convertMdToPdf`)**:
   - Call the `convertMdToPdf` MCP tool on `.career/tailored-resume.md` to generate a pixel-perfect, ATS-compliant PDF:
     ```json
     {
       "markdownFilePath": "<workspace>/.career/tailored-resume.md"
     }
     ```
   - Verify the PDF output is generated at `.career/tailored-resume.pdf`.

3. **Persist & Vector Embed in Database (`createResume`)**:
   - Call the `createResume` MCP tool to save the candidate's tailored resume into MongoDB with 1536-dimensional vector embeddings for future semantic search and matching:
     ```json
     {
       "title": "Tailored Resume - <Role> @ <Company>",
       "content": "<Markdown content>"
     }
     ```

4. **Present Results to User**:
   - Display the final HR Scorecard with pillar breakdown (Keyword Alignment, XYZ Metrics, Technical Depth, Scannability, Completeness).
   - Display the total iterations taken to pass.
   - Present the final resume in chat.
   - Provide direct links to `.career/tailored-resume.md` and the generated PDF file.
