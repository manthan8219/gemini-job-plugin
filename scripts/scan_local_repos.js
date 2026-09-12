const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Directories to skip during scanning
const IGNORED_DIR_NAMES = new Set([
  'node_modules',
  '.git',
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
  '.nuxt'
]);

function getSessionAuthor() {
  const sessionPaths = [
    path.join(process.cwd(), '.job-assistant-session.json'),
    path.join(process.env.USERPROFILE || process.env.HOME || '', '.job-assistant-session.json')
  ];

  for (const p of sessionPaths) {
    if (fs.existsSync(p)) {
      try {
        const data = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (data.email || data.first_name) {
          return data.email || data.first_name;
        }
      } catch (e) {
        // ignore
      }
    }
  }

  try {
    const gitUser = execSync('git config --global user.name', { encoding: 'utf8' }).trim();
    if (gitUser) return gitUser;
  } catch (e) {}

  return null;
}

function detectTechStack(repoPath) {
  const techs = [];
  try {
    if (fs.existsSync(path.join(repoPath, 'pom.xml'))) techs.push('Java (Maven)');
    if (fs.existsSync(path.join(repoPath, 'build.gradle')) || fs.existsSync(path.join(repoPath, 'build.gradle.kts'))) techs.push('Java/Kotlin (Gradle)');
    if (fs.existsSync(path.join(repoPath, 'package.json'))) techs.push('Node.js / JavaScript / TypeScript');
    if (fs.existsSync(path.join(repoPath, 'go.mod'))) techs.push('Go');
    if (fs.existsSync(path.join(repoPath, 'Cargo.toml'))) techs.push('Rust');
    if (fs.existsSync(path.join(repoPath, 'requirements.txt')) || fs.existsSync(path.join(repoPath, 'pyproject.toml')) || fs.existsSync(path.join(repoPath, 'Pipfile'))) techs.push('Python');
    if (fs.existsSync(path.join(repoPath, 'Dockerfile'))) techs.push('Docker');
    if (fs.existsSync(path.join(repoPath, 'docker-compose.yml')) || fs.existsSync(path.join(repoPath, 'docker-compose.yaml'))) techs.push('Docker Compose');
    if (fs.existsSync(path.join(repoPath, 'k8s')) || fs.existsSync(path.join(repoPath, 'helm'))) techs.push('Kubernetes');
  } catch (e) {}
  return techs;
}

function inspectRepo(repoPath, author) {
  try {
    const remoteUrl = execSync('git config --get remote.origin.url', { cwd: repoPath, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    let totalCommits = 0;
    try {
      totalCommits = parseInt(execSync('git rev-list --count HEAD', { cwd: repoPath, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim(), 10) || 0;
    } catch (e) {}

    let authorCommits = 0;
    let authorMatch = null;
    if (author) {
      try {
        authorCommits = parseInt(execSync(`git rev-list --count --author="${author}" HEAD`, { cwd: repoPath, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim(), 10) || 0;
        if (authorCommits > 0) authorMatch = author;
      } catch (e) {}
    }

    // Smart author matching
    const searchTokens = [];
    if (author) {
      searchTokens.push(author.toLowerCase());
      if (author.includes('@')) {
        searchTokens.push(author.split('@')[0].toLowerCase());
      }
    }
    // Also add first name if available in session
    const sessionPaths = [
      path.join(process.cwd(), '.job-assistant-session.json'),
      path.join(process.env.USERPROFILE || process.env.HOME || '', '.job-assistant-session.json')
    ];
    for (const p of sessionPaths) {
      if (fs.existsSync(p)) {
        try {
          const d = JSON.parse(fs.readFileSync(p, 'utf8'));
          if (d.first_name) searchTokens.push(d.first_name.toLowerCase());
        } catch (e) {}
      }
    }

    try {
      const topAuthors = execSync('git log -n 50 --pretty=format:"%an <%ae>"', { cwd: repoPath, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] })
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);
      
      const uniqueAuthors = [...new Set(topAuthors)];
      for (const ua of uniqueAuthors) {
        const lowerUa = ua.toLowerCase();
        const matches = searchTokens.some(tok => tok.length > 2 && lowerUa.includes(tok));
        if (matches) {
          const authorName = ua.split(' <')[0];
          try {
            const count = parseInt(execSync(`git rev-list --count --author="${authorName}" HEAD`, { cwd: repoPath, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim(), 10) || 0;
            if (count > 0) {
              authorCommits += count;
              authorMatch = authorMatch ? `${authorMatch}, ${ua}` : ua;
            }
          } catch (e) {}
        }
      }
    } catch (e) {}

    let lastCommitDate = null;
    try {
      lastCommitDate = execSync('git log -1 --format="%ad" --date=short', { cwd: repoPath, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    } catch (e) {}

    return {
      name: path.basename(repoPath),
      path: repoPath,
      remote_url: remoteUrl || null,
      author_commits: authorCommits,
      total_commits: totalCommits,
      last_commit_date: lastCommitDate,
      technologies: detectTechStack(repoPath),
      has_user_commits: authorCommits > 0,
      matched_author: authorMatch
    };
  } catch (e) {
    return null;
  }
}

function findGitRepos(startDir, maxDepth = 2, currentDepth = 0) {
  let repos = [];
  if (currentDepth > maxDepth) return repos;

  let entries = [];
  try {
    entries = fs.readdirSync(startDir, { withFileTypes: true });
  } catch (e) {
    return repos;
  }

  // Check if current directory itself has .git
  const hasGit = entries.some(e => e.isDirectory() && e.name === '.git');
  if (hasGit && currentDepth > 0) {
    repos.push(startDir);
    // Don't recurse deeper into a git repository
    return repos;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.') && entry.name !== '.git') {
      // Skip hidden folders except search roots
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
    home,
    path.join(home, 'code'),
    path.join(home, 'projects'),
    path.join(home, 'Projects'),
    path.join(home, 'workspace'),
    path.join(home, 'Workspace'),
    path.join(home, 'Development'),
    path.join(home, 'Documents')
  ];

  const author = options.author || getSessionAuthor();
  const repoPaths = new Set();

  for (const root of searchRoots) {
    if (fs.existsSync(root)) {
      const maxDepth = (root === home) ? 1 : 2; // Keep home directory scan shallow (depth 1) for speed
      const found = findGitRepos(root, maxDepth);
      for (const p of found) {
        repoPaths.add(p);
      }
    }
  }

  const results = [];
  for (const rPath of repoPaths) {
    const inspected = inspectRepo(rPath, author);
    if (inspected) {
      results.push(inspected);
    }
  }

  // Sort by author_commits descending, then total_commits descending
  results.sort((a, b) => b.author_commits - a.author_commits || b.total_commits - a.total_commits);

  return {
    searched_author: author,
    total_repos_found: results.length,
    repos_with_author_commits: results.filter(r => r.has_user_commits).length,
    repositories: results
  };
}

// CLI Execution
if (require.main === module) {
  const args = process.argv.slice(2);
  let authorArg = null;
  let jsonOutput = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--author' && args[i + 1]) {
      authorArg = args[i + 1];
      i++;
    } else if (args[i] === '--json') {
      jsonOutput = true;
    } else if (!args[i].startsWith('--') && !authorArg) {
      authorArg = args[i];
    }
  }

  const scanResult = scan({ author: authorArg });

  if (jsonOutput || !process.stdout.isTTY) {
    console.log(JSON.stringify(scanResult, null, 2));
  } else {
    console.log(`\n🔍 Found ${scanResult.total_repos_found} git repositories (Author filter: "${scanResult.searched_author || 'None'}"):`);
    console.log('='.repeat(75));
    for (const repo of scanResult.repositories) {
      const commitTag = repo.has_user_commits ? `[${repo.author_commits} commits by author]` : `[0 user commits (${repo.total_commits} total)]`;
      const techTag = repo.technologies.length ? `(${repo.technologies.join(', ')})` : '';
      console.log(`• ${repo.name.padEnd(25)} ${commitTag.padEnd(25)} ${techTag}`);
      console.log(`  Path: ${repo.path}`);
      if (repo.remote_url) console.log(`  Remote: ${repo.remote_url}`);
    }
    console.log('='.repeat(75));
  }
}

module.exports = { scan, inspectRepo };
