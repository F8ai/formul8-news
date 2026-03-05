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

    // Get API credentials from auth_config
    const authConfig = endpoint.auth_config || {};
    const apiKey = authConfig.api_key || Deno.env.get("LITERATURE_API_KEY");

    if (!apiKey) {
      throw new Error("Literature API key not configured");
    }

    let items_processed = 0;
    let items_created = 0;
    let full_text_downloaded = 0;
    const errors: Array<{ doi: string; error: string }> = [];

    // PubMed E-utilities API integration
    const searchQuery = search_query || authConfig.search_query || "(cannabis[Title/Abstract] OR cannabidiol[Title/Abstract] OR CBD[Title/Abstract])";
    const maxResults = authConfig.max_results || 100;
    
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
      const papers = [];

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

      for (const paper of papers) {
        items_processed++;

        try {
          const { doi, pmid, title, abstract, authors, journal, publishedDate, isOpenAccess, pmcId } = paper;

          if (!title || !pmid) {
            errors.push({ doi: doi || pmid || "unknown", error: "Missing required fields" });
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
              item_identifier: doi || pmid,
            });
            continue;
          }

          // Apply license policy
          const licensePolicy = endpoint.sources.license_policy;
          let content_snippet = abstract?.substring(0, 500);
          let fullTextPath = null;

          // Download full text if open access and policy allows
          if (isOpenAccess && pmcId && licensePolicy.mode === "store_full_text_allowed") {
            try {
              // PubMed Central full text URL
              const fullTextUrl = `https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcId}/pdf/`;
              const fullTextResponse = await fetch(fullTextUrl);
              
              if (fullTextResponse.ok) {
                const fullTextContent = await fullTextResponse.arrayBuffer();
                const pmidHash = pmid.replace(/[^a-zA-Z0-9]/g, "_");
                fullTextPath = `literature/${endpoint.source_id}/${pmidHash}/fulltext.pdf`;

                await supabaseClient.storage
                  .from("raw-artifacts")
                  .upload(fullTextPath, fullTextContent, {
                    contentType: "application/pdf",
                    upsert: true,
                  });

                full_text_downloaded++;
              }
            } catch (fullTextError) {
              console.warn(`Failed to download full text for PMID ${pmid}: ${fullTextError}`);
            }
          }

          // Create signal_item
          const { data: signalItem, error: signalError } = await supabaseClient
            .from("signal_items")
            .insert({
              type: "paper",
              title,
              url: doi ? `https://doi.org/${doi}` : `https://pubmed.ncbi.nlm.nih.gov/${pmid}`,
              published_at: publishedDate,
              content_snippet,
            })
            .select()
            .single();

          if (signalError || !signalItem) {
            errors.push({ doi: doi || pmid, error: signalError?.message || "Failed to create signal_item" });
            continue;
          }

          // Create paper_item
          await supabaseClient.from("paper_items").insert({
            signal_item_id: signalItem.id,
            doi,
            abstract,
            authors: authors || [],
            journal,
            citation_count: 0, // PubMed doesn't provide citation counts directly
            is_open_access: isOpenAccess,
          });

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
            item_identifier: doi || pmid,
          });

          items_created++;

        } catch (paperError) {
          errors.push({ 
            doi: paper.doi || paper.pmid || "unknown", 
            error: (paperError as Error).message 
          });
        }
      }

    } catch (apiError) {
      throw new Error(`Literature API error: ${(apiError as Error).message}`);
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
