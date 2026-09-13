---
name: repo-portfolio-builder
description: Audits local repositories, checks scrape history with checkRepositoryScraped, skips unchanged repositories, runs forensic extraction, and saves work to PostgreSQL/Redis via saveUserWork.
---

# Repository Portfolio & Deep Work Extraction Skill

Use this skill when the user wants to audit their local git repositories, extract all engineering work they've done across codebases, and store rich, structured JSON chunks of their contributions.

---

## Workflow Overview

### Step 1: Gather Inputs & Fast Auto-Discovery
1. Ask the user for their contribution identities:
   - **GitHub username** (e.g., `manthan8219`)
   - **Personal email** (e.g., `manthanbhatia367@gmail.com`)
   - **Work email(s)** (e.g., `name@company.com`, including past employer emails).
2. Run fast auto-discovery:
   - Run `node scripts/scan_local_repos.js --emails "<comma,separated,emails>"` (or invoke `local-repo-scanner`) to automatically inventory all git repositories across `~/Desktop`, `~/Projects`, `~/code`, `~/workspace`, `~/Documents`, and home directories.
   - The scanner identifies all folders containing `.git` and filters for repositories with verified commits authored by any of the user's identities.
3. Present the discovered candidate repositories to the user to confirm which ones to inspect.

---

### Step 2: Pre-Scraping Check & Incremental Commit Filter (Mandatory Gatekeeper)
Before scanning or analyzing ANY repository, verify whether it has already been scraped and analyzed:

1. **Check Scrape Status**:
   - Call the `checkRepositoryScraped` MCP tool (or run `node scripts/sync_repo_work.js --check <repoName> --path <repoPath> --author "<author>"`):
     ```json
     {
       "repositoryId": "<repository_name>",
       "userId": "<user_uuid>"
     }
     ```
   - *(Note: If `checkRepositoryScraped` is unavailable or returning 404, fallback to `getUserWork` to query existing records in Redis/PostgreSQL).*

2. **Evaluate Scrape State & Commit Timestamps**:
   - **Case A: `isScraped === false` (or not found)**:
     - The repository is fresh. Proceed to **Step 3** for full forensic extraction.
   - **Case B: `isScraped === true`**:
     - Extract `lastScrapedAt` (or `latestCommitDate` / `updatedAt` from previous analysis).
     - Query local git log for any new commits authored by the user after that timestamp:
       ```bash
       git -C "<repoPath>" log --after="<lastScrapedAt>" --author="<author>" --oneline
       ```
     - **If NO new commits exist**:
       - **SKIP ANALYSIS**. Do not spawn extraction subagents.
       - Notify the user:
         > *"Repository **<repository_name>** has already been analyzed (last scraped: <date>). No new commits found since then. Skipping re-analysis."*
     - **If NEW commits exist**:
       - Notify the user:
         > *"Repository **<repository_name>** was previously analyzed on <date>, but has <count> new commit(s). Re-analyzing to capture latest work..."*
       - Proceed to **Step 3** for re-analysis.

---

### Step 3: Apply Repository Tiering Strategy
Classify candidate repositories that need analysis based on commit volume:

| Tier | Commit Criteria | Extraction Strategy | Recommended Subagent Model | Role on Resume |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 1: Flagship / Core** | `>= 50 commits` | Deep forensic code, diffs, schema, & architecture extraction | `pro` (`repo-forensic-extractor`) | Main Experience & Featured Projects |
| **Tier 2: Contributing / Tools** | `10 – 49 commits` | Targeted architecture summary & key XYZ bullets | `flash` (`repo-work-extractor`) | Secondary Projects & OSS Tools |
| **Tier 3: Spikes / POCs** | `1 – 9 commits` | Automated tech stack & skill taxonomy validation | `fast_catalog` (Zero-LLM / Metadata) | Skills & Technologies Validation |

Spawn subagents concurrently for the selected Tier 1 and Tier 2 repositories using `invoke_subagent`:

```json
{
  "Subagents": [
    {
      "TypeName": "repo-work-extractor",
      "Role": "Forensic Extractor - <RepoName>",
      "Prompt": "Perform an exhaustive, deep code and git history extraction across author identities ['<author1>', '<author2>'] in repository '<repository_path>'. Run git queries with Cwd set to repo path. Read the manifests, code, diffs, database schemas, and architectural archetypes. Calculate clean churn excluding lockfiles. Return strictly valid JSON as instructed.",
      "Model": "pro"
    }
  ]
}
```

---

### Step 4: Collect & Validate Forensic JSON Chunks
1. Wait for all active subagents to finish.
2. Parse each subagent's returned JSON:
   - `repository_name`
   - `repository_path`
   - `remote_url`
   - `tier` (`flagship` | `contributing` | `spike`)
   - `primary_languages`
   - `technologies_detected` (frameworks, databases, infrastructure_and_cloud, libraries_and_tools)
   - `timeline` (duration_formatted, first_commit_date, latest_commit_date, total_active_days)
   - `commits_summary` (total_commits, lines_added, lines_deleted, files_modified, key_modules_touched, top_files_authored_or_modified)
   - `work_description` (system_overview, role_and_ownership, technical_challenges_solved)
   - `bullet_points` (Google XYZ formula)
   - `most_effective_work_list` (top standout engineering feats)

---

### Step 5: Save & Sync via `saveUserWork` MCP Tool (Mandatory)
Every time a repository scan/analysis completes, you MUST persist the results to PostgreSQL and Redis:

1. **Invoke `saveUserWork` (Tool ID: `save-user-work`)**:
   - For each extracted repository, call the `saveUserWork` MCP tool (or execute `node scripts/sync_repo_work.js --save <chunkFile>`):
     ```json
     {
       "userId": "<user_uuid>",
       "repositoryName": "<repository_name>",
       "localPath": "<repository_path>",
       "remoteUrl": "<remote_url>",
       "tier": "flagship",
       "primaryLanguage": "TypeScript",
       "primaryLanguages": ["TypeScript", "GraphQL"],
       "technologiesDetected": { ... },
       "totalCommits": 254,
       "linesAdded": 12850,
       "linesDeleted": 4200,
       "filesModified": 98,
       "totalActiveDays": 115,
       "firstCommitDate": "2025-11-28T00:00:00.000Z",
       "latestCommitDate": "2026-04-12T00:00:00.000Z",
       "timeline": { ... },
       "commitsSummary": { ... },
       "workDescription": { ... },
       "bulletPoints": [ ... ],
       "mostEffectiveWorkList": [ ... ]
     }
     ```
   - **Important**: Ensure both the top-level metric fields (`totalCommits`, `linesAdded`, `linesDeleted`, `filesModified`, `totalActiveDays`, `firstCommitDate`, `latestCommitDate`) and the nested JSON objects (`timeline`, `commitsSummary`, `workDescription`, `bulletPoints`, `mostEffectiveWorkList`) are passed so all PostgreSQL columns are fully populated!
2. **Local File Persistence**:
   - Save or update `.career/repos-extracted.json` in the active workspace as a local backup and offline reference.
3. **Present Summary**:
   - Present a concise summary of the newly saved and skipped repositories to the user.
