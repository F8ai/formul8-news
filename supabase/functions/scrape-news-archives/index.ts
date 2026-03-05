import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScrapeRequest {
  source_name: string;
  archive_url: string;
  max_pages?: number;
  from_date?: string;
  to_date?: string;
}

interface ScrapeResponse {
  articles_found: number;
  articles_ingested: number;
  articles_duplicate: number;
  pages_scraped: number;
  errors: Array<{ url: string; error: string }>;
}

// Simple HTML parser functions
function extractLinks(html: string, pattern: RegExp): string[] {
  const matches = [...html.matchAll(pattern)];
  return matches.map(m => m[1]).filter(Boolean);
}

function extractText(html: string, pattern: RegExp): string | null {
  const match = html.match(pattern);
  return match ? match[1].trim() : null;
}

function stripHTML(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { source_name, archive_url, max_pages = 10, from_date, to_date }: ScrapeRequest = await req.json();

    console.log(`Starting scrape for ${source_name} from ${archive_url}`);

    // Get or create source
    let { data: source, error: sourceError } = await supabaseClient
      .from("sources")
      .select("*")
      .eq("name", source_name)
      .single();

    if (sourceError || !source) {
      // Create new source
      const { data: newSource, error: createError } = await supabaseClient
        .from("sources")
        .insert({
          name: source_name,
          type: "web_scrape",
          description: `Web scraped articles from ${source_name}`,
          license_policy: {
            mode: "snippet_only",
            snippet_length: 500,
            attribution_required: true,
            redistribution_allowed: true,
          },
        })
        .select()
        .single();

      if (createError || !newSource) {
        throw new Error(`Failed to create source: ${createError?.message}`);
      }
      source = newSource;
    }

    // Get or create endpoint
    let { data: endpoint, error: endpointError } = await supabaseClient
      .from("source_endpoints")
      .select("*")
      .eq("source_id", source.id)
      .eq("endpoint_url", archive_url)
      .single();

    if (endpointError || !endpoint) {
      const { data: newEndpoint, error: createError } = await supabaseClient
        .from("source_endpoints")
        .insert({
          source_id: source.id,
          name: "Archive Scraper",
          endpoint_url: archive_url,
          is_active: true,
        })
        .select()
        .single();

      if (createError || !newEndpoint) {
        throw new Error(`Failed to create endpoint: ${createError?.message}`);
      }
      endpoint = newEndpoint;
    }

    // Create ingest run
    const { data: ingestRun, error: runError } = await supabaseClient
      .from("ingest_runs")
      .insert({
        source_endpoint_id: endpoint.id,
        mode: "backfill",
        status: "started",
      })
      .select()
      .single();

    if (runError || !ingestRun) {
      throw new Error(`Failed to create ingest run: ${runError?.message}`);
    }

    let articles_found = 0;
    let articles_ingested = 0;
    let articles_duplicate = 0;
    let pages_scraped = 0;
    const errors: Array<{ url: string; error: string }> = [];
    const visitedUrls = new Set<string>();

    // Scrape archive pages
    for (let page = 1; page <= max_pages; page++) {
      try {
        const pageUrl = archive_url.includes('?') 
          ? `${archive_url}&page=${page}`
          : `${archive_url}?page=${page}`;

        console.log(`Scraping page ${page}: ${pageUrl}`);

        const response = await fetch(pageUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; Formul8NewsBot/1.0; +https://formul8.ai)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
        });

        if (!response.ok) {
          console.warn(`Failed to fetch page ${page}: ${response.status}`);
          break;
        }

        const html = await response.text();
        pages_scraped++;

        // Extract article links (customize patterns per site)
        const articleLinks = extractArticleLinks(html, source_name);
        
        if (articleLinks.length === 0) {
          console.log(`No articles found on page ${page}, stopping`);
          break;
        }

        console.log(`Found ${articleLinks.length} articles on page ${page}`);

        // Limit articles per page to avoid timeout
        const articlesToProcess = articleLinks.slice(0, 5);

        // Scrape each article
        for (const articleUrl of articlesToProcess) {
          if (visitedUrls.has(articleUrl)) continue;
          visitedUrls.add(articleUrl);

          try {
            articles_found++;
            
            const articleResponse = await fetch(articleUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (compatible; Formul8NewsBot/1.0; +https://formul8.ai)",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              },
            });

            if (!articleResponse.ok) {
              errors.push({ url: articleUrl, error: `HTTP ${articleResponse.status}` });
              continue;
            }

            const articleHtml = await articleResponse.text();
            const article = extractArticleData(articleHtml, articleUrl, source_name);

            if (!article.title) {
              errors.push({ url: articleUrl, error: "No title found" });
              continue;
            }

            // Check date filter
            if (from_date && article.published_at && article.published_at < from_date) {
              continue;
            }
            if (to_date && article.published_at && article.published_at > to_date) {
              continue;
            }

            // Compute fingerprint
            const normalizedContent = (article.content || "").toLowerCase().trim().replace(/\s+/g, " ");
            const encoder = new TextEncoder();
            const data = encoder.encode(normalizedContent);
            const hashBuffer = await crypto.subtle.digest("SHA-256", data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const fingerprint_hash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

            // Check for duplicate
            const { data: existingFingerprint } = await supabaseClient
              .from("signal_fingerprints")
              .select("signal_item_id")
              .eq("fingerprint_hash", fingerprint_hash)
              .single();

            if (existingFingerprint) {
              articles_duplicate++;
              continue;
            }

            // Create signal_item
            const { data: signalItem, error: signalError } = await supabaseClient
              .from("signal_items")
              .insert({
                type: "news",
                title: article.title,
                url: articleUrl,
                published_at: article.published_at,
                content_snippet: article.content?.substring(0, 500),
              })
              .select()
              .single();

            if (signalError || !signalItem) {
              errors.push({ url: articleUrl, error: signalError?.message || "Failed to create signal" });
              continue;
            }

            // Create news_item
            await supabaseClient.from("news_items").insert({
              signal_item_id: signalItem.id,
              author: article.author,
              source_name: source_name,
              content_full: null, // Snippet only per license policy
            });

            // Create provenance_record
            await supabaseClient.from("provenance_records").insert({
              signal_item_id: signalItem.id,
              source_id: source.id,
              source_endpoint_id: endpoint.id,
              ingest_run_id: ingestRun.id,
              license_policy_applied: source.license_policy,
            });

            // Create fingerprint
            await supabaseClient.from("signal_fingerprints").insert({
              signal_item_id: signalItem.id,
              fingerprint_hash,
            });

            articles_ingested++;

            // Rate limiting - reduced for faster execution
            await new Promise(resolve => setTimeout(resolve, 500));

          } catch (articleError) {
            errors.push({ url: articleUrl, error: (articleError as Error).message });
          }
        }

        // Rate limiting between pages - reduced
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (pageError) {
        errors.push({ url: `page-${page}`, error: (pageError as Error).message });
      }
    }

    // Update ingest run
    await supabaseClient
      .from("ingest_runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        items_processed: articles_found,
        items_created: articles_ingested,
        items_duplicate: articles_duplicate,
      })
      .eq("id", ingestRun.id);

    const response: ScrapeResponse = {
      articles_found,
      articles_ingested,
      articles_duplicate,
      pages_scraped,
      errors,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// Site-specific article link extraction
function extractArticleLinks(html: string, sourceName: string): string[] {
  const links: string[] = [];
  
  if (sourceName.includes("Cannabis Ventures")) {
    // Pattern: <h3 class="entry-title"><a href="URL">
    const pattern = /<h3[^>]*class=["'][^"']*entry-title[^"']*["'][^>]*><a[^>]+href=["'](https:\/\/www\.newcannabisventures\.com\/[^"']+)["']/gi;
    return extractLinks(html, pattern);
  }
  
  if (sourceName.includes("Cannabis Industry Journal")) {
    // Pattern: <h4 class="entry-title"><a href="URL">
    const pattern = /<h4[^>]*class=["'][^"']*entry-title[^"']*["'][^>]*>\s*<a[^>]+href=["'](https:\/\/cannabisindustryjournal\.com\/[^"']+)["']/gi;
    return extractLinks(html, pattern);
  }
  
  if (sourceName.includes("Safe Access")) {
    // Pattern: <a href="http://www.safeaccessnow.org/article-slug">
    // They use a different structure, let's try generic link extraction
    const pattern = /<a[^>]+href=["'](https?:\/\/(?:www\.)?safeaccessnow\.org\/[^"'#]+)["']/gi;
    const allLinks = extractLinks(html, pattern);
    // Filter out navigation/static pages
    return allLinks.filter(link => 
      !link.includes('/blog') &&
      !link.includes('/about') &&
      !link.includes('/contact') &&
      !link.includes('/donate') &&
      !link.includes('/join') &&
      !link.includes('/category') &&
      link.length > 40 // Likely an article
    );
  }
  
  // Generic pattern: look for article links
  const pattern = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  const allLinks = extractLinks(html, pattern);
  
  // Filter for likely article URLs
  return allLinks.filter(link => 
    link.includes('/20') && // Has year
    !link.includes('#') && // Not an anchor
    !link.includes('category') &&
    !link.includes('tag') &&
    !link.includes('author') &&
    !link.includes('page')
  );
}

// Site-specific article data extraction
function extractArticleData(html: string, url: string, sourceName: string): {
  title: string | null;
  author: string | null;
  published_at: string | null;
  content: string | null;
} {
  let title = null;
  let author = null;
  let published_at = null;
  let content = null;

  // Extract title
  title = extractText(html, /<h1[^>]*class=["'][^"']*entry-title[^"']*["'][^>]*>(.*?)<\/h1>/is) ||
          extractText(html, /<h1[^>]*>(.*?)<\/h1>/is) ||
          extractText(html, /<title>(.*?)<\/title>/is);

  if (title) {
    title = stripHTML(title);
  }

  // Extract author
  author = extractText(html, /<span[^>]*class=["'][^"']*author[^"']*["'][^>]*>(.*?)<\/span>/is) ||
           extractText(html, /<a[^>]*rel=["']author["'][^>]*>(.*?)<\/a>/is) ||
           extractText(html, /<meta[^>]+name=["']author["'][^>]+content=["']([^"']+)["']/i);

  if (author) {
    author = stripHTML(author);
  }

  // Extract published date
  const dateMatch = extractText(html, /<time[^>]+datetime=["']([^"']+)["']/i) ||
                    extractText(html, /<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i);

  if (dateMatch) {
    try {
      published_at = new Date(dateMatch).toISOString();
    } catch {
      // Try to extract from URL
      const urlDateMatch = url.match(/\/(\d{4})\/(\d{2})\/(\d{2})\//);
      if (urlDateMatch) {
        published_at = `${urlDateMatch[1]}-${urlDateMatch[2]}-${urlDateMatch[3]}T12:00:00Z`;
      }
    }
  }

  // Extract content
  const contentHtml = extractText(html, /<div[^>]*class=["'][^"']*entry-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) ||
                      extractText(html, /<article[^>]*>([\s\S]*?)<\/article>/i) ||
                      extractText(html, /<div[^>]*class=["'][^"']*post-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);

  if (contentHtml) {
    content = stripHTML(contentHtml);
  }

  return { title, author, published_at, content };
}
