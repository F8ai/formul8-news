import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExportRequest {
  export_types: Array<"index" | "monthly" | "topics" | "entities">;
}

interface ExportResponse {
  index_generated: boolean;
  monthly_archives: string[];
  topic_feeds: string[];
  entity_feeds: string[];
  errors: Array<{ feed: string; error: string }>;
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

    const { export_types }: ExportRequest = await req.json();

    const errors: Array<{ feed: string; error: string }> = [];
    let index_generated = false;
    const monthly_archives: string[] = [];
    const topic_feeds: string[] = [];
    const entity_feeds: string[] = [];

    // Query policy-compliant signals
    const { data: signals, error: signalsError } = await supabaseClient
      .from("signal_items")
      .select(`
        *,
        provenance_records!inner(
          sources!inner(license_policy)
        )
      `)
      .order("published_at", { ascending: false });

    if (signalsError) {
      throw new Error(`Failed to query signals: ${signalsError.message}`);
    }

    // Filter signals by redistribution policy
    const publicSignals = signals?.filter(signal => {
      const licensePolicy = signal.provenance_records[0]?.sources?.license_policy;
      return licensePolicy?.redistribution_allowed === true;
    }) || [];

    // Generate index.json
    if (export_types.includes("index")) {
      try {
        const indexData = {
          title: "Formul8 Signals Feed",
          description: "Curated news, patents, and scientific literature",
          item_count: publicSignals.length,
          last_updated: new Date().toISOString(),
          feeds: {
            latest: "index.json",
            archives: "archives/",
            topics: "topics/",
            entities: "entities/",
          },
        };

        const { error: uploadError } = await supabaseClient.storage
          .from("public-feeds")
          .upload("index.json", JSON.stringify(indexData, null, 2), {
            contentType: "application/json",
            cacheControl: "3600",
            upsert: true,
          });

        if (uploadError) {
          errors.push({ feed: "index.json", error: uploadError.message });
        } else {
          index_generated = true;
        }
      } catch (indexError) {
        errors.push({ feed: "index.json", error: (indexError as Error).message });
      }
    }

    // Generate monthly archives
    if (export_types.includes("monthly")) {
      const monthlyGroups = new Map<string, typeof publicSignals>();

      for (const signal of publicSignals) {
        if (!signal.published_at) continue;
        const date = new Date(signal.published_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        
        if (!monthlyGroups.has(monthKey)) {
          monthlyGroups.set(monthKey, []);
        }
        monthlyGroups.get(monthKey)!.push(signal);
      }

      for (const [monthKey, monthSignals] of monthlyGroups) {
        try {
          const monthData = {
            month: monthKey,
            item_count: monthSignals.length,
            items: monthSignals.map(s => ({
              id: s.id,
              type: s.type,
              title: s.title,
              url: s.url,
              published_at: s.published_at,
              snippet: s.content_snippet,
              summary: s.summary,
            })),
          };

          const { error: uploadError } = await supabaseClient.storage
            .from("public-feeds")
            .upload(`archives/${monthKey}.json`, JSON.stringify(monthData, null, 2), {
              contentType: "application/json",
              cacheControl: "3600",
              upsert: true,
            });

          if (uploadError) {
            errors.push({ feed: `archives/${monthKey}.json`, error: uploadError.message });
          } else {
            monthly_archives.push(`${monthKey}.json`);
          }
        } catch (monthError) {
          errors.push({ feed: `archives/${monthKey}.json`, error: (monthError as Error).message });
        }
      }
    }

    const response: ExportResponse = {
      index_generated,
      monthly_archives,
      topic_feeds,
      entity_feeds,
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
