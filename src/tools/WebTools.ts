
import { z } from 'zod'
import axios from 'axios'
import * as cheerio from 'cheerio'
import { BaseTool } from './Tool'
import { search, SafeSearchType } from 'duck-duck-scrape'

// --- Web Search Tool ---

export const WebSearchSchema = z.object({
  query: z.string().describe('The search query to execute on DuckDuckGo.'),
})

export class WebSearchTool extends BaseTool {
  name = 'web_search'
  description = 'Search the web using DuckDuckGo to find information, news, or technical documentation.'
  schema = WebSearchSchema

  async execute(args: z.infer<typeof WebSearchSchema>): Promise<string> {
    const query = args.query.trim()
    if (!query) return 'Error: Query cannot be empty.'

    try {
      const searchResults = await search(query, {
        safeSearch: SafeSearchType.MODERATE
      })

      if (!searchResults.results || searchResults.results.length === 0) {
        return 'No results found on DuckDuckGo.'
      }

      // Take top 5
      const topResults = searchResults.results.slice(0, 5)

      return topResults.map((r: any, i: number) => 
        `[${i + 1}] ${r.title}\n    Link: ${r.url}\n    Snippet: ${r.description || r.snippet || 'No description'}`
      ).join('\n\n')

    } catch (error) {
      return `Error performing web search: ${error}`
    }
  }
}

// --- Web Fetch Tool ---

export const WebFetchSchema = z.object({
  url: z.string().describe('The URL of the webpage to fetch and read.'),
})

export class WebFetchTool extends BaseTool {
  name = 'web_fetch'
  description = 'Fetch and extract the main text content from a specific webpage URL.'
  schema = WebFetchSchema

  async execute(args: z.infer<typeof WebFetchSchema>): Promise<string> {
    const url = args.url.trim()
    if (!url) return 'Error: URL cannot be empty.'

    try {
      // User-Agent from nanobot reference + extra headers to look legitimate
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.google.com/'
      }

      const response = await axios.get(url, {
        headers,
        timeout: 15000, // 15s timeout
        maxRedirects: 5
      })

      const $ = cheerio.load(response.data)
      
      // Remove scripts, styles, and other noise
      $('script, style, nav, footer, iframe, svg, noscript, header, aside').remove()

      // Try to get the main content
      // Heuristics: look for 'main', 'article', or just body
      let content = $('main').text() || $('article').text() || $('body').text()
      
      // Clean up whitespace
      content = content.replace(/\s+/g, ' ').trim()
      
      // Basic markdown conversion simulation (just separating blocks)
      content = content.replace(/\n\s*\n/g, '\n\n')

      if (content.length > 5000) {
          content = content.substring(0, 5000) + '... [Truncated]'
      }

      return `URL: ${url}\nTitle: ${$('title').text().trim()}\n\n${content}`

    } catch (error) {
      return `Error fetching URL: ${error}`
    }
  }
}
