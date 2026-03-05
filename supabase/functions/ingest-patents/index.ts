import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PatentIngestRequest {
  source_endpoint_id: string;
  ingest_run_id: string;
  search_query?: string;
  from_date?: string;
}

interface PatentIngestResponse {
  items_processed: number;
  items_created: number;
  families_identified: number;
  errors: Array<{ patent_number: string; error: string }>;
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

    const { source_endpoint_id, ingest_run_id, search_query, from_date }: PatentIngestRequest = await req.json();

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
    const apiKey = authConfig.api_key || Deno.env.get("PATENT_API_KEY");

    if (!apiKey) {
      throw new Error("Patent API key not configured");
    }

    let items_processed = 0;
    let items_created = 0;
    let families_identified = 0;
    const errors: Array<{ patent_number: string; error: string }> = [];
    const familyClusters = new Map<string, string[]>(); // family_id -> signal_item_ids

    // Example: Using USPTO Patent Examination Data System (PEDS) API
    // In production, this would be replaced with actual patent API integration
    // For now, this is a placeholder structure
    
    const patentApiUrl = endpoint.endpoint_url;
    const queryParams = new URLSearchParams({
      q: search_query || "cannabis OR CBD OR THC",
      ...(from_date && { from: from_date }),
    });

    try {
      const response = await fetch(`${patentApiUrl}?${queryParams}`, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Patent API returned ${response.status}: ${response.statusText}`);
      }

      const patentData = await response.json();
      const patents = patentData.results || patentData.patents || [];

      for (const patent of patents) {
        items_processed++;

        try {
          const applicationNumber = patent.application_number || patent.patentNumber;
          const patentFamilyId = patent.family_id || patent.patent_family_id;
          const title = patent.title || patent.invention_title;
          const abstract = patent.abstract || patent.abstract_text;
          const claims = patent.claims;
          const inventors = patent.inventors || [];
          const assignees = patent.assignees || patent.applicants || [];
          const filingDate = patent.filing_date || patent.application_date;
          const grantDate = patent.grant_date || patent.issue_date;

          if (!applicationNumber || !title) {
            errors.push({ patent_number: applicationNumber || "unknown", error: "Missing required fields" });
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
              item_identifier: applicationNumber,
            });
            continue;
          }

          // Apply license policy
          const licensePolicy = endpoint.sources.license_policy;
          let content_snippet = abstract?.substring(0, 500);

          // Create signal_item
          const { data: signalItem, error: signalError } = await supabaseClient
            .from("signal_items")
            .insert({
              type: "patent",
              title,
              url: `https://patents.google.com/patent/${applicationNumber}`,
              published_at: grantDate || filingDate,
              content_snippet,
            })
            .select()
            .single();

          if (signalError || !signalItem) {
            errors.push({ patent_number: applicationNumber, error: signalError?.message || "Failed to create signal_item" });
            continue;
          }

          // Create patent_item
          await supabaseClient.from("patent_items").insert({
            signal_item_id: signalItem.id,
            application_number: applicationNumber,
            patent_family_id: patentFamilyId,
            abstract,
            claims,
            inventors: inventors.map((i: any) => typeof i === 'string' ? i : i.name),
            assignees: assignees.map((a: any) => typeof a === 'string' ? a : a.name),
            filing_date: filingDate,
            grant_date: grantDate,
          });

          // Create provenance_record
          await supabaseClient.from("provenance_records").insert({
            signal_item_id: signalItem.id,
            source_id: endpoint.source_id,
            source_endpoint_id: endpoint.id,
            ingest_run_id,
            license_policy_applied: licensePolicy,
          });

          // Create fingerprint
          await supabaseClient.from("signal_fingerprints").insert({
            signal_item_id: signalItem.id,
            fingerprint_hash,
          });

          // Track patent family for clustering
          if (patentFamilyId) {
            if (!familyClusters.has(patentFamilyId)) {
              familyClusters.set(patentFamilyId, []);
            }
            familyClusters.get(patentFamilyId)!.push(signalItem.id);
          }

          // Log created event
          await supabaseClient.from("ingest_item_events").insert({
            ingest_run_id,
            signal_item_id: signalItem.id,
            event_type: "created",
            item_identifier: applicationNumber,
          });

          items_created++;

        } catch (patentError) {
          errors.push({ 
            patent_number: patent.application_number || "unknown", 
            error: (patentError as Error).message 
          });
        }
      }

      // Create patent family clusters
      for (const [familyId, signalIds] of familyClusters) {
        if (signalIds.length > 1) {
          families_identified++;

          // Find earliest patent as canonical
          const { data: signals } = await supabaseClient
            .from("signal_items")
            .select("id, published_at")
            .in("id", signalIds)
            .order("published_at", { ascending: true })
            .limit(1);

          const canonicalSignalId = signals?.[0]?.id || signalIds[0];

          // Create cluster
          const { data: cluster } = await supabaseClient
            .from("clusters")
            .insert({
              canonical_signal_id: canonicalSignalId,
              cluster_type: "patent_family",
            })
            .select()
            .single();

          if (cluster) {
            // Create cluster members
            for (const signalId of signalIds) {
              await supabaseClient.from("cluster_members").insert({
                cluster_id: cluster.id,
                signal_item_id: signalId,
                similarity_score: 1.0,
              });
            }
          }
        }
      }

    } catch (apiError) {
      throw new Error(`Patent API error: ${(apiError as Error).message}`);
    }

    const response: PatentIngestResponse = {
      items_processed,
      items_created,
      families_identified,
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
