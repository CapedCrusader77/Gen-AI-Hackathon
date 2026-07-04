require('dotenv').config();
const express = require('express');
const path = require('path');
const { generateAIReport, generateAIChatResponse } = require('./services/geminiService');

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
    // Transparent metadata-risk checklist (maximum 100 points).
    const activityRisk = Math.min(30, Math.round(daysSincePush / 12));
    const policyRisk = hasSecurityPolicy ? 0 : 20;
    const hygieneRisk = (hasLockfile ? 0 : 15) + (hasLicense ? 0 : 15) + (repo.archived ? 20 : 0);
    const risk = activityRisk + policyRisk + hygieneRisk;
    const trust = 100 - risk;
    const verdict = trust >= 80 ? 'APPROVE' : trust >= 60 ? 'REVIEW' : 'CAUTION';

    const signals = [
      { n: 'Lockfile', v: hasLockfile ? 0 : 1, i: hasLockfile ? 'Dependency lockfile found at repository root' : 'No supported lockfile found at repository root' },
      { n: 'Security policy', v: hasSecurityPolicy ? 0 : 1, i: hasSecurityPolicy ? 'GitHub reports a security policy' : 'GitHub reports no security policy' },
      { n: 'License', v: hasLicense ? 0 : 1, i: hasLicense ? repo.license.spdx_id : 'No detected license' },
      { n: 'Activity', v: daysSincePush <= 180 ? 0 : 1, i: `Last push ${Math.round(daysSincePush)} days ago` }
    ];

    const payload = {
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
        prob: risk, now: risk,
        m3: activityRisk, m6: policyRisk, m12: hygieneRisk,
        text: `Risk = inactivity ${activityRisk}/30 + missing security policy ${policyRisk}/20 + repository hygiene ${hygieneRisk}/50. Hygiene checks lockfile, license, and archived status.`
      },
      decision: {
        verdict,
        reason: `Heuristic, not a security scan. Last pushed ${Math.round(daysSincePush)} days ago; ${repo.open_issues_count} open issues and pull requests; ${contributors} contributors.`
      },
      deps: { root: repo.name, rv: signals.filter(signal => signal.v > 0).length, ch: signals },
      source: repo.html_url,
      analyzedAt: new Date().toISOString()
    };

    // Integrate Gemini AI Trust Report
    if (process.env.GEMINI_API_KEY) {
      try {
        const rawReport = await generateAIReport({
          name: payload.name,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          contributors,
          scores: payload.scores,
          risk: payload.regret.prob,
          trust: payload.trust
        });
        const parsedReport = parseGeminiJSON(rawReport);
        if (parsedReport) {
          payload.aiReport = parsedReport;
        } else {
          payload.aiReport = MOCK_AI_REPORT;
        }
      } catch (err) {
        console.error("Error generating AI report:", err);
        payload.aiReport = MOCK_AI_REPORT;
      }
    } else {
      payload.aiReport = MOCK_AI_REPORT;
    }

    res.json(payload);
  } catch (error) {
    const status = error.status === 404 ? 404 : error.status === 403 ? 429 : 502;
    res.status(status).json({ error: error.status === 403 ? 'GitHub API rate limit reached. Try again later or configure GITHUB_TOKEN.' : error.message });
  }
});

// Chat endpoint powered by Gemini AI
app.post('/api/chat', async (req, res) => {
  const { repoData, question } = req.body;
  if (!question) {
    return res.status(400).json({ error: "Question is required." });
  }

  // Fallback responses if GEMINI_API_KEY is not configured
  if (!process.env.GEMINI_API_KEY) {
    const name = repoData?.name || "the repository";
    const trust = repoData?.trust || 50;
    const grade = repoData?.grade || "C";
    const secVal = repoData?.scores?.security || 50;
    const risk = repoData?.regret?.prob || 50;
    const lc = question.toLowerCase();

    let reply;
    if (lc.includes("deploy") || lc.includes("production") || lc.includes("adopt")) {
      reply = trust >= 80
        ? `[Mock Answer] ${name} has a strong trust score of ${trust}%. It generally appears safe for production integration, but verify its code and dependency updates first.`
        : trust >= 60
        ? `[Mock Answer] ${name} has a moderate score of ${trust}%. Consider a sandbox deployment or technical review first. Do not deploy directly to production.`
        : `[Mock Answer] ${name} has a weak score of ${trust}%. Avoid deploying this to production unless you perform a comprehensive security audit.`;
    } else if (lc.includes("risk") || lc.includes("concern") || lc.includes("worry")) {
      reply = `[Mock Answer] Current metadata risk for ${name} is ${risk}%. The security heuristic is ${secVal}%, and some repository signals might need attention.`;
    } else {
      reply = `[Mock Answer] ${name}: trust score ${trust}% (${grade}), security heuristic ${secVal}%, metadata risk ${risk}%. Configuration of GEMINI_API_KEY is required for live Gemini chatbot advice.`;
    }
    return res.json({ response: reply });
  }

  try {
    const reply = await generateAIChatResponse(repoData, question);
    res.json({ response: reply });
  } catch (error) {
    console.error("Error generating chat response:", error);
    res.status(500).json({ error: "Failed to generate AI response." });
  }
});

function parseGeminiJSON(text) {
  try {
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Failed to parse Gemini JSON:", e, "Raw text:", text);
    return null;
  }
}

const MOCK_AI_REPORT = {
  summary: "Mock AI Summary: Set GEMINI_API_KEY in your .env file to see live AI insights generated from the Google Gemini API.",
  strengths: [
    "Strong community presence and high star count indicating popularity",
    "Open source project with community contributors"
  ],
  weaknesses: [
    "Lack of explicit security policy in the repository root",
    "High issue-to-star ratio indicating maintenance backlogs"
  ],
  recommendation: "Evaluate in a sandbox environment and pin versions to mitigate supply chain risks.",
  futureRisk: "Medium risk of release stagnation if core maintainers drop off.",
  maintenanceRisk: "Low risk based on recent active pushed commits.",
  securityAdvice: "Set up automated vulnerability scanners (e.g. Dependabot) and review lockfiles."
};

app.listen(PORT, () => {
  console.log(`TrustIQ is running at http://localhost:${PORT}`);
});
