
import axios from 'axios'
import * as cheerio from 'cheerio'

async function debugLite() {
    const url = `https://lite.duckduckgo.com/lite/`
    console.log(`Fetching ${url}...`)
    try {
        const response = await axios.post(url, 
            `q=test&kl=&dt=`, 
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Referer': 'https://lite.duckduckgo.com/'
                }
            }
        )
        console.log(`Status: ${response.status}`)
        const $ = cheerio.load(response.data)
        const results: any[] = []
        
        // Lite structure: .result-link, .result-snippet
        // Actually it's a table.
        // tr > td > a.result-link
        // tr > td.result-snippet
        
        const links = $('.result-link')
        console.log(`Found ${links.length} links.`)
        
        links.each((i, el) => {
            const title = $(el).text()
            const link = $(el).attr('href')
            const snippet = $(el).parent().parent().next().find('.result-snippet').text()
            console.log(`[${i}] ${title} - ${link}`)
        })

    } catch (e) {
        console.error(e)
    }
}
debugLite()
