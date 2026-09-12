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

    return {
      name: path.basename(repoPath),
      path: repoPath,
      remote_url: remoteUrl || null,
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

  // Sort by author_commits descending, then total_commits descending
  results.sort((a, b) => b.author_commits - a.author_commits || b.total_commits - a.total_commits);

  return {
    searched_authors: authors,
    total_repos_found: results.length,
    repos_with_author_commits: results.filter(r => r.has_user_commits).length,
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
    console.log(`\n🔍 Found ${scanResult.total_repos_found} git repositories on your system:`);
    console.log(`Filtered across author aliases: [${scanResult.searched_authors.join(', ')}]`);
    console.log('='.repeat(85));
    for (const repo of scanResult.repositories) {
      const commitTag = repo.has_user_commits ? `[${repo.author_commits} commits by author]` : `[0 author commits (${repo.total_commits} total)]`;
      const techTag = repo.technologies.length ? `(${repo.technologies.join(', ')})` : '';
      console.log(`• ${repo.name.padEnd(28)} ${commitTag.padEnd(28)} ${techTag}`);
      console.log(`  Path: ${repo.path}`);
      if (repo.remote_url) console.log(`  Remote: ${repo.remote_url}`);
    }
    console.log('='.repeat(85));
  }
}

module.exports = { scan, inspectRepo };
