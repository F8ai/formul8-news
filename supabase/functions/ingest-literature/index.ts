import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Example: Using PubMed/Europe PMC API or similar
    // In production, this would be replaced with actual literature API integration
    
    const literatureApiUrl = endpoint.endpoint_url;
    const queryParams = new URLSearchParams({
      query: search_query || "cannabis OR cannabidiol OR CBD OR THC",
      ...(from_date && { fromDate: from_date }),
      format: "json",
    });

    try {
      const response = await fetch(`${literatureApiUrl}?${queryParams}`, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Literature API returned ${response.status}: ${response.statusText}`);
      }

      const literatureData = await response.json();
      const papers = literatureData.results || literatureData.papers || literatureData.resultList?.result || [];

      for (const paper of papers) {
        items_processed++;

        try {
          const doi = paper.doi || paper.DOI;
          const pmid = paper.pmid || paper.PMID;
          const title = paper.title;
          const abstract = paper.abstract || paper.abstractText;
          const authors = paper.authors || paper.authorList?.author || [];
          const journal = paper.journal || paper.journalTitle;
          const citationCount = paper.citationCount || paper.citedByCount || 0;
          const isOpenAccess = paper.isOpenAccess || paper.open_access || false;
          const publishedDate = paper.publishedDate || paper.pubDate || paper.firstPublicationDate;

          if (!title || (!doi && !pmid)) {
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
          if (isOpenAccess && licensePolicy.mode === "store_full_text_allowed") {
            try {
              const fullTextUrl = paper.fullTextUrl || paper.pdfUrl;
              if (fullTextUrl) {
                const fullTextResponse = await fetch(fullTextUrl);
                if (fullTextResponse.ok) {
                  const fullTextContent = await fullTextResponse.arrayBuffer();
                  const doiHash = doi ? doi.replace(/[^a-zA-Z0-9]/g, "_") : pmid;
                  fullTextPath = `literature/${endpoint.source_id}/${doiHash}/fulltext.pdf`;

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
              console.warn(`Failed to download full text for ${doi}: ${fullTextError}`);
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
            authors: authors.map((a: any) => typeof a === 'string' ? a : a.name || `${a.firstName} ${a.lastName}`),
            journal,
            citation_count: citationCount,
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
