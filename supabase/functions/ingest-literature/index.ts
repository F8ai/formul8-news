import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Parse PubMed XML response
function parsePubMedXML(xmlText: string): any[] {
  const papers: any[] = [];
  
  // Simple XML parsing for PubMed articles
  const articleMatches = xmlText.matchAll(/<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g);
  
  for (const match of articleMatches) {
    const articleXml = match[1];
    
    const pmid = articleXml.match(/<PMID[^>]*>(\d+)<\/PMID>/)?.[1];
    const doi = articleXml.match(/<ArticleId IdType="doi">([^<]+)<\/ArticleId>/)?.[1];
    const title = articleXml.match(/<ArticleTitle>([^<]+)<\/ArticleTitle>/)?.[1];
    const abstractMatch = articleXml.match(/<Abstract>([\s\S]*?)<\/Abstract>/);
    
    let abstract = "";
    if (abstractMatch) {
      const abstractTexts = abstractMatch[1].matchAll(/<AbstractText[^>]*>([^<]+)<\/AbstractText>/g);
      abstract = Array.from(abstractTexts).map(m => m[1]).join(" ");
    }
    
    const journal = articleXml.match(/<Title>([^<]+)<\/Title>/)?.[1];
    const pubDateMatch = articleXml.match(/<PubDate>([\s\S]*?)<\/PubDate>/);
    let publishedDate = null;
    
    if (pubDateMatch) {
      const year = pubDateMatch[1].match(/<Year>(\d{4})<\/Year>/)?.[1];
      const month = pubDateMatch[1].match(/<Month>(\w+|\d+)<\/Month>/)?.[1];
      const day = pubDateMatch[1].match(/<Day>(\d+)<\/Day>/)?.[1];
      
      if (year) {
        const monthNum = month ? (isNaN(Number(month)) ? getMonthNumber(month) : month) : "01";
        const dayNum = day || "01";
        publishedDate = `${year}-${monthNum.toString().padStart(2, "0")}-${dayNum.toString().padStart(2, "0")}`;
      }
    }
    
    const authorMatches = articleXml.matchAll(/<Author[^>]*>([\s\S]*?)<\/Author>/g);
    const authors: string[] = [];
    
    for (const authorMatch of authorMatches) {
      const authorXml = authorMatch[1];
      const lastName = authorXml.match(/<LastName>([^<]+)<\/LastName>/)?.[1];
      const foreName = authorXml.match(/<ForeName>([^<]+)<\/ForeName>/)?.[1];
      
      if (lastName) {
        authors.push(foreName ? `${foreName} ${lastName}` : lastName);
      }
    }
    
    // Check for open access
    const isOpenAccess = articleXml.includes('IdType="pmc"') || articleXml.includes('open access');
    const pmcId = articleXml.match(/<ArticleId IdType="pmc">([^<]+)<\/ArticleId>/)?.[1];
    
    papers.push({
      pmid,
      doi,
      title,
      abstract,
      journal,
      publishedDate,
      authors,
      isOpenAccess,
      pmcId,
    });
  }
  
  return papers;
}
// Parse arXiv Atom feed response
function parseArXivAtom(atomText: string): any[] {
  const papers: any[] = [];

  // Parse arXiv Atom feed entries
  const entryMatches = atomText.matchAll(/<entry>([\s\S]*?)<\/entry>/g);

  for (const match of entryMatches) {
    const entryXml = match[1];

    // Extract arXiv ID from the id field
    const idMatch = entryXml.match(/<id>http:\/\/arxiv\.org\/abs\/([^<]+)<\/id>/);
    const arxivId = idMatch?.[1];

    // Extract DOI if available
    const doiMatch = entryXml.match(/<arxiv:doi[^>]*>([^<]+)<\/arxiv:doi>/);
    const doi = doiMatch?.[1];

    const title = entryXml.match(/<title>([^<]+)<\/title>/)?.[1]?.trim();
    const summary = entryXml.match(/<summary>([^<]+)<\/summary>/)?.[1]?.trim();

    // Extract published date
    const publishedMatch = entryXml.match(/<published>(\d{4}-\d{2}-\d{2})/);
    const publishedDate = publishedMatch?.[1];

    // Extract updated date
    const updatedMatch = entryXml.match(/<updated>(\d{4}-\d{2}-\d{2})/);
    const updatedDate = updatedMatch?.[1];

    // Extract authors
    const authorMatches = entryXml.matchAll(/<author>\s*<name>([^<]+)<\/name>/g);
    const authors: string[] = [];
    for (const authorMatch of authorMatches) {
      authors.push(authorMatch[1].trim());
    }

    // Extract categories
    const categoryMatches = entryXml.matchAll(/<category[^>]+term="([^"]+)"/g);
    const categories: string[] = [];
    for (const catMatch of categoryMatches) {
      categories.push(catMatch[1]);
    }

    // Extract PDF link
    const pdfLinkMatch = entryXml.match(/<link[^>]+title="pdf"[^>]+href="([^"]+)"/);
    const pdfUrl = pdfLinkMatch?.[1];

    papers.push({
      arxivId,
      doi,
      title,
      abstract: summary,
      authors,
      categories,
      publishedDate,
      updatedDate,
      pdfUrl,
      isOpenAccess: true, // All arXiv papers are open access
    });
  }

  return papers;
}

function getMonthNumber(monthName: string): string {
  const months: { [key: string]: string } = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  return months[monthName] || "01";
}

interface LiteratureIngestRequest {
  source_endpoint_id: string;
  ingest_run_id: string;
  search_query?: string;
  from_date?: string;
}

interface LiteratureIngestResponse {
  items_processed: number;
  items_created: number;
  full_text_downloaded: number;
  errors: Array<{ doi: string; error: string }>;
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

    const { source_endpoint_id, ingest_run_id, search_query, from_date }: LiteratureIngestRequest = await req.json();

    // Fetch endpoint configuration
    const { data: endpoint, error: endpointError } = await supabaseClient
      .from("source_endpoints")
      .select("*, sources(*)")
      .eq("id", source_endpoint_id)
      .single();

    if (endpointError || !endpoint) {
      throw new Error(`Endpoint not found: ${endpointError?.message}`);
    }

    // Get API credentials from auth_config (optional for PubMed)
    const authConfig = endpoint.auth_config || {};
    const apiKey = authConfig.api_key || Deno.env.get("LITERATURE_API_KEY") || null;

    let items_processed = 0;
    let items_created = 0;
    let full_text_downloaded = 0;
    const errors: Array<{ doi: string; error: string }> = [];

    const searchQuery = search_query || authConfig.search_query || "(cannabis[Title/Abstract] OR cannabidiol[Title/Abstract] OR CBD[Title/Abstract])";
    const maxResults = authConfig.max_results || 100;
    
    let papers = [];
    
    // Determine API type based on endpoint URL
    const isArXiv = endpoint.endpoint_url.includes('arxiv.org');
    const isPubMed = endpoint.endpoint_url.includes('ncbi.nlm.nih.gov');
    
    if (isArXiv) {
      // arXiv API integration
      const arxivParams = new URLSearchParams({
        search_query: searchQuery,
        max_results: maxResults.toString(),
        sortBy: authConfig.sort_by || 'submittedDate',
        sortOrder: authConfig.sort_order || 'descending',
      });

      const arxivUrl = `${endpoint.endpoint_url}?${arxivParams}`;
      
      try {
        const arxivResponse = await fetch(arxivUrl);
        if (!arxivResponse.ok) {
          throw new Error(`arXiv API failed: ${arxivResponse.status}`);
        }

        const atomText = await arxivResponse.text();
        papers = parseArXivAtom(atomText);

        if (papers.length === 0) {
          console.log("No new arXiv papers found");
          return new Response(JSON.stringify({
            items_processed: 0,
            items_created: 0,
            full_text_downloaded: 0,
            errors: [],
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }

        // Rate limiting: arXiv recommends 3 seconds between requests
        await new Promise(resolve => setTimeout(resolve, 3000));

      } catch (apiError) {
        throw new Error(`arXiv API error: ${(apiError as Error).message}`);
      }
      
    } else if (isPubMed) {
      // PubMed E-utilities API integration
      // Step 1: Search PubMed for article IDs
      const searchParams = new URLSearchParams({
        db: "pubmed",
        term: searchQuery,
        retmax: maxResults.toString(),
        retmode: "json",
        sort: "pub_date",
        ...(apiKey && { api_key: apiKey }),
        ...(from_date && { mindate: from_date.replace(/-/g, "/"), maxdate: new Date().toISOString().split("T")[0].replace(/-/g, "/") }),
      });

      const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?${searchParams}`;
      
      try {
        const searchResponse = await fetch(searchUrl);
        if (!searchResponse.ok) {
          throw new Error(`PubMed search failed: ${searchResponse.status}`);
        }

        const searchData = await searchResponse.json();
        const pmids = searchData.esearchresult?.idlist || [];

        if (pmids.length === 0) {
          console.log("No new articles found");
          return new Response(JSON.stringify({
            items_processed: 0,
            items_created: 0,
            full_text_downloaded: 0,
            errors: [],
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }

        // Step 2: Fetch article details in batches
        const batchSize = 200;

        for (let i = 0; i < pmids.length; i += batchSize) {
          const batchPmids = pmids.slice(i, i + batchSize);
          const fetchParams = new URLSearchParams({
            db: "pubmed",
            id: batchPmids.join(","),
            retmode: "xml",
            ...(apiKey && { api_key: apiKey }),
          });

          const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?${fetchParams}`;
          const fetchResponse = await fetch(fetchUrl);
          
          if (!fetchResponse.ok) {
            console.warn(`Failed to fetch batch starting at ${i}`);
            continue;
          }

          const xmlText = await fetchResponse.text();
          const parsedPapers = parsePubMedXML(xmlText);
          papers.push(...parsedPapers);

          // Rate limiting: wait 0.34s between requests (max 3 requests/second without API key)
          if (i + batchSize < pmids.length) {
            await new Promise(resolve => setTimeout(resolve, apiKey ? 100 : 340));
          }
        }

      } catch (apiError) {
        throw new Error(`PubMed API error: ${(apiError as Error).message}`);
      }
    } else {
      throw new Error(`Unsupported literature API: ${endpoint.endpoint_url}`);
    }

    // Process papers (common for both arXiv and PubMed)
    for (const paper of papers) {
      items_processed++;

      try {
        // Handle both arXiv and PubMed paper formats
        const { doi, pmid, arxivId, title, abstract, authors, journal, categories, publishedDate, isOpenAccess, pmcId, pdfUrl } = paper;
        const itemId = arxivId || pmid || doi;

        if (!title || !itemId) {
          errors.push({ doi: itemId || "unknown", error: "Missing required fields" });
          continue;
        }

          // Compute content fingerprint for deduplication
          const normalizedContent = `${title} ${abstract}`.toLowerCase().trim().replace(/\s+/g, " ");
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
            await supabaseClient.from("ingest_item_events").insert({
              ingest_run_id,
              signal_item_id: existingFingerprint.signal_item_id,
              event_type: "duplicate",
              item_identifier: itemId,
            });
            continue;
          }

        // Apply license policy
        const licensePolicy = endpoint.sources.license_policy;
        let content_snippet = abstract?.substring(0, licensePolicy.snippet_length || 500);
        let fullTextPath = null;

        // Download full text if open access and policy allows
        if (isOpenAccess && licensePolicy.mode === "store_full_text_allowed") {
          try {
            let fullTextUrl = null;
            let itemHash = null;
            
            // Determine full text URL based on source
            if (pdfUrl) {
              // arXiv PDF
              fullTextUrl = pdfUrl;
              itemHash = arxivId?.replace(/[^a-zA-Z0-9]/g, "_");
            } else if (pmcId) {
              // PubMed Central full text
              fullTextUrl = `https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcId}/pdf/`;
              itemHash = pmid?.replace(/[^a-zA-Z0-9]/g, "_");
            }
            
            if (fullTextUrl && itemHash) {
              const fullTextResponse = await fetch(fullTextUrl);
              
              if (fullTextResponse.ok) {
                const fullTextContent = await fullTextResponse.arrayBuffer();
                fullTextPath = `literature/${endpoint.source_id}/${itemHash}/fulltext.pdf`;

                await supabaseClient.storage
                  .from("raw-artifacts")
                  .upload(fullTextPath, fullTextContent, {
                    contentType: "application/pdf",
                    upsert: true,
                  });

                full_text_downloaded++;
              }
            }
          } catch (fullTextError) {
            console.warn(`Failed to download full text for ${itemId}: ${fullTextError}`);
          }
        }

        // Create signal_item
        const paperUrl = arxivId 
          ? `https://arxiv.org/abs/${arxivId}`
          : doi 
            ? `https://doi.org/${doi}` 
            : `https://pubmed.ncbi.nlm.nih.gov/${pmid}`;
            
        const { data: signalItem, error: signalError } = await supabaseClient
          .from("signal_items")
          .insert({
            type: "paper",
            title,
            url: paperUrl,
            published_at: publishedDate,
              content_snippet,
            })
            .select()
            .single();

          if (signalError || !signalItem) {
            errors.push({ doi: doi || pmid, error: signalError?.message || "Failed to create signal_item" });
            continue;
          }

          // Create paper_item with arXiv-specific fields
          const paperData: any = {
            signal_item_id: signalItem.id,
            doi,
            abstract,
            authors: authors || [],
            journal: journal || (categories ? `arXiv:${categories[0]}` : null),
            citation_count: 0,
            is_open_access: isOpenAccess,
          };
          
          // Add arXiv-specific fields if present
          if (arxivId) {
            paperData.arxiv_id = arxivId;
            paperData.arxiv_categories = categories || [];
          }
          
          await supabaseClient.from("paper_items").insert(paperData);

          // Create provenance_record
          await supabaseClient.from("provenance_records").insert({
            signal_item_id: signalItem.id,
            source_id: endpoint.source_id,
            source_endpoint_id: endpoint.id,
            ingest_run_id,
            raw_artifact_path: fullTextPath,
            license_policy_applied: licensePolicy,
          });

          // Create fingerprint
          await supabaseClient.from("signal_fingerprints").insert({
            signal_item_id: signalItem.id,
            fingerprint_hash,
          });

        // Log created event
        await supabaseClient.from("ingest_item_events").insert({
          ingest_run_id,
          signal_item_id: signalItem.id,
          event_type: "created",
          item_identifier: itemId,
        });

        items_created++;

      } catch (paperError) {
        errors.push({ 
          doi: paper.doi || paper.pmid || paper.arxivId || "unknown", 
          error: (paperError as Error).message 
        });
      }
    }

    const response: LiteratureIngestResponse = {
      items_processed,
      items_created,
      full_text_downloaded,
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
