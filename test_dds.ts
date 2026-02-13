
import { search, SafeSearchType } from 'duck-duck-scrape';

async function test() {
  console.log('Testing duck-duck-scrape...');
  try {
    const results = await search('latest AI news', {
      safeSearch: SafeSearchType.MODERATE
    });

    console.log('Results found:', results.results.length);
    results.results.slice(0, 3).forEach((r, i) => {
      console.log(`[${i}] ${r.title}`);
      console.log(`    ${r.url}`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
