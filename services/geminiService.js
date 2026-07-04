const { GoogleGenerativeAI } = require("@google/generative-ai");
const buildPrompt = require("../prompts/trustPrompt");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateAIReport(repoData) {
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash"
    });

    const prompt = buildPrompt(repoData);

    const result = await model.generateContent(prompt);

    const response = result.response.text();

    return response;
}

module.exports = {
    generateAIReport
};