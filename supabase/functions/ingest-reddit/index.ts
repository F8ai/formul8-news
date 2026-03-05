// Reddit scraper for AI and cannabis subreddits
// Uses Reddit's JSON API (no authentication required for public posts)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RedditPost {
  data: {
    id: string;
    title: string;
    selftext: string;
    url: string;
    permalink: string;
    author: string;
    created_utc: number;
    subreddit: string;
    score: number;
    num_comments: number;
    link_flair_text?: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { subreddit, limit = 25, time_filter = 'day' } = await req.json();

    if (!subreddit) {
      throw new Error('subreddit parameter is required');
    }

    console.log(`Fetching posts from r/${subreddit}...`);

    // Fetch from Reddit JSON API
    const redditUrl = `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}&t=${time_filter}`;
    const response = await fetch(redditUrl, {
      headers: {
        'User-Agent': 'Formul8NewsBot/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status}`);
    }

    const data = await response.json();
    const posts: RedditPost[] = data.data.children;

    console.log(`Found ${posts.length} posts from r/${subreddit}`);

    // Get or create Reddit source
    const { data: source, error: sourceError } = await supabaseClient
      .from('sources')
      .select('id')
      .eq('name', `Reddit - r/${subreddit}`)
      .single();

    let sourceId: string;

    if (sourceError || !source) {
      const { data: newSource, error: createError } = await supabaseClient
        .from('sources')
        .insert({
          name: `Reddit - r/${subreddit}`,
          type: 'Reddit',
          description: `Reddit community: r/${subreddit}`,
          license_policy: {
            mode: 'link_only',
            attribution_required: true,
            redistribution_allowed: false
          }
        })
        .select()
        .single();

      if (createError) throw createError;
      sourceId = newSource.id;
    } else {
      sourceId = source.id;
    }

    let processed = 0;
    let skipped = 0;

    for (const post of posts) {
      const postData = post.data;
      
      // Skip removed/deleted posts
      if (postData.selftext === '[removed]' || postData.selftext === '[deleted]') {
        skipped++;
        continue;
      }

      // Create fingerprint
      const fingerprint = await generateFingerprint(postData.title, postData.url);

      // Check if already exists
      const { data: existing } = await supabaseClient
        .from('signal_fingerprints')
        .select('signal_item_id')
        .eq('fingerprint_sha256', fingerprint)
        .single();

      if (existing) {
        skipped++;
        continue;
      }

      // Create signal item
      const { data: signalItem, error: signalError } = await supabaseClient
        .from('signal_items')
        .insert({
          type: 'news',
          title: postData.title,
          url: `https://reddit.com${postData.permalink}`,
          published_at: new Date(postData.created_utc * 1000).toISOString(),
          content_snippet: postData.selftext.substring(0, 500),
          metadata: {
            reddit_id: postData.id,
            subreddit: postData.subreddit,
            author: postData.author,
            score: postData.score,
            num_comments: postData.num_comments,
            flair: postData.link_flair_text
          }
        })
        .select()
        .single();

      if (signalError) {
        console.error('Error creating signal:', signalError);
        continue;
      }

      // Create news item
      await supabaseClient
        .from('news_items')
        .insert({
          signal_item_id: signalItem.id,
          source_name: `r/${postData.subreddit}`,
          author: postData.author
        });

      // Create fingerprint
      await supabaseClient
        .from('signal_fingerprints')
        .insert({
          signal_item_id: signalItem.id,
          fingerprint_sha256: fingerprint,
          fingerprint_type: 'content_hash'
        });

      // Create provenance record
      await supabaseClient
        .from('provenance_records')
        .insert({
          signal_item_id: signalItem.id,
          source_id: sourceId,
          ingestion_timestamp: new Date().toISOString(),
          raw_metadata: {
            reddit_url: redditUrl,
            post_id: postData.id
          }
        });

      processed++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        subreddit,
        processed,
        skipped,
        total: posts.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function generateFingerprint(title: string, url: string): Promise<string> {
  const text = `${title}${url}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
