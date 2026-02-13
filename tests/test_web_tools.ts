
import { WebSearchTool, WebFetchTool } from '../src/tools/WebTools'

async function testWebTools() {
    console.log('--- Testing Web Tools ---')

    const searchTool = new WebSearchTool()
    console.log('\n1. Testing Web Search (Query: "latest AI news")...')

    let urlToFetch = 'https://example.com' // Default fallback

    try {
        const searchResult = await searchTool.execute({ query: 'latest AI news' })
        console.log('Search Result Length:', searchResult.length)
        console.log('Preview:', searchResult.substring(0, 500))

        if (searchResult.includes('Error')) {
            console.error('❌ Search Failed (likely rate limited or blocked)')
        } else if (searchResult.includes('No results')) {
            console.warn('⚠️ No results found')
        } else {
            console.log('✅ Search Successful')
            const match = searchResult.match(/Link: (https?:\/\/[^\s]+)/)
            if (match) urlToFetch = match[1]
        }
    } catch (e) {
        console.error('❌ Search Exception:', e)
    }

    console.log(`\n2. Testing Web Fetch (URL: ${urlToFetch})...`)
    try {
        const fetchTool = new WebFetchTool()
        const fetchResult = await fetchTool.execute({ url: urlToFetch })
        console.log('Fetch Result Length:', fetchResult.length)
        console.log('Preview:', fetchResult.substring(0, 500))

        if (fetchResult.includes('Error')) {
            console.error('❌ Fetch Failed')
        } else {
            console.log('✅ Fetch Successful')
        }
    } catch (e) {
        console.error('❌ Fetch Exception:', e)
    }
}

testWebTools()
