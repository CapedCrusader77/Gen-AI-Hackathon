module.exports = function(repoData) {
  return `
You are an expert software architect, supply chain security analyst, and IT risk advisor.
Analyze the following GitHub repository metadata and compute a detailed, decision-oriented adoption report.

Repository Data:
${JSON.stringify(repoData, null, 2)}

Evaluate the repository and output a JSON response containing critical decision parameters. The JSON MUST follow this exact structure:

{
  "boardroom": {
    "decision": "APPROVED" | "REVIEW REQUIRED" | "NOT RECOMMENDED",
    "confidence": 90, 
    "businessRisk": "Low" | "Medium" | "High",
    "maintenanceRisk": "Low" | "Medium" | "High",
    "securityRisk": "Low" | "Medium" | "High",
    "summary": "Executive summary of the repository's posture, trade-offs, and critical decision highlights."
  },
  "adoptionProfiles": {
    "personal": { "verdict": "APPROVED" | "REVIEW REQUIRED" | "NOT RECOMMENDED", "reasoning": "Brief rationale" },
    "startup": { "verdict": "APPROVED" | "REVIEW REQUIRED" | "NOT RECOMMENDED", "reasoning": "Brief rationale" },
    "enterprise": { "verdict": "APPROVED" | "REVIEW REQUIRED" | "NOT RECOMMENDED", "reasoning": "Brief rationale" },
    "saas": { "verdict": "APPROVED" | "REVIEW REQUIRED" | "NOT RECOMMENDED", "reasoning": "Brief rationale" },
    "banking": { "verdict": "APPROVED" | "REVIEW REQUIRED" | "NOT RECOMMENDED", "reasoning": "Brief rationale" },
    "healthcare": { "verdict": "APPROVED" | "REVIEW REQUIRED" | "NOT RECOMMENDED", "reasoning": "Brief rationale" },
    "government": { "verdict": "APPROVED" | "REVIEW REQUIRED" | "NOT RECOMMENDED", "reasoning": "Brief rationale" }
  },
  "healthStatus": "Healthy" | "Stable" | "Declining" | "Zombie" | "Abandoned",
  "enterpriseReadinessScore": 85,
  "futureViability": {
    "score": 80,
    "forecast": [
      { "period": "Current", "score": 85 },
      { "period": "6-Month", "score": 83 },
      { "period": "12-Month", "score": 80 },
      { "period": "24-Month", "score": 75 }
    ],
    "explanation": "A concise prediction of how the repository health, contributor growth, or issue backlog will evolve over 2 years."
  },
  "timeline": [
    { "date": "12 months ago", "event": "Brief description of event (e.g. major release, contributor drop off)", "score": 78, "type": "increase" | "decrease" | "neutral" },
    { "date": "6 months ago", "event": "Brief description of event", "score": 83, "type": "increase" | "decrease" | "neutral" },
    { "date": "Current", "event": "Brief description of current state", "score": 85, "type": "increase" | "decrease" | "neutral" }
  ],
  "alternatives": [
    { "name": "Alternative repository name 1 (owner/repo)", "reason": "Why this alternative is safer or more suitable" },
    { "name": "Alternative repository name 2 (owner/repo)", "reason": "Why this alternative is safer or more suitable" }
  ]
}

Return ONLY the raw JSON object, without markdown block wrappers.
`;
};