module.exports = (repoData) => `
You are an expert software supply chain security analyst.

Analyze the following GitHub repository.

Repository:

${JSON.stringify(repoData,null,2)}

Return JSON only.

{
trustScore,
summary,
strengths[],
weaknesses[],
recommendation,
futureRisk,
maintenanceRisk,
securityAdvice
}
`;