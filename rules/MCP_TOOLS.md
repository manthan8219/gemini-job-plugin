# MCP Tools Usage Guide

You have access to a suite of backend MCP tools through the `job-applier-mcp` server. **Always use these tools exactly when the following scenarios apply:**

## 1. Onboarding & Registration Tools
- **`checkOnboardingCompleted`**: ALWAYS run this tool FIRST at the beginning of a new session or before executing any career task to verify if the user's profile is fully set up.
- **`markOnboardingCompleted`**: Run this immediately after successfully registering a new user or collecting their missing onboarding details.
- **`register` / `login`**: Use these tools if you need to create a secure session for the user or register their base credentials.
- **`createUser` / `getUser`**: Use these for general profile fetching or user creation outside of the strict auth context.

## 2. Resume & Embedding Tools
- **`createResume`**: Use this when a user uploads a new resume, or after you have finalized building a tailored resume for them. This tool safely stores their resume in MongoDB and automatically creates 1536-dimensional embeddings for semantic search.
- **`searchSimilarResumes`**: Use this when a user asks you to find a specific resume they uploaded in the past, or when you need to match their past experiences to a new job description.

## 3. Utility & Conversion Tools
- **`convertMdToPdf`**: Use this IMMEDIATELY after you generate a resume in Markdown format. Users usually want a downloadable PDF, so offer this tool or run it automatically to convert the `.md` file to an ATS-friendly PDF.
- **`convertLatexToPdf`**: Use this if the user prefers LaTeX-based resumes and you generate a `.tex` file that needs compiling.

## 4. Job Search & Discovery Tools
- **`searchJobsDatabase`**: Primary tool to search the global PostgreSQL jobs database. Accepts query/title, `countryCode` (e.g. 'IN', 'US'), `citySlug`, `workArrangement` ('remote', 'hybrid', 'on-site'), `employmentType`, `skills`, and `salaryMin`.
- **`scrapeJobs`**: Scrapes real-time postings across 8 remote platforms and ATS boards (Himalayas, Remotive, Ashby, Greenhouse, Lever, RemoteOK, Hacker News, Jobicy). Set `saveToDatabase: true` to auto-ingest into PostgreSQL.
- **`getJobDetails`**: Retrieves complete job details, markdown/HTML job description, and apply URL by job UUID.
- **`getJobProfile` / `upsertJobProfile`**: Retrieves or updates the candidate's target job preferences (target titles, locations, skills, salary expectations).
- **`searchCompanies` / `getCompanyDetails`**: Looks up company profiles, ATS platforms used, and active job listings.
- **`getUserApplicationStats`**: Retrieves live application metrics (applications, interviews, offers, rejections).

## 5. Repository Forensics & Work Portfolio Tools
- **`checkRepositoryScraped`**: Checks if a specific repository has already been scraped and analyzed (`{ repositoryId, userId }`). Always check this before starting forensic analysis. If scraped, check for new commits since the last scrape date; skip re-analysis if no new commits exist.
- **`saveUserWork`**: Persists or updates extracted repository work, git forensics, commit analytics, architecture summaries, and Google XYZ impact bullets in PostgreSQL and Redis. Must be invoked every time a repository scan/analysis completes.
- **`getUserWork`**: Retrieves a candidate's specific repository work record by UUID or repository name (queries Redis cache first).
- **`getUserWorkList` / `getFeaturedUserWork`**: Retrieves all candidate repository portfolio items with optional filtering by tier (`flagship`, `contributing`, `spike`), language, or featured status.

## Execution Rules
- **Do not mock data**: If a tool is available, use it rather than pretending to save data.
- **Chain tools logically**: Example: Check onboarding -> Ask questions -> Mark onboarding completed -> Check repository scraped -> Skip unchanged or extract -> Save user work via MCP -> Proactively summarize profile & confirm job search -> Search jobs -> Score jobs -> Tailor resume -> Convert MD to PDF.
- **Pre-Scrape Verification**: Always check `checkRepositoryScraped` (or fallback `getUserWork`) before re-analyzing any codebase. If no commits were authored after `lastScrapedAt`, skip the repository.
- **Mandatory Persistence**: Always call `saveUserWork` upon completing repository forensic analysis.
- **Confirm Before Searching**: Always confirm the search criteria with the user before calling `searchJobsDatabase` or `scrapeJobs`.


