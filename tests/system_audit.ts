
import { ToolRegistry } from '../src/tools/Registry'
import { z } from 'zod'
import * as path from 'path'
import * as fs from 'fs'

async function runAudit() {
    console.log('Starting System Audit...')
    const registry = new ToolRegistry()
    const tools = registry.getDefinitions()
    
    // 1. Registry Check
    console.log(`[Registry] Found ${tools.length} tools.`)
    const expectedTools = ['fs_ls', 'fs_read_file', 'fs_write_file', 'smart_edit', 'get_file_metadata', 'shell_execute_command']
    const foundNames = tools.map(t => t.function.name)
    const missing = expectedTools.filter(t => !foundNames.includes(t))
    
    if (missing.length > 0) {
        console.error(`[Registry] FAILED: Missing tools: ${missing.join(', ')}`)
        process.exit(1)
    }
    console.log('[Registry] PASSED')

    // 2. Shell Interception Check
    console.log('[Shell] Testing Interception...')
    const shellTool = registry.getTool('shell_execute_command')
    if (!shellTool) throw new Error('Shell tool not found')
    
    const interceptResult = await shellTool.execute({ command: 'npm run smart_edit src/main.ts' })
    const parsed = JSON.parse(interceptResult)
    if (parsed.exitCode === 1 && parsed.output.includes('Do not call smart_edit via shell')) {
        console.log('[Shell] PASSED: Interception works')
    } else {
        console.error('[Shell] FAILED: Interception failed', parsed)
        process.exit(1)
    }

    // 3. Smart Edit Logic Check
    console.log('[SmartEdit] Testing Logic...')
    const editTool = registry.getTool('smart_edit')
    if (!editTool) throw new Error('SmartEdit tool not found')

    // Create a temporary test file
    const testFile = path.resolve(process.cwd(), 'audit_test_file.txt')
    fs.writeFileSync(testFile, 'line1\nline2\nline3\n', 'utf-8')

    try {
        // Test Edit
        const result = await editTool.execute({
            path: 'audit_test_file.txt',
            findText: 'line2',
            replaceText: 'line2_edited'
        })
        
        if (result.includes('Successfully edited')) {
            const content = fs.readFileSync(testFile, 'utf-8')
            if (content.includes('line2_edited') && !content.includes('line2\n')) {
                 console.log('[SmartEdit] PASSED: Edit successful')
            } else {
                console.error('[SmartEdit] FAILED: Content not updated correctly', content)
                process.exit(1)
            }
        } else {
            console.error('[SmartEdit] FAILED: Tool execution failed', result)
            process.exit(1)
        }
    } finally {
        if (fs.existsSync(testFile)) fs.unlinkSync(testFile)
    }

    console.log('System Audit COMPLETE. All checks passed.')
}

runAudit().catch(e => {
    console.error('Audit crashed:', e)
    process.exit(1)
})
