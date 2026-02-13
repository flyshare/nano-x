
import { WebFetchTool } from '../src/tools/WebTools'

async function testFetch() {
    console.log('--- Testing Web Fetch ---')
    const tool = new WebFetchTool()
    const result = await tool.execute({ url: 'https://example.com' })
    console.log(result)
}
testFetch()
