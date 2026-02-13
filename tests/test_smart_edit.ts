
import { smart_edit_tool, write_file_tool, read_file_tool } from '../src/tools/Filesystem'
import * as path from 'path'
import * as fs from 'fs/promises'

async function runTest() {
    console.log('--- Testing Smart Edit Tool ---')

    const testFile = path.resolve(__dirname, 'smart_edit_test.txt')

    try {
        // 1. Setup File (with mixed line endings or just \n, we will test normalization)
        console.log('\n1. Creating test file...')
        const content = `Line 1
Line 2
Line 3 (Target)
Line 4
Line 3 (Duplicate)
Line 5`
        await write_file_tool({ path: testFile, content: content })

        // 2. Test Normalization (Find with \n in a file that might have \r\n on Windows)
        console.log('\n2. Testing Normalization & Unique Match...')
        const findText = `Line 2
Line 3 (Target)
Line 4`
        const replaceText = `Line 2
Line 3 (EDITED)
Line 4`
        
        const res1 = await smart_edit_tool({
            path: testFile,
            findText: findText,
            replaceText: replaceText
        })
        console.log('   Result:', res1)
        
        const check1 = await read_file_tool({ path: testFile })
        if (check1.includes('Line 3 (EDITED)') && !check1.includes('Line 3 (Target)')) {
            console.log('✅ Edit Verified (Normalization worked)')
        } else {
            console.error('❌ Edit Failed')
            console.log('Content:', check1)
        }

        // 3. Test Uniqueness Check (Fail)
        console.log('\n3. Testing Uniqueness Check (Should Fail)...')
        // Restore file to have duplicates
         const contentDup = `Line A
Target
Line B
Target
Line C`
        await write_file_tool({ path: testFile, content: contentDup })
        
        const res2 = await smart_edit_tool({
            path: testFile,
            findText: 'Target',
            replaceText: 'Replaced'
        })
        console.log('   Result:', res2)
        
        if (res2.includes('Error: findText matches 2 occurrences')) {
            console.log('✅ Uniqueness Check Verified')
        } else {
            console.error('❌ Uniqueness Check Failed')
        }

        // 4. Test Not Found (Fail)
        console.log('\n4. Testing Not Found (Should Fail)...')
        const res3 = await smart_edit_tool({
            path: testFile,
            findText: 'NonExistent',
            replaceText: 'Replaced'
        })
        console.log('   Result:', res3)
        
        if (res3.includes('Error: findText not found')) {
            console.log('✅ Not Found Check Verified')
        } else {
            console.error('❌ Not Found Check Failed')
        }

    } catch (e) {
        console.error('Test failed:', e)
    } finally {
        // Cleanup
        await fs.rm(testFile, { force: true })
    }
}

runTest()
