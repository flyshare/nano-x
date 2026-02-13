
import { ContextBuilder } from '../src/context/ContextBuilder';
import { RememberTool } from '../src/tools/MemoryTool';
import * as fs from 'fs';
import * as path from 'path';

async function runTest() {
    console.log('--- Testing Memory Integration ---');

    const workspaceRoot = process.cwd();
    const memoryDir = path.join(workspaceRoot, 'workspace', 'memory');
    
    // Cleanup previous test run
    if (fs.existsSync(memoryDir)) {
        // We might want to keep it if we want persistence, but for test isolation let's clear daily memory
        // But let's keep Long-term memory structure to test initialization
    }

    // 1. Initialize ContextBuilder (should trigger MemoryStore init)
    console.log('1. Initializing ContextBuilder...');
    const contextBuilder = new ContextBuilder(workspaceRoot);
    
    // 2. Check Initial System Prompt
    console.log('2. Building Initial System Prompt...');
    const prompt1 = contextBuilder.buildSystemPrompt();
    
    if (prompt1.includes('## Memory (Second Brain)')) {
        console.log('✅ Memory section found in system prompt.');
    } else {
        console.error('❌ Memory section MISSING in system prompt.');
    }

    if (prompt1.includes('Record Instinct')) {
        console.log('✅ Record Instinct found in system prompt.');
    } else {
        console.error('❌ Record Instinct MISSING in system prompt.');
    }

    // 3. Save a New Memory via Tool
    console.log('3. Saving new memory via RememberTool...');
    const rememberTool = new RememberTool();
    await rememberTool.execute({
        content: 'Dan Koe says: Focus on the inputs, not the outputs.',
        isLongTerm: true
    });

    await rememberTool.execute({
        content: 'Fixed a bug in ContextBuilder today.',
        isLongTerm: false
    });

    // 4. Check Updated System Prompt
    console.log('4. Building Updated System Prompt...');
    const prompt2 = contextBuilder.buildSystemPrompt();

    if (prompt2.includes('Dan Koe says: Focus on the inputs')) {
        console.log('✅ Long-term memory successfully injected.');
    } else {
        console.error('❌ Long-term memory injection FAILED.');
    }

    if (prompt2.includes('Fixed a bug in ContextBuilder today.')) {
        console.log('✅ Daily memory successfully injected.');
    } else {
        console.error('❌ Daily memory injection FAILED.');
    }
    
    // 5. Verify Files
    const longTermFile = path.join(memoryDir, 'MEMORY.md');
    if (fs.existsSync(longTermFile)) {
        const content = fs.readFileSync(longTermFile, 'utf-8');
        if (content.includes('Dan Koe says')) {
            console.log('✅ MEMORY.md file updated correctly.');
        }
    } else {
        console.error('❌ MEMORY.md file not found.');
    }

}

runTest();
