---
name: career-score
description: Score your resume against a target job description and get fit analysis, strengths, weaknesses, and missing gaps
---

Acknowledge the user's request to score their resume against a job description.
Execute the `resume-scoring` skill:
1. Ensure the user is authenticated and retrieve their current resume.
2. If the user hasn't provided a job description, ask them to paste the job description or select one from previous search results.
3. Invoke `resume-scorer-agent` to compute an overall match score (0-100) and evaluate strengths, weaknesses, missing keywords, and actionable recommendations.
4. Present the full Scorecard and offer to tailor the resume with `/career-resume`.
