const { GoogleGenerativeAI } = require("@google/generative-ai");
const buildPrompt = require("../prompts/trustPrompt");

function getGenAI() {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not set in the environment.");
    }
    return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

async function generateAIReport(repoData) {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash"
    });

    const prompt = buildPrompt(repoData);
    const result = await model.generateContent(prompt);
    return result.response.text();
}

async function generateAIChatResponse(repoData, question) {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash"
    });

    const prompt = `
You are TrustIQ's AI Executive Advisor, an expert in software supply chain security and repository trust analysis.
You are helping a developer evaluate whether they should adopt/trust a specific GitHub repository.

Repository Metadata:
${JSON.stringify(repoData, null, 2)}

User's Question:
"${question}"

Provide a professional, concise, and direct answer. Be honest and ground your recommendations in the provided repository data. Keep it under 3-4 sentences.
`;

    const result = await model.generateContent(prompt);
    return result.response.text();
}

module.exports = {
    generateAIReport,
    generateAIChatResponse
};