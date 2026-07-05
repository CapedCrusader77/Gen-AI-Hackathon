module.exports = function(repoData) {
  return `
You are an expert software architect, software supply chain security analyst, and enterprise IT risk advisor.
Analyze the following GitHub repository metadata and compute a detailed, decision-oriented AI Adoption Decision Intelligence report.

Repository Data:
${JSON.stringify(repoData, null, 2)}

Evaluate the repository and output a JSON response containing critical decision parameters. The JSON MUST follow this exact structure:

{
  "boardroom": {
    "decision": "APPROVE" | "APPROVE WITH REVIEW" | "RESTRICT" | "REJECT",
    "confidence": 90, 
    "summary": "Executive summary of the repository's posture, trade-offs, and critical decision highlights."
  },
  "dueDiligence": {
    "technicalRisk": { "level": "Low" | "Medium" | "High", "description": "Analysis of architectural design, tech debt, and code complexity." },
    "securityRisk": { "level": "Low" | "Medium" | "High", "description": "Analysis of vulnerabilities, secret scanning, security policy, and lockfiles." },
    "maintenanceRisk": { "level": "Low" | "Medium" | "High", "description": "Analysis of push intervals, issue backlog, PR resolution, and active maintainer presence." },
    "communityRisk": { "level": "Low" | "Medium" | "High", "description": "Analysis of contributor concentration, bus factor, fork density, and star momentum." },
    "adoptionRisk": { "level": "Low" | "Medium" | "High", "description": "Analysis of legal licensing compliance, ease of integration, and documentation completeness." },
    "vendorLockInRisk": { "level": "Low" | "Medium" | "High", "description": "Analysis of proprietary hooks, cloud-specific hooks, or difficulty of migration." },
    "futureViabilityRisk": { "level": "Low" | "Medium" | "High", "description": "Analysis of likelihood of abandonment, standard replacement, or community deprecation." }
  },
  "investmentAnalyst": {
    "growthRating": "A+" | "A" | "B" | "C" | "D",
    "healthRating": "Strong" | "Moderate" | "Fragile",
    "riskRating": "Low" | "Elevated" | "Severe",
    "momentumRating": "Accelerating" | "Stagnant" | "Decelerating",
    "viabilityRating": "Viable" | "At-Risk" | "Unviable",
    "recommendation": "BUY" | "HOLD" | "AVOID",
    "justification": "Detailed Bloomberg-terminal-style investment analyst rationale treating the codebase like an asset."
  },
  "adoptionReadiness": {
    "personal": { "verdict": "APPROVED" | "REVIEW" | "BLOCKED", "reasoning": "Brief rationale" },
    "startup": { "verdict": "APPROVED" | "REVIEW" | "BLOCKED", "reasoning": "Brief rationale" },
    "enterprise": { "verdict": "APPROVED" | "REVIEW" | "BLOCKED", "reasoning": "Brief rationale" },
    "saas": { "verdict": "APPROVED" | "REVIEW" | "BLOCKED", "reasoning": "Brief rationale" },
    "banking": { "verdict": "APPROVED" | "REVIEW" | "BLOCKED", "reasoning": "Brief rationale" },
    "healthcare": { "verdict": "APPROVED" | "REVIEW" | "BLOCKED", "reasoning": "Brief rationale" },
    "government": { "verdict": "APPROVED" | "REVIEW" | "BLOCKED", "reasoning": "Brief rationale" }
  },
  "timeMachine": {
    "pastTrust": { "score": 80, "date": "12 months ago", "reason": "Reasoning for historical state" },
    "presentTrust": { "score": 85, "date": "Today", "reason": "Reasoning for current assessment" },
    "futureTrust": { "score": 75, "date": "12 months from now", "reason": "Trajectory prediction explanation" },
    "trendReasoning": "Summary of overall trajectory and warning signals."
  },
  "ecosystemMap": {
    "maintainers": ["Core Maintainer 1 Name", "Core Maintainer 2 Name"],
    "contributors": ["Top Contributor 1 Name", "Top Contributor 2 Name", "Top Contributor 3 Name"],
    "relatedProjects": ["owner/repoA", "owner/repoB"],
    "vulnerabilities": [
      { "id": "CVE-YYYY-XXXX", "severity": "LOW" | "MODERATE" | "HIGH" | "CRITICAL", "description": "Vulnerability summary if any, or general supply chain concern." }
    ],
    "alternatives": [
      { "name": "owner/alternativeA", "reason": "Why this alternative is safer or more suitable" }
    ]
  }
}

Return ONLY the raw JSON object, without markdown block wrappers.
`;
};