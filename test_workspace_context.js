const { ContextBuilder } = require('./dist/context/ContextBuilder');
const path = require('path');
const fs = require('fs');

try {
    console.log("Initializing ContextBuilder with new workspace logic...");
    const builder = new ContextBuilder(process.cwd());
    console.log("Building prompt...");
    const prompt = builder.buildSystemPrompt();
    
    console.log("\n--- VERIFICATION CHECKS ---");
    
    // Check 1: Workspace Path in Prompt
    if (prompt.includes('Your home base is:')) {
        console.log("✅ Prompt contains workspace path info.");
    } else {
        console.error("❌ Prompt MISSING workspace path info.");
    }
    
    // Check 2: Permission Constraint
    if (prompt.includes('除非用户明确指令，否则请优先在 workspace/ 内进行自我更新和记录')) {
        console.log("✅ Prompt contains permission constraint.");
    } else {
        console.error("❌ Prompt MISSING permission constraint.");
    }

    // Check 3: Bootstrap Files Loaded
    // We expect log output from ContextBuilder itself, but let's check content too
    if (prompt.includes('## SOUL.md') && prompt.includes('## AGENTS.md')) {
        console.log("✅ Prompt contains bootstrap file content.");
    } else {
        console.error("❌ Prompt MISSING bootstrap file content.");
    }

    console.log("\n--- PROMPT PREVIEW (First 1000 chars) ---");
    console.log(prompt.substring(0, 1000) + "...");
    
} catch (error) {
    console.error("Error:", error);
}
