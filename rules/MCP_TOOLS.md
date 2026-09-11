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

## Execution Rules
- **Do not mock data**: If a tool is available, use it rather than pretending to save data.
- **Chain tools logically**: Example: Check onboarding -> Ask questions -> Mark onboarding completed -> Create resume -> Convert MD to PDF.
