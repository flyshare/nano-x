const { ContextBuilder } = require('./dist/context/ContextBuilder');
const path = require('path');

try {
    console.log("Initializing ContextBuilder...");
    const builder = new ContextBuilder(process.cwd());
    console.log("Building prompt...");
    const prompt = builder.buildSystemPrompt();
    console.log("Prompt built successfully!");
    console.log("--- PROMPT START ---");
    console.log(prompt.substring(0, 500) + "...");
    console.log("--- PROMPT END ---");
} catch (error) {
    console.error("Error:", error);
}
