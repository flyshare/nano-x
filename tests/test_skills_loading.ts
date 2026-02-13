
import { ContextBuilder } from '../src/context/ContextBuilder';
import { SkillsLoader } from '../src/skills/SkillsLoader';
import * as path from 'path';

async function runTest() {
    console.log('--- Testing Skills Progressive Loading ---');
    
    const workspaceRoot = process.cwd();
    const builder = new ContextBuilder(workspaceRoot);
    
    // Test 1: Non-Triggered Mode
    console.log('\n1. Testing Non-Triggered Mode (User: "Hello World")...');
    const prompt1 = builder.buildSystemPrompt("Hello World");
    
    // Check if "Available Skills" summary is present
    if (prompt1.includes('## Available Skills') && prompt1.includes('Code Reviewer')) {
        console.log('✅ Available Skills summary detected.');
    } else {
        console.error('❌ Available Skills summary MISSING.');
    }
    
    // Check if FULL content is absent
    if (!prompt1.includes('# Code Review Standard')) {
        console.log('✅ Full Skill Content is correctly ABSENT.');
    } else {
        console.error('❌ Full Skill Content should NOT be present.');
    }
    
    // Test 2: Triggered Mode
    console.log('\n2. Testing Triggered Mode (User: "Please review this code for security")...');
    const prompt2 = builder.buildSystemPrompt("Please review this code for security");
    
    // Check if FULL content is present
    if (prompt2.includes('# Code Review Standard') && prompt2.includes('## 1. Security')) {
        console.log('✅ Full Skill Content successfully injected.');
    } else {
        console.error('❌ Full Skill Content injection FAILED.');
    }
    
    // Check context structure
    if (prompt2.includes('# Active Skill Context')) {
        console.log('✅ # Active Skill Context header present.');
    } else {
        console.error('❌ # Active Skill Context header MISSING.');
    }

    console.log('\n--- Test Complete ---');
}

runTest();
