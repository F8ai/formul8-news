import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrchestratorRequest {
  source_endpoint_id?: string;
  mode: "streaming" | "backfill";
}

interface OrchestratorResponse {
  ingest_run_id: string;
  status: "started" | "completed" | "failed";
  endpoints_processed: number;
  items_created: number;
  items_skipped: number;
  errors: Array<{ endpoint_id: string; error: string }>;
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

    const { source_endpoint_id, mode }: OrchestratorRequest = await req.json();

    // Query active endpoints
    let query = supabaseClient
      .from("source_endpoints")
      .select("*, sources(*)")
      .eq("is_active", true);

    if (source_endpoint_id) {
      query = query.eq("id", source_endpoint_id);
    }

    const { data: endpoints, error: endpointsError } = await query;

    if (endpointsError) {
      throw new Error(`Failed to query endpoints: ${endpointsError.message}`);
    }

    if (!endpoints || endpoints.length === 0) {
      throw new Error("No active endpoints found");
    }

    const errors: Array<{ endpoint_id: string; error: string }> = [];
    let totalItemsCreated = 0;
    let totalItemsSkipped = 0;

    // Process each endpoint
    for (const endpoint of endpoints) {
      try {
        // Check for concurrent runs
        const { data: activeRuns } = await supabaseClient
          .from("ingest_runs")
          .select("id")
          .eq("source_endpoint_id", endpoint.id)
          .in("status", ["started", "in_progress"])
          .limit(1);

        if (activeRuns && activeRuns.length > 0) {
          console.warn(`Skipping endpoint ${endpoint.id}: concurrent run in progress`);
          continue;
        }

        // Create ingest_run
        const { data: ingestRun, error: runError } = await supabaseClient
          .from("ingest_runs")
          .insert({
            source_endpoint_id: endpoint.id,
            mode,
            status: "started",
          })
          .select()
          .single();

        if (runError || !ingestRun) {
          errors.push({ endpoint_id: endpoint.id, error: runError?.message || "Failed to create ingest_run" });
          continue;
        }

        // Invoke appropriate connector based on source type
        let connectorUrl = "";
        const baseUrl = Deno.env.get("SUPABASE_URL") ?? "";

        switch (endpoint.sources.type) {
          case "RSS":
            connectorUrl = `${baseUrl}/functions/v1/ingest-rss`;
            break;
          case "News_API":
            connectorUrl = `${baseUrl}/functions/v1/ingest-news-api`;
            break;
          case "Patent_API":
            connectorUrl = `${baseUrl}/functions/v1/ingest-patents`;
            break;
          case "Literature_API":
            connectorUrl = `${baseUrl}/functions/v1/ingest-literature`;
            break;
          default:
            errors.push({ endpoint_id: endpoint.id, error: `Unsupported source type: ${endpoint.sources.type}` });
            continue;
        }

        // Call connector with retry logic
        let connectorResponse;
        let retryCount = 0;
        const maxRetries = 3;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

        while (retryCount < maxRetries) {
          try {
            connectorResponse = await fetch(connectorUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${serviceRoleKey}`,
                "apikey": serviceRoleKey,
              },
              body: JSON.stringify({
                source_endpoint_id: endpoint.id,
                ingest_run_id: ingestRun.id,
                mode,
              }),
            });

            if (connectorResponse.ok) {
              break;
            }

            // Check for rate limiting
            if (connectorResponse.status === 429) {
              const retryAfter = connectorResponse.headers.get("Retry-After");
              const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, retryCount) * 1000;
              await new Promise(resolve => setTimeout(resolve, waitTime));
            } else {
              throw new Error(`Connector returned ${connectorResponse.status}: ${connectorResponse.statusText}`);
            }
          } catch (fetchError) {
            if (retryCount === maxRetries - 1) {
              throw fetchError;
            }
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
          }
          retryCount++;
        }

        if (!connectorResponse || !connectorResponse.ok) {
          throw new Error("Connector failed after retries");
        }

        const connectorResult = await connectorResponse.json();

        // Update ingest_run with results
        await supabaseClient
          .from("ingest_runs")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            items_processed: connectorResult.items_processed || 0,
            items_created: connectorResult.items_created || 0,
            items_duplicate: connectorResult.items_duplicate || 0,
            items_error: connectorResult.errors?.length || 0,
          })
          .eq("id", ingestRun.id);

        // Update endpoint last_ingested_at
        await supabaseClient
          .from("source_endpoints")
          .update({ last_ingested_at: new Date().toISOString() })
          .eq("id", endpoint.id);

        totalItemsCreated += connectorResult.items_created || 0;
        totalItemsSkipped += connectorResult.items_duplicate || 0;

      } catch (endpointError) {
        errors.push({ endpoint_id: endpoint.id, error: (endpointError as Error).message });
      }
    }

    const response: OrchestratorResponse = {
      ingest_run_id: "multiple",
      status: errors.length === 0 ? "completed" : errors.length < endpoints.length ? "completed" : "failed",
      endpoints_processed: endpoints.length,
      items_created: totalItemsCreated,
      items_skipped: totalItemsSkipped,
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
