import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple XML parser for RSS/Atom feeds
function parseXMLTag(xml: string, tagName: string, index = 0): string | null {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi');
  const matches = [...xml.matchAll(regex)];
  if (matches[index]) {
    return matches[index][1].trim();
  }
  return null;
}

function parseXMLAttribute(xml: string, tagName: string, attrName: string): string | null {
  const regex = new RegExp(`<${tagName}[^>]*${attrName}=["']([^"']*)["'][^>]*>`, 'i');
  const match = xml.match(regex);
  return match ? match[1] : null;
}

function parseAllXMLTags(xml: string, tagName: string): string[] {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi');
  const matches = [...xml.matchAll(regex)];
  return matches.map(m => m[1].trim());
}

function parseXMLSelfClosingAttribute(xml: string, tagName: string, attrName: string): string | null {
  // Matches both self-closing and open tags: <tag attr="val" /> or <tag attr="val">
  const regex = new RegExp(`<${tagName}[^>]*?${attrName}=["']([^"']+)["'][^>]*/?>`, 'i');
  const match = xml.match(regex);
  return match ? match[1] : null;
}

function extractImageUrl(itemXml: string, isAtom: boolean): string | null {
  // 1. <media:content url="..." medium="image"> or <media:content url="..." type="image/...">
  const mediaContent = itemXml.match(/<media:content[^>]*url=["']([^"']+)["'][^>]*>/i);
  if (mediaContent) {
    const tag = mediaContent[0];
    const url = mediaContent[1];
    if (tag.includes('medium="image"') || tag.match(/type=["']image\//i) || url.match(/\.(jpe?g|png|gif|webp)/i)) {
      return url;
    }
  }

  // 2. <media:thumbnail url="...">
  const mediaThumbnail = parseXMLSelfClosingAttribute(itemXml, 'media:thumbnail', 'url');
  if (mediaThumbnail) return mediaThumbnail;

  // 3. <enclosure url="..." type="image/...">
  const enclosureMatch = itemXml.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*type=["'](image\/[^"']+)["'][^>]*\/?>/i);
  if (enclosureMatch) return enclosureMatch[1];
  const enclosureReverse = itemXml.match(/<enclosure[^>]*type=["'](image\/[^"']+)["'][^>]*url=["']([^"']+)["'][^>]*\/?>/i);
  if (enclosureReverse) return enclosureReverse[2];

  // 4. <image><url>...</url></image> (RSS channel-level, sometimes per-item)
  const imageUrl = parseXMLTag(itemXml, 'url');
  if (imageUrl && imageUrl.match(/\.(jpe?g|png|gif|webp)/i)) return imageUrl;

  // 5. First <img src="..."> in content:encoded, description, or Atom content
  const contentBlock = parseXMLTag(itemXml, 'content:encoded')
    || parseXMLTag(itemXml, 'description')
    || (isAtom ? parseXMLTag(itemXml, 'content') : null);
  if (contentBlock) {
    const imgMatch = contentBlock.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch) return imgMatch[1];
  }

  return null;
}

function stripCDATA(text: string): string {
  return text.replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim();
}

function stripHTML(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
}

interface RSSIngestRequest {
  source_endpoint_id: string;
  ingest_run_id: string;
  mode: "streaming" | "backfill";
}

interface RSSIngestResponse {
  items_processed: number;
  items_created: number;
  items_duplicate: number;
  errors: Array<{ item_link: string; error: string }>;
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

    const { source_endpoint_id, ingest_run_id, mode }: RSSIngestRequest = await req.json();

    // Fetch endpoint configuration
    const { data: endpoint, error: endpointError } = await supabaseClient
      .from("source_endpoints")
      .select("*, sources(*)")
      .eq("id", source_endpoint_id)
      .single();

    if (endpointError || !endpoint) {
      throw new Error(`Endpoint not found: ${endpointError?.message}`);
    }

    // Fetch RSS feed with proper headers
    const feedResponse = await fetch(endpoint.endpoint_url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Formul8NewsBot/1.0; +https://formul8.ai)",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!feedResponse.ok) {
      throw new Error(`Failed to fetch RSS feed: ${feedResponse.status} ${feedResponse.statusText}`);
    }

    const feedXml = await feedResponse.text();
    
    // Detect feed type (RSS 2.0 or Atom 1.0)
    const isAtom = feedXml.includes('<feed') && feedXml.includes('xmlns="http://www.w3.org/2005/Atom"');
    
    let items_processed = 0;
    let items_created = 0;
    let items_duplicate = 0;
    const errors: Array<{ item_link: string; error: string }> = [];

    // Extract items/entries
    const itemTag = isAtom ? 'entry' : 'item';
    const itemsXml = parseAllXMLTags(feedXml, itemTag);

    for (const itemXml of itemsXml) {
      items_processed++;
      
      try {
        // Extract fields based on feed type
        let title, link, pubDate, author, description, content;
        
        if (isAtom) {
          title = parseXMLTag(itemXml, 'title');
          link = parseXMLAttribute(itemXml, 'link', 'href') || parseXMLTag(itemXml, 'link');
          pubDate = parseXMLTag(itemXml, 'published') || parseXMLTag(itemXml, 'updated');
          author = parseXMLTag(itemXml, 'name'); // Inside <author>
          description = parseXMLTag(itemXml, 'summary');
          content = parseXMLTag(itemXml, 'content') || description;
        } else {
          title = parseXMLTag(itemXml, 'title');
          link = parseXMLTag(itemXml, 'link');
          pubDate = parseXMLTag(itemXml, 'pubDate');
          author = parseXMLTag(itemXml, 'author') || parseXMLTag(itemXml, 'dc:creator');
          description = parseXMLTag(itemXml, 'description');
          content = parseXMLTag(itemXml, 'content:encoded') || description;
        }

        if (title) title = stripCDATA(title);
        if (link) link = stripCDATA(link);

        if (!title || !link) {
          errors.push({ item_link: link || "unknown", error: "Missing required fields (title or link)" });
          continue;
        }

        // Extract feature image from feed item
        const image_url = extractImageUrl(itemXml, isAtom);

        // Compute content fingerprint for deduplication
        const normalizedContent = stripHTML(content || description || "").toLowerCase().trim().replace(/\s+/g, " ");
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
          // Log duplicate event
          await supabaseClient.from("ingest_item_events").insert({
            ingest_run_id,
            signal_item_id: existingFingerprint.signal_item_id,
            event_type: "duplicate",
            item_identifier: link,
          });
          items_duplicate++;
          continue;
        }

        // Apply license policy
        const licensePolicy = endpoint.sources.license_policy;
        let content_snippet = null;
        let content_full = null;

        if (licensePolicy.mode === "store_full_text_allowed") {
          content_full = content || description;
          content_snippet = content_full?.substring(0, 500);
        } else if (licensePolicy.mode === "snippet_only") {
          content_snippet = (content || description)?.substring(0, 500);
        }
        // link_only: store neither content_full nor content_snippet

        // Create signal_item
        const { data: signalItem, error: signalError } = await supabaseClient
          .from("signal_items")
          .insert({
            type: "news",
            title,
            url: link,
            published_at: pubDate ? new Date(pubDate).toISOString() : null,
            content_snippet,
            image_url,
          })
          .select()
          .single();

        if (signalError || !signalItem) {
          errors.push({ item_link: link, error: signalError?.message || "Failed to create signal_item" });
          continue;
        }

        // Create news_item
        const { error: newsError } = await supabaseClient.from("news_items").insert({
          signal_item_id: signalItem.id,
          author,
          source_name: endpoint.sources.name,
          content_full,
        });

        if (newsError) {
          console.error("Failed to create news_item:", newsError);
        }

        // Create provenance_record
        const { error: provError } = await supabaseClient.from("provenance_records").insert({
          signal_item_id: signalItem.id,
          source_id: endpoint.source_id,
          source_endpoint_id: endpoint.id,
          ingest_run_id,
          license_policy_applied: licensePolicy,
        });

        if (provError) {
          console.error("Failed to create provenance_record:", provError);
        }

        // Create fingerprint
        const { error: fpError } = await supabaseClient.from("signal_fingerprints").insert({
          signal_item_id: signalItem.id,
          fingerprint_hash,
        });

        if (fpError) {
          console.error("Failed to create fingerprint:", fpError);
        }

        // Log created event
        const { error: eventError } = await supabaseClient.from("ingest_item_events").insert({
          ingest_run_id,
          signal_item_id: signalItem.id,
          event_type: "created",
          item_identifier: link,
        });

        if (eventError) {
          console.error("Failed to log event:", eventError);
        }

        items_created++;

      } catch (itemError) {
        errors.push({ item_link: "unknown", error: (itemError as Error).message });
      }
    }

    const response: RSSIngestResponse = {
      items_processed,
      items_created,
      items_duplicate,
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
