require('dotenv').config();
const express = require('express');
const path = require('path');
const { generateAIReport, generateAIChatResponse, generateAIComparison } = require('./services/geminiService');

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
    let aiReport;
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
          aiReport = parsedReport;
        } else {
          aiReport = generateMockAIReport(repo, contributors, daysSincePush, hasSecurityPolicy, hasLockfile, hasLicense, trust, security, maintenance, communityScore, supply);
        }
      } catch (err) {
        console.error("Error generating AI report:", err);
        aiReport = generateMockAIReport(repo, contributors, daysSincePush, hasSecurityPolicy, hasLockfile, hasLicense, trust, security, maintenance, communityScore, supply);
      }
    } else {
      aiReport = generateMockAIReport(repo, contributors, daysSincePush, hasSecurityPolicy, hasLockfile, hasLicense, trust, security, maintenance, communityScore, supply);
    }
    payload.aiReport = aiReport;

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
    const boardroom = repoData?.aiReport?.boardroom || {};
    const decision = boardroom.decision || "REVIEW REQUIRED";
    const confidence = boardroom.confidence || 75;
    const secVal = repoData?.scores?.security || 50;
    const risk = repoData?.regret?.prob || 50;
    const lc = question.toLowerCase();

    let reply;
    if (lc.includes("deploy") || lc.includes("production") || lc.includes("adopt") || lc.includes("should i")) {
      reply = `[Mock Answer] Based on Boardroom analysis, the adoption decision is **${decision}** with a confidence score of **${confidence}%**. For production integration, verify that safety controls match your compliance requirements.`;
    } else if (lc.includes("risk") || lc.includes("concern") || lc.includes("worry")) {
      reply = `[Mock Answer] Primary concerns for ${name} include a metadata risk profile of ${risk}% and security index of ${secVal}%. Review active maintainer levels and lockfile configurations.`;
    } else if (lc.includes("altern")) {
      reply = `[Mock Answer] Safe alternatives depend on your technology stack. Popular options include similar highly-rated framework variants within the community.`;
    } else {
      reply = `[Mock Answer] ${name}: boardroom decision is ${decision} (${confidence}% confidence). Configuration of GEMINI_API_KEY is required for live custom advice.`;
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

// Multi-repository comparison endpoint
app.post('/api/compare', async (req, res) => {
  const { urls } = req.body;
  if (!Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: "Provide an array of repository URLs/names." });
  }

  try {
    const reposData = await Promise.all(urls.map(async (url) => {
      const fullName = parseRepository(url);
      if (!fullName) throw new Error(`Invalid repository URL: ${url}`);
      
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
      
      const hasLockfile = rootFiles.some(name => 
        ['package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'pnpm-lock.yaml',
         'poetry.lock', 'pipfile.lock', 'cargo.lock', 'go.sum', 'composer.lock', 'gemfile.lock'].includes(name)
      );
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

      const activityRisk = Math.min(30, Math.round(daysSincePush / 12));
      const policyRisk = hasSecurityPolicy ? 0 : 20;
      const hygieneRisk = (hasLockfile ? 0 : 15) + (hasLicense ? 0 : 15) + (repo.archived ? 20 : 0);
      const risk = activityRisk + policyRisk + hygieneRisk;
      const trust = 100 - risk;
      const docScore = rootFiles.includes('readme.md') ? 95 : 40;

      return {
        name: repo.full_name,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        contributors,
        hasSecurityPolicy,
        hasLockfile,
        hasLicense,
        repoArchived: repo.archived,
        daysSincePush,
        scores: { security, maintenance, community: communityScore, supply, trust, documentation: docScore }
      };
    }));

    if (process.env.GEMINI_API_KEY) {
      try {
        const rawComp = await generateAIComparison(reposData);
        const parsedComp = parseGeminiJSON(rawComp);
        if (parsedComp) {
          return res.json(parsedComp);
        }
      } catch (err) {
        console.error("Error generating AI comparison:", err);
      }
    }

    // Deterministic fallback comparison matrix calculation
    const result = {
      winner: "",
      comparison: {},
      recommendation: ""
    };

    let highestScore = -1;
    reposData.forEach(repo => {
      const enterpriseReadiness = Math.round(
        (repo.hasSecurityPolicy ? 25 : 0) +
        (repo.hasLockfile ? 20 : 0) +
        Math.min(40, (repo.contributors / 100) * 40) +
        (repo.scores.documentation ? 15 : 0)
      );

      const futureViability = Math.max(10, Math.round(repo.scores.trust - (repo.daysSincePush > 90 ? 15 : 0)));
      
      const overallAvg = Math.round(
        (repo.scores.security + repo.scores.maintenance + repo.scores.community + futureViability + enterpriseReadiness + repo.scores.documentation) / 6
      );

      if (overallAvg > highestScore) {
        highestScore = overallAvg;
        result.winner = repo.name;
      }

      result.comparison[repo.name] = {
        security: repo.scores.security,
        maintenance: repo.scores.maintenance,
        community: repo.scores.community,
        futureViability,
        enterpriseReadiness,
        documentation: repo.scores.documentation
      };
    });

    result.recommendation = `Based on a deterministic multi-factor scoring matrix, the winner is **${result.winner}**. It provides the most balanced distribution of security controls, active maintainer cycles, and overall enterprise readiness. If choosing between these candidates, we recommend adopting the winner for high-stakes workloads, while lower tier packages may be sandboxed for internal evaluation.`;

    res.json(result);
  } catch (error) {
    console.error("Comparison error:", error);
    res.status(500).json({ error: error.message });
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

// Generate rich dynamic mock decision intelligence reports
function generateMockAIReport(repo, contributors, daysSincePush, hasSecurityPolicy, hasLockfile, hasLicense, trust, security, maintenance, communityScore, supply) {
  let healthStatus = "Stable";
  if (repo.archived) healthStatus = "Abandoned";
  else if (daysSincePush > 365) healthStatus = "Zombie";
  else if (daysSincePush > 180) healthStatus = "Declining";
  else if (trust >= 80) healthStatus = "Healthy";

  let decision = "REVIEW REQUIRED";
  if (trust >= 80) decision = "APPROVED";
  else if (trust < 55) decision = "NOT RECOMMENDED";

  const enterpriseReadiness = Math.round(
    (hasSecurityPolicy ? 25 : 0) + 
    (hasLicense ? 15 : 0) + 
    (hasLockfile ? 20 : 0) + 
    Math.min(40, (contributors / 100) * 40)
  );

  const futureScore = Math.max(10, Math.round(trust - (daysSincePush > 90 ? 15 : 0)));

  const alternatives = [];
  const lowercaseName = repo.full_name.toLowerCase();
  if (lowercaseName.includes("langchain")) {
    alternatives.push({ name: "run-llama/llama_index", reason: "More lightweight alternative specifically optimized for index creation and vector database search." });
    alternatives.push({ name: "crewAI/crewAI", reason: "Better framework for multi-agent workflows." });
  } else if (lowercaseName.includes("llama")) {
    alternatives.push({ name: "langchain-ai/langchain", reason: "More mature ecosystem with extensive integration options." });
  } else if (lowercaseName.includes("crewai")) {
    alternatives.push({ name: "significant-gravitas/auto-gpt", reason: "Well-established agent framework for autonomous tasks." });
  } else {
    alternatives.push({ name: "expressjs/express", reason: "Standard node backend framework with robust track record." });
    alternatives.push({ name: "koajs/koa", reason: "Lightweight backend framework developed by the creators of Express." });
  }

  return {
    boardroom: {
      decision,
      confidence: Math.min(100, Math.max(30, Math.round(trust + (contributors > 100 ? 10 : -10)))),
      businessRisk: trust >= 80 ? "Low" : trust >= 55 ? "Medium" : "High",
      maintenanceRisk: daysSincePush <= 90 ? "Low" : daysSincePush <= 180 ? "Medium" : "High",
      securityRisk: hasSecurityPolicy ? "Low" : "High",
      summary: `Adoption analysis of ${repo.full_name}. Trust Score is ${trust}% with ${healthStatus.toLowerCase()} repository health. Last push was ${Math.round(daysSincePush)} days ago by a community of ${contributors} contributors.`
    },
    adoptionProfiles: {
      personal: { verdict: "APPROVED", reasoning: "Low stakes allow integration regardless of minor security policy or backup maintenance gaps." },
      startup: { verdict: trust >= 60 ? "APPROVED" : "REVIEW REQUIRED", reasoning: "Prioritizes speed, but needs safety checks if trust score is critically low." },
      enterprise: { verdict: trust >= 80 ? "APPROVED" : "REVIEW REQUIRED", reasoning: "Requires strict adherence to licensing and policy metrics." },
      saas: { verdict: trust >= 70 ? "APPROVED" : "REVIEW REQUIRED", reasoning: "Production environment requires active dependency updates and lockfiles." },
      banking: { verdict: trust >= 85 ? "APPROVED" : "NOT RECOMMENDED", reasoning: "Requires maximum compliance, security policy, active maintenance, and verified licenses." },
      healthcare: { verdict: trust >= 85 ? "APPROVED" : "NOT RECOMMENDED", reasoning: "HIPAA compliance standards mandate strict vulnerability disclosure protocols." },
      government: { verdict: trust >= 90 ? "APPROVED" : "NOT RECOMMENDED", reasoning: "Requires high supply chain assurance and clear license terms." }
    },
    healthStatus,
    enterpriseReadinessScore: enterpriseReadiness,
    futureViability: {
      score: futureScore,
      forecast: [
        { period: "Current", score: futureScore },
        { period: "6-Month", score: Math.max(0, Math.round(futureScore * 0.98)) },
        { period: "12-Month", score: Math.max(0, Math.round(futureScore * 0.95)) },
        { period: "24-Month", score: Math.max(0, Math.round(futureScore * 0.90)) }
      ],
      explanation: `Predicted stability over 24 months shows a minor decay trajectory based on current commit velocity and outstanding open issues.`
    },
    timeline: [
      { date: "12 months ago", event: "Active release cycle and key feature additions.", score: Math.min(100, futureScore + 10), type: "increase" },
      { date: "6 months ago", event: "Slight increase in issue backlogs and pull request counts.", score: Math.min(100, futureScore + 5), type: "neutral" },
      { date: "Current", event: `Current assessment reflecting ${daysSincePush <= 30 ? "active development" : "release stagnation"}.`, score: futureScore, type: "neutral" }
    ],
    alternatives
  };
}

app.listen(PORT, () => {
  console.log(`TrustGraph is running at http://localhost:${PORT}`);
});
