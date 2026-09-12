---
name: repo-portfolio-builder
description: Collects GitHub username and local repositories, spawns concurrent repo-work-extractor subagents to perform deep code and git forensics, and aggregates rich JSON chunks of all contributions.
---

# Repository Portfolio & Deep Work Extraction Skill

Use this skill when the user wants to audit their local git repositories, extract all engineering work they've done across codebases, and produce rich, structured JSON chunks of their contributions.

---

## Workflow Overview

### Step 1: Gather Inputs & Fast Auto-Discovery
1. Ask the user for their **GitHub username** (and any alternate author names or commit emails).
2. Offer fast auto-discovery:
   - Run `node scripts/scan_local_repos.js` (or invoke `local-repo-scanner`) to automatically inventory local git repositories across standard developer folders (`~`, `~/code`, `~/projects`, `~/workspace`, `~/Documents`).
   - The scanner filters for repositories containing verified commits authored by the user.
3. Present the discovered repositories to the user:
   - Allow the user to select which repositories to inspect (or provide custom repo paths).
4. Verify each selected path exists and contains a `.git` directory.

---

### Step 2: Spawn Concurrent Subagents
For every valid repository path, spawn a dedicated `repo-work-extractor` subagent concurrently in a single `invoke_subagent` call:

```json
{
  "Subagents": [
    {
      "TypeName": "repo-work-extractor",
      "Role": "Repo Work Extractor - <RepoName>",
      "Prompt": "Perform an exhaustive, deep code and git history extraction for author '<author_identity>' in repository '<repository_path>'. Do not rely on commit messages alone; read the code, diffs, database schemas, and manifests. Return strictly valid JSON as instructed.",
      "Model": "pro"
    }
  ]
}
```

---

### Step 3: Collect & Aggregate JSON Chunks
1. Wait for all subagents to finish their forensic analysis.
2. Parse the JSON response returned by each subagent.
3. Validate that each repo chunk contains:
   - `repository_name`
   - `repository_path`
   - `remote_url`
   - `primary_languages`
   - `technologies_detected`
   - `timeline` (duration, dates, active days)
   - `commits_summary` (total commits, lines added/deleted, key modules, top files)
   - `work_description` (system_overview, role_and_ownership, technical_challenges_solved)
   - `bullet_points` (Google XYZ formula)
   - `most_effective_work_list` (top standout feats with descriptions and impact)

---

### Step 4: Save & Present
1. Aggregate all repository JSON chunks into an array under a master object:
   ```json
   {
     "author": "<author_identity>",
     "extracted_at": "<ISO timestamp>",
     "total_repositories": 3,
     "repositories": [ ... ]
   }
   ```
2. Save the master JSON file to `.career/repos-extracted.json` in the active workspace.
3. Present the structured JSON results to the user.
