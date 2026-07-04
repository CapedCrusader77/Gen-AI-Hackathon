module.exports = function(reposData) {
  return `
You are an expert software architect and decision intelligence analyst.
Compare the following GitHub repositories.

Repositories Data:
${JSON.stringify(reposData, null, 2)}

Determine a final winner and grade each repository (0-100) on:
- Security
- Maintenance
- Community
- Future Viability
- Enterprise Readiness
- Documentation

Return ONLY JSON in the following format:
{
  "winner": "Name of the winning repository (e.g. owner/repo)",
  "comparison": {
    "owner/repo1": {
      "security": 85,
      "maintenance": 90,
      "community": 95,
      "futureViability": 80,
      "enterpriseReadiness": 75,
      "documentation": 85
    },
    "owner/repo2": {
      "security": 70,
      "maintenance": 75,
      "community": 80,
      "futureViability": 75,
      "enterpriseReadiness": 60,
      "documentation": 70
    }
  },
  "recommendation": "Detailed architectural advice explaining why the winner was chosen, major trade-offs, and under what conditions an alternative would be preferred."
}
`;
};
