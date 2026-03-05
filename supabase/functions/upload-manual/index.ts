import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ManualUploadItem {
  type: "news" | "patent" | "paper";
  data: any;
}

interface ManualUploadRequest {
  items: ManualUploadItem[];
  uploaded_by: string;
}

interface ManualUploadResponse {
  items_accepted: number;
  items_rejected: number;
  errors: Array<{ index: number; error: string }>;
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

    const { items, uploaded_by }: ManualUploadRequest = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("No items provided for upload");
    }

    if (!uploaded_by) {
      throw new Error("uploaded_by field is required");
    }

    // Get or create Manual source
    let { data: manualSource } = await supabaseClient
      .from("sources")
      .select("*")
      .eq("type", "Manual")
      .single();

    if (!manualSource) {
      const { data: newSource, error: sourceError } = await supabaseClient
        .from("sources")
        .insert({
          name: "Manual Upload",
          type: "Manual",
          description: "Manually uploaded signals",
          license_policy: {
            mode: "store_full_text_allowed",
            snippet_length: 500,
            attribution_required: true,
            redistribution_allowed: false,
          },
        })
        .select()
        .single();

      if (sourceError || !newSource) {
        throw new Error(`Failed to create Manual source: ${sourceError?.message}`);
      }
      manualSource = newSource;
    }

    let items_accepted = 0;
    let items_rejected = 0;
    const errors: Array<{ index: number; error: string }> = [];

    // Validate all items first
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      try {
        // Validate type
        if (!["news", "patent", "paper"].includes(item.type)) {
          throw new Error(`Invalid type: ${item.type}`);
        }

        // Validate required fields based on type
        if (item.type === "news") {
          if (!item.data.title || !item.data.url) {
            throw new Error("News items require title and url");
          }
        } else if (item.type === "patent") {
          if (!item.data.title || !item.data.application_number) {
            throw new Error("Patent items require title and application_number");
          }
        } else if (item.type === "paper") {
          if (!item.data.title || (!item.data.doi && !item.data.pmid)) {
            throw new Error("Paper items require title and (doi or pmid)");
          }
        }
      } catch (validationError) {
        errors.push({ index: i, error: (validationError as Error).message });
        items_rejected++;
      }
    }

    // Process valid items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // Skip if already marked as invalid
      if (errors.some(e => e.index === i)) {
        continue;
      }

      try {
        const { type, data } = item;

        // Compute content fingerprint for deduplication
        const contentForHash = type === "news" 
          ? `${data.title} ${data.content || ""}`
          : type === "patent"
          ? `${data.title} ${data.abstract || ""}`
          : `${data.title} ${data.abstract || ""}`;

        const normalizedContent = contentForHash.toLowerCase().trim().replace(/\s+/g, " ");
        const encoder = new TextEncoder();
        const hashData = encoder.encode(normalizedContent);
        const hashBuffer = await crypto.subtle.digest("SHA-256", hashData);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const fingerprint_hash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

        // Check for duplicate
        const { data: existingFingerprint } = await supabaseClient
          .from("signal_fingerprints")
          .select("signal_item_id")
          .eq("fingerprint_hash", fingerprint_hash)
          .single();

        if (existingFingerprint) {
          errors.push({ index: i, error: "Duplicate item already exists" });
          items_rejected++;
          continue;
        }

        // Create signal_item
        const { data: signalItem, error: signalError } = await supabaseClient
          .from("signal_items")
          .insert({
            type,
            title: data.title,
            url: data.url || (data.doi ? `https://doi.org/${data.doi}` : null),
            published_at: data.published_at || data.published_date || new Date().toISOString(),
            content_snippet: (data.content || data.abstract || "").substring(0, 500),
          })
          .select()
          .single();

        if (signalError || !signalItem) {
          throw new Error(`Failed to create signal_item: ${signalError?.message}`);
        }

        // Create type-specific item
        if (type === "news") {
          await supabaseClient.from("news_items").insert({
            signal_item_id: signalItem.id,
            author: data.author,
            source_name: data.source || "Manual Upload",
            content_full: data.content,
          });
        } else if (type === "patent") {
          await supabaseClient.from("patent_items").insert({
            signal_item_id: signalItem.id,
            application_number: data.application_number,
            patent_family_id: data.patent_family_id,
            abstract: data.abstract,
            claims: data.claims,
            inventors: data.inventors || [],
            assignees: data.assignees || [],
            filing_date: data.filing_date,
            grant_date: data.grant_date,
          });
        } else if (type === "paper") {
          await supabaseClient.from("paper_items").insert({
            signal_item_id: signalItem.id,
            doi: data.doi,
            abstract: data.abstract,
            authors: data.authors || [],
            journal: data.journal,
            citation_count: data.citation_count || 0,
            is_open_access: data.is_open_access || false,
          });
        }

        // Create provenance_record
        await supabaseClient.from("provenance_records").insert({
          signal_item_id: signalItem.id,
          source_id: manualSource.id,
          uploaded_by,
          license_policy_applied: manualSource.license_policy,
        });

        // Create fingerprint
        await supabaseClient.from("signal_fingerprints").insert({
          signal_item_id: signalItem.id,
          fingerprint_hash,
        });

        items_accepted++;

      } catch (itemError) {
        errors.push({ index: i, error: (itemError as Error).message });
        items_rejected++;
      }
    }

    const response: ManualUploadResponse = {
      items_accepted,
      items_rejected,
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
