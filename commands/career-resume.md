---
name: career-resume
description: Quickly trigger the resume builder for a specific job with automated HR review loop and PDF conversion
---

Acknowledge the user's request to build a tailored resume. 
Immediately execute the `resume-builder` skill to begin the process:
1. Load the country template and verified engineering accomplishments from local git repositories.
2. Generate an initial draft and run the automated **`resume-specialist` + `hr-reviewer-agent` loop** until the resume achieves a passing HR score (>=85).
3. Automatically convert the approved resume to PDF via `convertMdToPdf` and save to MongoDB via `createResume`.
4. If the user provided a job description, link, or company name alongside this command, pass that context directly so tailoring begins immediately.

