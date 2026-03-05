// Test script for web scraping logic
// Run with: deno run --allow-net test-scraper.ts

async function testScraper() {
  const testUrl = "https://www.newcannabisventures.com/category/news/";
  
  console.log(`Fetching: ${testUrl}`);
  
  const response = await fetch(testUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; Formul8NewsBot/1.0; +https://formul8.ai)",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  
  if (!response.ok) {
    console.error(`Failed: ${response.status} ${response.statusText}`);
    return;
  }
  
  const html = await response.text();
  console.log(`Received ${html.length} bytes`);
  
  // Extract article links
  const pattern = /<a[^>]+href=["'](https:\/\/www\.newcannabisventures\.com\/\d{4}\/\d{2}\/\d{2}\/[^"']+)["']/gi;
  const matches = [...html.matchAll(pattern)];
  const links = matches.map(m => m[1]);
  
  console.log(`\nFound ${links.length} article links:`);
  links.slice(0, 10).forEach((link, i) => {
    console.log(`  ${i + 1}. ${link}`);
  });
  
  if (links.length > 0) {
    console.log(`\nTesting first article: ${links[0]}`);
    const articleResponse = await fetch(links[0], {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Formul8NewsBot/1.0; +https://formul8.ai)",
        "Accept": "text/html",
      },
    });
    
    if (articleResponse.ok) {
      const articleHtml = await articleResponse.text();
      console.log(`Article HTML: ${articleHtml.length} bytes`);
      
      // Extract title
      const titleMatch = articleHtml.match(/<h1[^>]*class=["'][^"']*entry-title[^"']*["'][^>]*>(.*?)<\/h1>/is);
      if (titleMatch) {
        const title = titleMatch[1].replace(/<[^>]*>/g, '').trim();
        console.log(`Title: ${title}`);
      }
      
      // Extract date
      const dateMatch = articleHtml.match(/<time[^>]+datetime=["']([^"']+)["']/i);
      if (dateMatch) {
        console.log(`Date: ${dateMatch[1]}`);
      }
      
      // Extract author
      const authorMatch = articleHtml.match(/<span[^>]*class=["'][^"']*author[^"']*["'][^>]*>(.*?)<\/span>/is);
      if (authorMatch) {
        const author = authorMatch[1].replace(/<[^>]*>/g, '').trim();
        console.log(`Author: ${author}`);
      }
    }
  }
}

testScraper().catch(console.error);
