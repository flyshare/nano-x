
import { read_file_tool, write_file_tool } from '../src/tools/Filesystem'
import * as path from 'path'
import * as fs from 'fs/promises'

async function runTest() {
    console.log('--- Testing Encoding & Pagination ---')

    const encodingFile = path.resolve(__dirname, 'encoding_test.txt')
    const largeFile = path.resolve(__dirname, 'large_pagination_test.txt')

    try {
        // 1. Test Encoding (Chinese characters)
        console.log('\n1. Testing UTF-8 Encoding...')
        const chineseContent = '中文编码测试\n第二行\n🚀 emoji test'
        await write_file_tool({ path: encodingFile, content: chineseContent })
        
        const readResult = await read_file_tool({ path: encodingFile })
        console.log('   Read Result:\n', readResult)
        
        if (readResult.includes('中文编码测试') && readResult.includes('🚀')) {
            console.log('✅ Encoding Verified!')
        } else {
            console.error('❌ Encoding Failed!')
        }

        // 2. Test Pagination Rejection
        console.log('\n2. Testing Pagination Rejection...')
        // Create a file with 600 lines
        const largeContent = Array(600).fill('Line').join('\n')
        await write_file_tool({ path: largeFile, content: largeContent })
        
        // Attempt to read without range
        const failResult = await read_file_tool({ path: largeFile })
        console.log('   Read Result (No Range):', failResult)
        
        if (failResult.includes('Error: File is too large') && failResult.includes('Please specify a line range')) {
             console.log('✅ Rejection Logic Verified!')
        } else {
             console.error('❌ Rejection Logic Failed! It allowed reading.')
        }

        // Attempt to read WITH range
        const successResult = await read_file_tool({ path: largeFile, startLine: 1, endLine: 5 })
        console.log('   Read Result (With Range):', successResult.slice(0, 50).replace(/\n/g, ' '))
        
        if (!successResult.includes('Error')) {
             console.log('✅ Valid Range Read Verified!')
        } else {
             console.error('❌ Valid Range Read Failed!')
        }

    } catch (e) {
        console.error('Test failed:', e)
    } finally {
        // Cleanup
        await fs.rm(encodingFile, { force: true })
        await fs.rm(largeFile, { force: true })
    }
}

runTest()
