
import { truncateOutput } from '../src/tools/Registry'
import { read_file_tool, write_file_tool } from '../src/tools/Filesystem'
import * as path from 'path'
import * as fs from 'fs/promises'

async function runTest() {
    console.log('--- Testing File Protection & Truncation ---')

    const testFile = path.resolve(__dirname, 'large_test_file.txt')

    try {
        // 1. Create a large file (approx 10KB)
        console.log('1. Creating large file...')
        const largeContent = 'Line of text\n'.repeat(1000) // ~13KB
        await write_file_tool({ path: testFile, content: largeContent })

        // 2. Read it using the tool
        console.log('2. Reading file via tool...')
        const readResult = await read_file_tool({ path: testFile })
        console.log(`   Read Result Length: ${readResult.length}`)

        // The read_file_tool itself has some truncation (first 100 lines), 
        // but let's assume we read the whole thing or a large chunk if we specified range.
        // Let's force a large read by specifying range if needed, or just relying on the fact that
        // if we didn't have the tool-level truncation, the firewall would catch it.

        // Let's test the FIREWALL function specifically with a simulated HUGE output
        console.log('\n3. Testing Token Firewall (truncateOutput)...')
        const hugeOutput = 'A'.repeat(10000)
        const guardedOutput = truncateOutput(hugeOutput, 5000)

        console.log(`   Original: ${hugeOutput.length}`)
        console.log(`   Guarded:  ${guardedOutput.length}`)

        if (guardedOutput.length <= 5500 && guardedOutput.includes('... [Output truncated] ...')) {
            console.log('✅ Token Firewall Verified!')
        } else {
            console.error('❌ Token Firewall Failed!')
        }

    } catch (e) {
        console.error('Test failed:', e)
    } finally {
        // Cleanup
        await fs.rm(testFile, { force: true })
    }
}

runTest()
