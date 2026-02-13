
import axios from 'axios'
import * as cheerio from 'cheerio'

async function debug() {
    const url = `https://html.duckduckgo.com/html/`
    console.log(`Fetching ${url} with POST...`)
    try {
        const response = await axios.post(url, 
            `q=test&b=&kl=&df=`, 
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Origin': 'https://html.duckduckgo.com',
                    'Referer': 'https://html.duckduckgo.com/'
                },
                maxRedirects: 5,
                validateStatus: (status) => status < 500
            }
        )
        console.log(`Status: ${response.status}`)
        
        const $ = cheerio.load(response.data)
        const metaRefresh = $('meta[http-equiv="refresh"]').attr('content')
        if (metaRefresh) {
            console.log(`Meta Refresh found: ${metaRefresh}`)
        }
        
        const forms = $('form')
        console.log(`Forms found: ${forms.length}`)
        
        if (response.data.includes('class="result')) {
             console.log('✅ Found result class!')
        } else {
             console.log('❌ No result class found.')
        }

    } catch (e) {
        console.error(e)
    }
}
debug()
