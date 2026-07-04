module.exports = function(repoData){

return `
You are an expert software supply chain security analyst.

Analyze the following GitHub repository.

Repository Data:

${JSON.stringify(repoData,null,2)}

Return ONLY JSON.

{
"summary":"",
"strengths":[
],
"weaknesses":[
],
"recommendation":"",
"futureRisk":"",
"maintenanceRisk":"",
"securityAdvice":""
}

`;
}