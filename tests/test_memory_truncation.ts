
import { ContextBuilder } from '../src/context/ContextBuilder';
import { MemoryStore } from '../src/workspace/memory/MemoryStore';
import * as path from 'path';
import * as fs from 'fs';

async function runTest() {
    console.log('--- Testing Memory Truncation ---');
    
    const workspaceRoot = process.cwd();
    const memoryStore = new MemoryStore(workspaceRoot);
    
    // Create a HUGE long-term memory
    const hugeContent = 'A'.repeat(5000);
    memoryStore.saveMemory(hugeContent, 'long');
    
    const contextBuilder = new ContextBuilder(workspaceRoot);
    const prompt = contextBuilder.buildSystemPrompt();
    
    console.log(`Prompt Length: ${prompt.length}`);
    
    // Check if memory section is truncated
    // The memory section should contain '... [Output truncated] ...' if it worked
    if (prompt.includes('[Output truncated]')) {
        console.log('✅ Memory truncation verified!');
    } else {
        console.error('❌ Memory truncation FAILED! Full memory might be present.');
    }
    
    // Cleanup
    const memoryFile = path.join(workspaceRoot, 'workspace', 'memory', 'MEMORY.md');
    // Restore original or delete
    // fs.unlinkSync(memoryFile); // Let's keep it for inspection if needed, or delete.
    // For now, let's delete the huge content to not pollute future tests
    fs.writeFileSync(memoryFile, '# Long-term Memory\n- Restored after test.', 'utf-8');
}

runTest();
