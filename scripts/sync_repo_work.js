const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

function getSession() {
  const sessionPaths = [
    path.join(process.cwd(), '.job-assistant-session.json'),
    path.join(process.env.USERPROFILE || process.env.HOME || '', '.job-assistant-session.json')
  ];
  for (const p of sessionPaths) {
    if (fs.existsSync(p)) {
      try {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
      } catch (e) {}
    }
  }
  return null;
}

function callMcp(toolName, args) {
  return new Promise((resolve, reject) => {
    const session = getSession();
    const token = session ? session.token : null;

    const sseReq = https.request('https://job-tools.onrender.com/sse', {
      headers: { 'Accept': 'text/event-stream' }
    }, (res) => {
      let endpoint = '';
      let buffer = '';

      res.on('data', chunk => {
        buffer += chunk.toString();
        if (!endpoint) {
          const match = buffer.match(/data:\s*(\/message[^\s\r\n]+)/);
          if (match) {
            endpoint = match[1];
            buffer = '';
            const postData = JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'tools/call',
              params: {
                name: toolName,
                arguments: args
              }
            });
            const headers = {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData)
            };
            if (token) {
              headers['Authorization'] = 'Bearer ' + token;
            }

            const pReq = https.request('https://job-tools.onrender.com' + endpoint, {
              method: 'POST',
              headers: headers
            });
            pReq.on('error', (err) => reject(err));
            pReq.end(postData);
          }
        }

        const lines = buffer.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const json = JSON.parse(line.slice(6));
              if (json.result || json.error) {
                sseReq.destroy();
                resolve(json);
                return;
              }
            } catch (e) {}
          }
        }
      });
    });

    sseReq.on('error', (err) => reject(err));
    sseReq.end();
  });
}

async function checkRepository(repoName, repoPath, author) {
  const session = getSession();
  const userId = session ? session.userId : undefined;

  let isScraped = false;
  let lastScrapedAt = null;
  let latestCommitDate = null;

  // 1. Try checkRepositoryScraped first
  try {
    const scrapedRes = await callMcp('checkRepositoryScraped', {
      repositoryId: repoName,
      userId: userId
    });
    if (scrapedRes && scrapedRes.result && !scrapedRes.result.isError) {
      const parsed = JSON.parse(scrapedRes.result.content[0].text);
      if (parsed.success && parsed.isScraped) {
        isScraped = true;
        lastScrapedAt = parsed.lastScrapedAt || parsed.updatedAt || null;
      }
    }
  } catch (e) {}

  // 2. Fallback to getUserWork
  if (!isScraped) {
    try {
      const workRes = await callMcp('getUserWork', {
        idOrName: repoName,
        userId: userId
      });
      if (workRes && workRes.result && !workRes.result.isError) {
        const parsed = JSON.parse(workRes.result.content[0].text);
        if (parsed.success && parsed.work) {
          isScraped = true;
          lastScrapedAt = parsed.work.updatedAt || parsed.work.createdAt || null;
          latestCommitDate = parsed.work.timeline ? parsed.work.timeline.latest_commit_date : (parsed.work.latestCommitDate || null);
        }
      }
    } catch (e) {}
  }

  if (!isScraped) {
    return {
      repository: repoName,
      isScraped: false,
      action: 'analyze',
      message: `Repository '${repoName}' has not been analyzed yet.`
    };
  }

  // Determine cutoff date for new commits
  const referenceDate = latestCommitDate || (lastScrapedAt ? lastScrapedAt.split('T')[0] : null);

  let newCommitsCount = 0;
  if (repoPath && fs.existsSync(repoPath) && fs.existsSync(path.join(repoPath, '.git')) && referenceDate) {
    try {
      const authorFlag = author ? `--author="${author}"` : '';
      const cmd = `git -C "${repoPath}" log --after="${referenceDate}" ${authorFlag} --oneline`;
      const stdout = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      if (stdout) {
        const lines = stdout.split('\n').filter(Boolean);
        newCommitsCount = lines.length;
      }
    } catch (e) {}
  }

  if (newCommitsCount > 0) {
    return {
      repository: repoName,
      isScraped: true,
      lastScrapedAt: lastScrapedAt || referenceDate,
      newCommitsCount: newCommitsCount,
      action: 'reanalyze',
      message: `Repository '${repoName}' was previously analyzed, but has ${newCommitsCount} new commit(s) since ${referenceDate}. Re-analysis recommended.`
    };
  }

  return {
    repository: repoName,
    isScraped: true,
    lastScrapedAt: lastScrapedAt || referenceDate,
    newCommitsCount: 0,
    action: 'skip',
    message: `Repository '${repoName}' has already been analyzed (last scraped: ${lastScrapedAt || referenceDate}). No new commits detected. Skipping re-analysis.`
  };
}

async function saveRepositoryWork(chunkData) {
  const session = getSession();
  const payload = {
    userId: session ? session.userId : undefined,
    repositoryName: chunkData.repository_name || chunkData.repositoryName,
    localPath: chunkData.repository_path || chunkData.localPath,
    remoteUrl: chunkData.remote_url || chunkData.remoteUrl,
    tier: chunkData.tier || 'contributing',
    primaryLanguage: chunkData.primary_language || (chunkData.primary_languages && chunkData.primary_languages[0]),
    primaryLanguages: chunkData.primary_languages || chunkData.primaryLanguages || [],
    technologiesDetected: chunkData.technologies_detected || chunkData.technologiesDetected || {},
    timeline: chunkData.timeline || {},
    commitsSummary: chunkData.commits_summary || chunkData.commitsSummary || {},
    workDescription: chunkData.work_description || chunkData.workDescription || {},
    bulletPoints: chunkData.bullet_points || chunkData.bulletPoints || [],
    mostEffectiveWorkList: chunkData.most_effective_work_list || chunkData.mostEffectiveWorkList || []
  };

  const res = await callMcp('saveUserWork', payload);
  if (res && res.result && !res.result.isError) {
    const parsed = JSON.parse(res.result.content[0].text);
    return parsed;
  }
  throw new Error((res && res.error) ? JSON.stringify(res.error) : (res && res.result ? res.result.content[0].text : 'Failed to saveUserWork'));
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  (async () => {
    try {
      if (command === '--check' && args[1]) {
        const repoName = args[1];
        let repoPath = null;
        let author = null;
        for (let i = 2; i < args.length; i++) {
          if (args[i] === '--path' && args[i + 1]) repoPath = args[i + 1];
          if (args[i] === '--author' && args[i + 1]) author = args[i + 1];
        }
        const result = await checkRepository(repoName, repoPath, author);
        console.log(JSON.stringify(result, null, 2));
      } else if (command === '--save' && args[1]) {
        const filePath = path.resolve(args[1]);
        if (!fs.existsSync(filePath)) {
          console.error(`File not found: ${filePath}`);
          process.exit(1);
        }
        const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        // Could be a single chunk or full repos-extracted file
        if (Array.isArray(raw.repositories)) {
          console.log(`Saving ${raw.repositories.length} repositories to PostgreSQL and Redis...`);
          for (const r of raw.repositories) {
            const saved = await saveRepositoryWork(r);
            console.log(`✓ Saved '${r.repository_name}': ${saved.message || 'Success'}`);
          }
        } else {
          const saved = await saveRepositoryWork(raw);
          console.log(`✓ Saved '${raw.repository_name || raw.repositoryName}': ${saved.message || 'Success'}`);
        }
      } else {
        console.log('Usage:');
        console.log('  node scripts/sync_repo_work.js --check <repoName> [--path <repoPath>] [--author <author>]');
        console.log('  node scripts/sync_repo_work.js --save <chunkFile.json>');
      }
    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  })();
}

module.exports = { checkRepository, saveRepositoryWork };
