import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EnrichRequest {
  batch_size?: number;
  signal_ids?: string[];
}

interface EnrichResponse {
  signals_processed: number;
  language_detected: number;
  topics_extracted: number;
  entities_extracted: number;
  summaries_generated: number;
  embeddings_computed: number;
  clusters_created: number;
  errors: Array<{ signal_id: string; error: string }>;
}

// Language detection using simple heuristics (in production, use a proper library)
function detectLanguage(text: string): { code: string; confidence: number } {
  const lowerText = text.toLowerCase();
  
  // Simple keyword-based detection
  const englishWords = ["the", "and", "is", "in", "to", "of", "a", "for"];
  const spanishWords = ["el", "la", "de", "que", "y", "en", "un", "por"];
  const frenchWords = ["le", "de", "un", "et", "est", "pour", "dans", "ce"];
  
  let englishCount = 0;
  let spanishCount = 0;
  let frenchCount = 0;
  
  for (const word of englishWords) {
    if (lowerText.includes(` ${word} `)) englishCount++;
  }
  for (const word of spanishWords) {
    if (lowerText.includes(` ${word} `)) spanishCount++;
  }
  for (const word of frenchWords) {
    if (lowerText.includes(` ${word} `)) frenchCount++;
  }
  
  const total = englishCount + spanishCount + frenchCount;
  if (total === 0) return { code: "unknown", confidence: 0 };
  
  if (englishCount > spanishCount && englishCount > frenchCount) {
    return { code: "en", confidence: englishCount / total };
  } else if (spanishCount > englishCount && spanishCount > frenchCount) {
    return { code: "es", confidence: spanishCount / total };
  } else if (frenchCount > englishCount && frenchCount > spanishCount) {
    return { code: "fr", confidence: frenchCount / total };
  }
  
  return { code: "en", confidence: 0.5 }; // Default to English
}

// Topic extraction using keyword matching
function extractTopics(title: string, content: string): Array<{ slug: string; confidence: number }> {
  const text = `${title} ${content}`.toLowerCase();
  const topics: Array<{ slug: string; confidence: number }> = [];
  
  const topicKeywords: Record<string, string[]> = {
    // Cannabis topics
    "Cannabis": ["cannabis", "marijuana", "weed", "hemp"],
    "CBD": ["cbd", "cannabidiol"],
    "THC": ["thc", "tetrahydrocannabinol"],
    "Medical Cannabis": ["medical marijuana", "medical cannabis", "therapeutic", "patient"],
    "Cannabis Regulation": ["regulation", "legal", "law", "policy", "compliance", "fda", "dea"],
    "Cannabis Cultivation": ["cultivation", "growing", "farm", "harvest", "grow"],
    "Cannabis Research": ["research", "study", "clinical", "trial", "science"],
    "Psychedelics": ["psychedelic", "psilocybin", "lsd", "mdma"],
    "Cannabis Business": ["business", "market", "sales", "revenue", "company", "startup"],
    "Cannabis Finance": ["investment", "funding", "ipo", "stock", "investor"],
    
    // AI topics
    "Artificial Intelligence": ["artificial intelligence", "ai", "machine learning", "ml", "deep learning"],
    "Large Language Models": ["llm", "gpt", "claude", "llama", "language model", "chatgpt", "gemini"],
    "Computer Vision": ["computer vision", "image recognition", "object detection", "dall-e", "midjourney", "stable diffusion"],
    "Machine Learning": ["machine learning", "ml", "neural network", "training", "model"],
    "AI Tools": ["ai tool", "ai platform", "langchain", "hugging face", "pytorch", "tensorflow"],
    "AI Models": ["ai model", "model release", "open source model", "foundation model"],
    "AI Research": ["ai research", "paper", "arxiv", "conference", "neurips", "icml"],
    "AI Ethics": ["ai ethics", "ai safety", "alignment", "bias", "fairness", "responsible ai"],
    "AI Business": ["ai startup", "ai company", "ai funding", "ai market", "ai adoption"],
    "Generative AI": ["generative ai", "text generation", "image generation", "video generation", "synthesis"],
    "AI Infrastructure": ["gpu", "cloud computing", "inference", "training infrastructure", "nvidia", "compute"],
    
    // General topics
    "Healthcare": ["health", "medical", "medicine", "doctor", "hospital"],
    "Technology": ["technology", "tech", "software", "hardware"],
  };
  
  for (const [slug, keywords] of Object.entries(topicKeywords)) {
    let matchCount = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword)) matchCount++;
    }
    if (matchCount > 0) {
      topics.push({ slug, confidence: Math.min(matchCount / keywords.length, 1.0) });
    }
  }
  
  return topics;
}

// Entity extraction using simple pattern matching
function extractEntities(text: string): Array<{ name: string; type: string }> {
  const entities: Array<{ name: string; type: string }> = [];
  
  // Cannabis-specific entities
  const cannabinoids = ["CBD", "THC", "CBG", "CBN", "THCV", "CBC"];
  const terpenes = ["myrcene", "limonene", "pinene", "linalool", "caryophyllene"];
  const regulators = ["FDA", "DEA", "USDA", "state cannabis board"];
  
  // AI-specific entities
  const aiModels = ["GPT-4", "GPT-3", "Claude", "Llama", "Gemini", "DALL-E", "Midjourney", "Stable Diffusion"];
  const aiCompanies = ["OpenAI", "Anthropic", "Google", "Meta", "Microsoft", "Hugging Face", "Cohere"];
  const aiTools = ["LangChain", "PyTorch", "TensorFlow", "Keras", "Transformers"];
  
  for (const cannabinoid of cannabinoids) {
    if (text.includes(cannabinoid)) {
      entities.push({ name: cannabinoid, type: "cannabinoid" });
    }
  }
  
  for (const terpene of terpenes) {
    if (text.toLowerCase().includes(terpene.toLowerCase())) {
      entities.push({ name: terpene, type: "terpene" });
    }
  }
  
  for (const regulator of regulators) {
    if (text.includes(regulator)) {
      entities.push({ name: regulator, type: "regulator" });
    }
  }
  
  for (const model of aiModels) {
    if (text.includes(model)) {
      entities.push({ name: model, type: "ai_model" });
    }
  }
  
  for (const company of aiCompanies) {
    if (text.includes(company)) {
      entities.push({ name: company, type: "ai_company" });
    }
  }
  
  for (const tool of aiTools) {
    if (text.includes(tool)) {
      entities.push({ name: tool, type: "ai_tool" });
    }
  }
  
  // Simple capitalized word detection for organizations/companies
  const words = text.split(/\s+/);
  for (let i = 0; i < words.length - 1; i++) {
    if (/^[A-Z][a-z]+$/.test(words[i]) && /^[A-Z][a-z]+$/.test(words[i + 1])) {
      const name = `${words[i]} ${words[i + 1]}`;
      if (name.length > 5) {
        entities.push({ name, type: "organization" });
      }
    }
  }
  
  return entities;
}

// Generate summary (simple truncation for now)
function generateSummary(content: string): string {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length === 0) return "";
  
  let summary = sentences[0].trim();
  if (sentences.length > 1 && summary.length < 150) {
    summary += ". " + sentences[1].trim();
  }
  
  return summary.substring(0, 200);
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

    const { batch_size = 50, signal_ids }: EnrichRequest = await req.json();

    // Query unenriched signals
    let query = supabaseClient
      .from("signal_items")
      .select("*, news_items(*), patent_items(*), paper_items(*)")
      .eq("enrichment_status", "pending")
      .limit(batch_size);

    if (signal_ids && signal_ids.length > 0) {
      query = query.in("id", signal_ids);
    }

    const { data: signals, error: signalsError } = await query;

    if (signalsError) {
      throw new Error(`Failed to query signals: ${signalsError.message}`);
    }

    if (!signals || signals.length === 0) {
      return new Response(JSON.stringify({
        signals_processed: 0,
        language_detected: 0,
        topics_extracted: 0,
        entities_extracted: 0,
        summaries_generated: 0,
        embeddings_computed: 0,
        clusters_created: 0,
        errors: [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    let signals_processed = 0;
    let language_detected = 0;
    let topics_extracted = 0;
    let entities_extracted = 0;
    let summaries_generated = 0;
    let embeddings_computed = 0;
    const errors: Array<{ signal_id: string; error: string }> = [];

    // Get all topics for mapping
    const { data: allTopics } = await supabaseClient
      .from("topics")
      .select("id, slug");
    
    const topicMap = new Map(allTopics?.map(t => [t.slug, t.id]) || []);

    for (const signal of signals) {
      try {
        // Update status to in_progress
        await supabaseClient
          .from("signal_items")
          .update({ enrichment_status: "in_progress" })
          .eq("id", signal.id);

        // Get content for enrichment
        let content = signal.content_snippet || "";
        if (signal.type === "news" && signal.news_items?.[0]?.content_full) {
          content = signal.news_items[0].content_full;
        } else if (signal.type === "patent" && signal.patent_items?.[0]?.abstract) {
          content = signal.patent_items[0].abstract;
        } else if (signal.type === "paper" && signal.paper_items?.[0]?.abstract) {
          content = signal.paper_items[0].abstract;
        }

        const fullText = `${signal.title} ${content}`;

        // 1. Language detection
        const langResult = detectLanguage(fullText);
        if (langResult.confidence >= 0.8) {
          await supabaseClient
            .from("signal_items")
            .update({
              language_code: langResult.code,
              language_confidence: langResult.confidence,
            })
            .eq("id", signal.id);
          language_detected++;
        } else {
          await supabaseClient
            .from("signal_items")
            .update({
              language_code: "unknown",
              language_confidence: langResult.confidence,
            })
            .eq("id", signal.id);
        }

        // 2. Topic extraction
        const extractedTopics = extractTopics(signal.title, content);
        for (const topic of extractedTopics) {
          const topicId = topicMap.get(topic.slug);
          if (topicId) {
            await supabaseClient
              .from("signal_topics")
              .upsert({
                signal_item_id: signal.id,
                topic_id: topicId,
                confidence: topic.confidence,
                assigned_by: "rule",
              }, { onConflict: "signal_item_id,topic_id" });
            topics_extracted++;
          }
        }

        // 3. Entity extraction
        const extractedEntities = extractEntities(fullText);
        for (const entity of extractedEntities) {
          // Get or create entity
          const canonicalName = entity.name.toLowerCase().trim();
          let { data: existingEntity } = await supabaseClient
            .from("entities")
            .select("id")
            .eq("canonical_name", canonicalName)
            .eq("entity_type", entity.type)
            .single();

          if (!existingEntity) {
            const { data: newEntity } = await supabaseClient
              .from("entities")
              .insert({
                name: entity.name,
                canonical_name: canonicalName,
                entity_type: entity.type,
              })
              .select()
              .single();
            existingEntity = newEntity;
          }

          if (existingEntity) {
            await supabaseClient
              .from("signal_entities")
              .upsert({
                signal_item_id: signal.id,
                entity_id: existingEntity.id,
                mention_count: 1,
              }, { onConflict: "signal_item_id,entity_id" });
            entities_extracted++;
          }
        }

        // 4. Summary generation
        if (content.length > 1000) {
          const summary = generateSummary(content);
          await supabaseClient
            .from("signal_items")
            .update({ summary })
            .eq("id", signal.id);
          summaries_generated++;
        }

        // 5. Embeddings (placeholder - would use OpenAI API in production)
        // Skip for now as it requires API key

        // Mark as completed
        await supabaseClient
          .from("signal_items")
          .update({
            enrichment_status: "completed",
            enriched_at: new Date().toISOString(),
          })
          .eq("id", signal.id);

        signals_processed++;

      } catch (signalError) {
        errors.push({ signal_id: signal.id, error: (signalError as Error).message });
        
        // Mark as failed
        await supabaseClient
          .from("signal_items")
          .update({ enrichment_status: "failed" })
          .eq("id", signal.id);
      }
    }

    const response: EnrichResponse = {
      signals_processed,
      language_detected,
      topics_extracted,
      entities_extracted,
      summaries_generated,
      embeddings_computed,
      clusters_created: 0,
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
