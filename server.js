const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const GITHUB_API = 'https://api.github.com';

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

function parseRepository(input) {
  const value = String(input || '').trim().replace(/\.git$/i, '').replace(/\/$/, '');
  const match = value.match(/^(?:https?:\/\/github\.com\/)?([\w.-]+)\/([\w.-]+)$/i);
  return match ? `${match[1]}/${match[2]}` : null;
}

async function github(pathname, allowNotFound = false) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'TrustIQ',
    'X-GitHub-Api-Version': '2022-11-28'
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const response = await fetch(`${GITHUB_API}${pathname}`, { headers });
  if (allowNotFound && response.status === 404) return null;
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(body.message || `GitHub returned ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return { data: await response.json(), headers: response.headers };
}

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scaled(value, ceiling) {
  return Math.min(100, Math.log10(value + 1) / Math.log10(ceiling + 1) * 100);
}

function contributorCount(headers, data) {
  const link = headers.get('link') || '';
  const last = link.match(/[?&]page=(\d+)[^>]*>; rel="last"/);
  return last ? Number(last[1]) : data.length;
}

function formatCount(value) {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function grade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'A-';
  if (score >= 70) return 'B+';
  if (score >= 60) return 'C';
  return 'D';
}

app.post('/api/analyze', async (req, res) => {
  const fullName = parseRepository(req.body.url);
  if (!fullName) return res.status(400).json({ error: 'Enter a GitHub repository as owner/repository.' });

  try {
    const encoded = fullName.split('/').map(encodeURIComponent).join('/');
    const [repoResult, contributorsResult, communityResult, contentsResult] = await Promise.all([
      github(`/repos/${encoded}`),
      github(`/repos/${encoded}/contributors?per_page=1&anon=1`),
      github(`/repos/${encoded}/community/profile`, true),
      github(`/repos/${encoded}/contents`, true)
    ]);

    const repo = repoResult.data;
    const contributors = contributorCount(contributorsResult.headers, contributorsResult.data);
    const community = communityResult?.data || {};
    const rootFiles = Array.isArray(contentsResult?.data) ? contentsResult.data.map(item => item.name.toLowerCase()) : [];
    const lockfiles = ['package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'pnpm-lock.yaml',
      'poetry.lock', 'pipfile.lock', 'cargo.lock', 'go.sum', 'composer.lock', 'gemfile.lock'];
    const hasLockfile = rootFiles.some(name => lockfiles.includes(name));
    const hasSecurityPolicy = Boolean(community.files?.security);
    const hasLicense = Boolean(repo.license);
    const daysSincePush = Math.max(0, (Date.now() - Date.parse(repo.pushed_at)) / 86400000);
    const inactivity = Math.min(100, daysSincePush / 365 * 100);
    const issuePressure = repo.open_issues_count / Math.max(1, repo.stargazers_count) * 1000;

    const maintenance = clamp(100 - inactivity * 0.7 - Math.min(30, issuePressure) - (repo.archived ? 50 : 0));
    const communityScore = clamp(
      scaled(repo.stargazers_count, 100000) * 0.45 +
      scaled(repo.forks_count, 20000) * 0.25 +
      scaled(contributors, 1000) * 0.3
    );
    const security = clamp(45 + (hasSecurityPolicy ? 25 : 0) + (hasLicense ? 10 : 0) +
      (repo.security_and_analysis?.secret_scanning?.status === 'enabled' ? 10 : 0) +
      (repo.security_and_analysis?.dependabot_security_updates?.status === 'enabled' ? 10 : 0) -
      (repo.archived ? 25 : 0));
    const supply = clamp(35 + (hasLockfile ? 35 : 0) + (hasSecurityPolicy ? 15 : 0) +
      (repo.security_and_analysis?.dependency_graph?.status === 'enabled' ? 15 : 0));
    const trust = clamp(security * 0.3 + maintenance * 0.3 + communityScore * 0.25 + supply * 0.15);
    const verdict = trust >= 80 ? 'APPROVE' : trust >= 60 ? 'REVIEW' : 'CAUTION';

    const signals = [
      { n: 'Lockfile', v: hasLockfile ? 0 : 1, i: hasLockfile ? 'Dependency lockfile found at repository root' : 'No supported lockfile found at repository root' },
      { n: 'Security policy', v: hasSecurityPolicy ? 0 : 1, i: hasSecurityPolicy ? 'GitHub reports a security policy' : 'GitHub reports no security policy' },
      { n: 'License', v: hasLicense ? 0 : 1, i: hasLicense ? repo.license.spdx_id : 'No detected license' },
      { n: 'Activity', v: daysSincePush <= 180 ? 0 : 1, i: `Last push ${Math.round(daysSincePush)} days ago` }
    ];

    res.json({
      name: repo.full_name,
      stars: formatCount(repo.stargazers_count),
      forks: formatCount(repo.forks_count),
      contrib: `${formatCount(contributors)} contributors`,
      grade: grade(trust), trust,
      scores: { security, maintenance, community: communityScore, supply },
      scoreDisplay: {
        security: hasSecurityPolicy ? 'Policy ✓' : 'No policy',
        maintenance: `${Math.round(daysSincePush)}d`,
        community: formatCount(contributors),
        supply: hasLockfile ? 'Lockfile ✓' : 'No lockfile'
      },
      dna: {
        Security: security,
        Activity: maintenance,
        Popularity: clamp(scaled(repo.stargazers_count, 100000)),
        Community: communityScore,
        Maturity: clamp(Math.min(100, (Date.now() - Date.parse(repo.created_at)) / 86400000 / 1095 * 100)),
        Governance: clamp((hasLicense ? 35 : 0) + (hasSecurityPolicy ? 35 : 0) + (community.health_percentage || 0) * 0.3)
      },
      market: trust >= 80 ? 'LOWER RISK' : trust >= 60 ? 'REVIEW' : 'HIGHER RISK',
      regret: {
        prob: 100 - trust, now: trust,
        m3: security, m6: maintenance, m12: communityScore,
        text: 'This is a current metadata heuristic, not a future prediction. Scores use public GitHub activity, community, governance, and repository signals.'
      },
      decision: {
        verdict,
        reason: `Heuristic, not a security scan. Last pushed ${Math.round(daysSincePush)} days ago; ${repo.open_issues_count} open issues and pull requests; ${contributors} contributors.`
      },
      deps: { root: repo.name, rv: signals.filter(signal => signal.v > 0).length, ch: signals },
      source: repo.html_url,
      analyzedAt: new Date().toISOString()
    });
  } catch (error) {
    const status = error.status === 404 ? 404 : error.status === 403 ? 429 : 502;
    res.status(status).json({ error: error.status === 403 ? 'GitHub API rate limit reached. Try again later or configure GITHUB_TOKEN.' : error.message });
  }
});

app.listen(PORT, () => {
  console.log(`TrustIQ is running at http://localhost:${PORT}`);
});
