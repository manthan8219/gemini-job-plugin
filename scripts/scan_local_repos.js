const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Directories to skip during scanning
const IGNORED_DIR_NAMES = new Set([
  'node_modules',
  '.cache',
  '.npm',
  '.nvm',
  '.cargo',
  '.rustup',
  '.gradle',
  '.m2',
  'Library',
  'Applications',
  '.Trash',
  'Movies',
  'Music',
  'Pictures',
  '.gemini',
  '.vscode',
  '.cursor',
  '.claude',
  '.cline',
  '.docker',
  '.local',
  'Pods',
  'dist',
  'build',
  'target',
  '.venv',
  'venv',
  'env',
  '.next',
  '.nuxt',
  'vendor',
  'bower_components'
]);

function getSessionAuthors() {
  const authors = new Set();

  const sessionPaths = [
    path.join(process.cwd(), '.job-assistant-session.json'),
    path.join(process.env.USERPROFILE || process.env.HOME || '', '.job-assistant-session.json')
  ];

  for (const p of sessionPaths) {
    if (fs.existsSync(p)) {
      try {
        const data = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (data.email) authors.add(data.email.toLowerCase());
        if (data.first_name) authors.add(data.first_name.toLowerCase());
        if (Array.isArray(data.work_emails)) {
          data.work_emails.forEach(e => authors.add(e.toLowerCase()));
        } else if (typeof data.work_emails === 'string') {
          data.work_emails.split(',').map(s => s.trim()).forEach(e => authors.add(e.toLowerCase()));
        }
      } catch (e) {}
    }
  }

  try {
    const gitUser = execSync('git config --global user.name', { encoding: 'utf8' }).trim();
    if (gitUser) authors.add(gitUser.toLowerCase());
  } catch (e) {}

  try {
    const gitEmail = execSync('git config --global user.email', { encoding: 'utf8' }).trim();
    if (gitEmail) authors.add(gitEmail.toLowerCase());
  } catch (e) {}

  return Array.from(authors);
}

function detectTechStack(repoPath) {
  const techs = [];
  try {
    if (fs.existsSync(path.join(repoPath, 'pom.xml'))) techs.push('Java (Maven)');
    if (fs.existsSync(path.join(repoPath, 'build.gradle')) || fs.existsSync(path.join(repoPath, 'build.gradle.kts'))) techs.push('Java/Kotlin (Gradle)');
    if (fs.existsSync(path.join(repoPath, 'package.json'))) techs.push('Node.js / TypeScript');
    if (fs.existsSync(path.join(repoPath, 'go.mod'))) techs.push('Go');
    if (fs.existsSync(path.join(repoPath, 'Cargo.toml'))) techs.push('Rust');
    if (fs.existsSync(path.join(repoPath, 'requirements.txt')) || fs.existsSync(path.join(repoPath, 'pyproject.toml')) || fs.existsSync(path.join(repoPath, 'Pipfile'))) techs.push('Python');
    if (fs.existsSync(path.join(repoPath, 'Dockerfile'))) techs.push('Docker');
    if (fs.existsSync(path.join(repoPath, 'docker-compose.yml')) || fs.existsSync(path.join(repoPath, 'docker-compose.yaml'))) techs.push('Docker Compose');
    if (fs.existsSync(path.join(repoPath, 'k8s')) || fs.existsSync(path.join(repoPath, 'helm'))) techs.push('Kubernetes');
  } catch (e) {}
  return techs;
}

function inspectRepo(repoPath, searchTokens = []) {
  try {
    const remoteUrl = execSync('git config --get remote.origin.url', { cwd: repoPath, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    let totalCommits = 0;
    try {
      totalCommits = parseInt(execSync('git rev-list --count HEAD', { cwd: repoPath, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim(), 10) || 0;
    } catch (e) {}

    let authorCommits = 0;
    const matchedAuthors = new Set();

    // Prepare search token list
    const tokens = searchTokens.map(t => t.toLowerCase()).filter(t => t.length >= 3);

    try {
      const topAuthors = execSync('git log -n 80 --pretty=format:"%an <%ae>"', { cwd: repoPath, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] })
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);
      
      const uniqueAuthors = [...new Set(topAuthors)];
      for (const ua of uniqueAuthors) {
        const lowerUa = ua.toLowerCase();
        const isMatch = tokens.some(tok => lowerUa.includes(tok));
        if (isMatch) {
          const authorName = ua.split(' <')[0];
          try {
            const count = parseInt(execSync(`git rev-list --count --author="${authorName}" HEAD`, { cwd: repoPath, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim(), 10) || 0;
            if (count > 0) {
              authorCommits += count;
              matchedAuthors.add(ua);
            }
          } catch (e) {}
        }
      }
    } catch (e) {}

    let lastCommitDate = null;
    try {
      lastCommitDate = execSync('git log -1 --format="%ad" --date=short', { cwd: repoPath, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    } catch (e) {}

    let tier = 'Unattributed';
    let recommendedModel = null;
    let strategy = 'Omit or manual include';

    if (authorCommits >= 50) {
      tier = 'Tier 1 (Flagship / Core)';
      recommendedModel = 'pro';
      strategy = 'Deep forensic code & diff inspection';
    } else if (authorCommits >= 10) {
      tier = 'Tier 2 (Contributing / Tool)';
      recommendedModel = 'flash';
      strategy = 'Targeted feature and architecture extraction';
    } else if (authorCommits > 0) {
      tier = 'Tier 3 (Spike / POC)';
      recommendedModel = 'fast_catalog';
      strategy = 'Tech stack tagging & skill validation';
    }

    return {
      name: path.basename(repoPath),
      path: repoPath,
      remote_url: remoteUrl || null,
      tier: tier,
      recommended_model: recommendedModel,
      extraction_strategy: strategy,
      author_commits: authorCommits,
      total_commits: totalCommits,
      last_commit_date: lastCommitDate,
      technologies: detectTechStack(repoPath),
      has_user_commits: authorCommits > 0,
      matched_author: Array.from(matchedAuthors).join(', ') || null
    };
  } catch (e) {
    return null;
  }
}

function findGitRepos(startDir, maxDepth = 3, currentDepth = 0) {
  let repos = [];
  if (currentDepth > maxDepth) return repos;

  let entries = [];
  try {
    entries = fs.readdirSync(startDir, { withFileTypes: true });
  } catch (e) {
    return repos;
  }

  // Any directory that contains a .git folder or file IS a git repository!
  const hasGit = entries.some(e => e.name === '.git');
  if (hasGit && currentDepth > 0) {
    repos.push(startDir);
    // Prune: do not scan inside an existing git repo
    return repos;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.') && entry.name !== '.git') {
      continue;
    }
    if (IGNORED_DIR_NAMES.has(entry.name)) continue;

    const subPath = path.join(startDir, entry.name);
    repos = repos.concat(findGitRepos(subPath, maxDepth, currentDepth + 1));
  }

  return repos;
}

function scan(options = {}) {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const searchRoots = options.searchRoots || [
    path.join(home, 'Desktop'),
    path.join(home, 'Documents'),
    path.join(home, 'Projects'),
    path.join(home, 'projects'),
    path.join(home, 'code'),
    path.join(home, 'workspace'),
    path.join(home, 'Workspace'),
    path.join(home, 'Development'),
    path.join(home, 'Developer'),
    home
  ];

  let authors = [];
  if (options.author) {
    authors = Array.isArray(options.author) ? options.author : options.author.split(',').map(s => s.trim());
  } else {
    authors = getSessionAuthors();
  }

  const repoPaths = new Set();

  for (const root of searchRoots) {
    if (fs.existsSync(root)) {
      // Home directory depth 1 to avoid scanning everything; subfolders depth 3
      const depth = (root === home) ? 1 : 3;
      const found = findGitRepos(root, depth);
      for (const p of found) {
        repoPaths.add(p);
      }
    }
  }

  const results = [];
  for (const rPath of repoPaths) {
    const inspected = inspectRepo(rPath, authors);
    if (inspected) {
      results.push(inspected);
    }
  }

  const tier1 = results.filter(r => r.tier.startsWith('Tier 1'));
  const tier2 = results.filter(r => r.tier.startsWith('Tier 2'));
  const tier3 = results.filter(r => r.tier.startsWith('Tier 3'));
  const unattributed = results.filter(r => r.tier === 'Unattributed');

  return {
    searched_authors: authors,
    total_repos_found: results.length,
    repos_with_author_commits: results.filter(r => r.has_user_commits).length,
    tier_summary: {
      tier1_flagship_count: tier1.length,
      tier2_contributing_count: tier2.length,
      tier3_spikes_count: tier3.length,
      unattributed_count: unattributed.length
    },
    repositories: results
  };
}

// CLI Execution
if (require.main === module) {
  const args = process.argv.slice(2);
  let authors = [];
  let jsonOutput = false;

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--author' || args[i] === '--emails') && args[i + 1]) {
      authors = authors.concat(args[i + 1].split(',').map(s => s.trim()));
      i++;
    } else if (args[i] === '--json') {
      jsonOutput = true;
    } else if (!args[i].startsWith('--')) {
      authors.push(args[i]);
    }
  }

  const scanResult = scan({ author: authors.length > 0 ? authors : null });

  if (jsonOutput || !process.stdout.isTTY) {
    console.log(JSON.stringify(scanResult, null, 2));
  } else {
    console.log(`\n🔍 Found ${scanResult.total_repos_found} git repositories (Author filter: ${scanResult.searched_authors.join(', ')}):`);
    console.log(`📊 Tier Summary: ${scanResult.tier_summary.tier1_flagship_count} Flagship (Tier 1) | ${scanResult.tier_summary.tier2_contributing_count} Mid-tier (Tier 2) | ${scanResult.tier_summary.tier3_spikes_count} Spikes (Tier 3)`);
    console.log('='.repeat(95));

    const printGroup = (title, items) => {
      if (!items.length) return;
      console.log(`\n${title}:`);
      console.log('-'.repeat(95));
      for (const repo of items) {
        const commitTag = `[${repo.author_commits} commits]`;
        const techTag = repo.technologies.length ? `(${repo.technologies.join(', ')})` : '';
        console.log(`• ${repo.name.padEnd(26)} ${commitTag.padEnd(16)} Model: ${repo.recommended_model.padEnd(14)} ${techTag}`);
        console.log(`  Path: ${repo.path}`);
      }
    };

    const t1 = scanResult.repositories.filter(r => r.tier.startsWith('Tier 1'));
    const t2 = scanResult.repositories.filter(r => r.tier.startsWith('Tier 2'));
    const t3 = scanResult.repositories.filter(r => r.tier.startsWith('Tier 3'));

    printGroup('🌟 TIER 1: FLAGSHIP / CORE (Deep Forensic Inspection -> Pro Model)', t1);
    printGroup('🛠️  TIER 2: CONTRIBUTING / TOOLS (Targeted Extraction -> Flash Model)', t2);
    printGroup('🧪 TIER 3: SPIKES / EXPERIMENTS (Quick Skill Tagging -> Fast Catalog)', t3);
    console.log('='.repeat(95));
  }
}

module.exports = { scan, inspectRepo };
