---
name: career-jobs
description: Discover and search for job openings matching your job profile criteria
---

Acknowledge the user's request to search for jobs.
Execute the `job-search` skill:
1. Verify user authentication and profile setup.
2. Present the user's current target roles, locations, work arrangements, and key skills.
3. Confirm with the user before executing the search query.
4. Call `searchJobsDatabase` or `scrapeJobs` to retrieve and present relevant job opportunities.
5. Offer to score their resume against any selected job or tailor an ATS-optimized application.
