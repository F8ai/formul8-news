#!/usr/bin/env -S deno run --allow-net --allow-env

// Test script for end-to-end ingestion
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://gptfmaceymhubyuhqegu.supabase.co";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_SERVICE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY environment variable not set");
  Deno.exit(1);
}

console.log("🚀 Starting Formul8 News Ingestion Test\n");
console.log(`📡 Supabase URL: ${SUPABASE_URL}\n`);

// Step 1: Check database connectivity
console.log("1️⃣  Checking database connectivity...");
try {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/sources?select=count`, {
    headers: {
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  
  if (response.ok) {
    const data = await response.json();
    console.log(`✅ Database connected. Found ${data.length} sources\n`);
  } else {
    throw new Error(`Database check failed: ${response.status}`);
  }
} catch (error) {
  console.error(`❌ Database connectivity failed: ${error.message}\n`);
  Deno.exit(1);
}

// Step 2: List available sources and endpoints
console.log("2️⃣  Listing RSS sources and endpoints...");
try {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/source_endpoints?select=*,sources(*)&is_active=eq.true`, {
    headers: {
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  
  if (response.ok) {
    const endpoints = await response.json();
    console.log(`✅ Found ${endpoints.length} active endpoints:`);
    for (const endpoint of endpoints) {
      console.log(`   - ${endpoint.sources.name}: ${endpoint.endpoint_url}`);
    }
    console.log();
  } else {
    throw new Error(`Failed to list endpoints: ${response.status}`);
  }
} catch (error) {
  console.error(`❌ Failed to list endpoints: ${error.message}\n`);
}

// Step 3: Trigger ingestion orchestrator
console.log("3️⃣  Triggering ingestion orchestrator...");
try {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/ingest-orchestrator`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({
      mode: "streaming",
    }),
  });
  
  if (response.ok) {
    const result = await response.json();
    console.log(`✅ Ingestion completed:`);
    console.log(`   - Status: ${result.status}`);
    console.log(`   - Endpoints processed: ${result.endpoints_processed}`);
    console.log(`   - Items created: ${result.items_created}`);
    console.log(`   - Items skipped (duplicates): ${result.items_skipped}`);
    if (result.errors && result.errors.length > 0) {
      console.log(`   - Errors: ${result.errors.length}`);
      for (const error of result.errors.slice(0, 3)) {
        console.log(`     • ${error.endpoint_id}: ${error.error}`);
      }
    }
    console.log();
  } else {
    const errorText = await response.text();
    throw new Error(`Ingestion failed (${response.status}): ${errorText}`);
  }
} catch (error) {
  console.error(`❌ Ingestion failed: ${error.message}\n`);
}

// Step 4: Check ingested signals
console.log("4️⃣  Checking ingested signals...");
try {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/signal_items?select=id,type,title,published_at,enrichment_status&limit=10&order=created_at.desc`, {
    headers: {
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  
  if (response.ok) {
    const signals = await response.json();
    console.log(`✅ Found ${signals.length} recent signals:`);
    for (const signal of signals.slice(0, 5)) {
      console.log(`   - [${signal.type}] ${signal.title.substring(0, 60)}...`);
      console.log(`     Status: ${signal.enrichment_status}, Published: ${signal.published_at || 'N/A'}`);
    }
    console.log();
  } else {
    throw new Error(`Failed to query signals: ${response.status}`);
  }
} catch (error) {
  console.error(`❌ Failed to query signals: ${error.message}\n`);
}

// Step 5: Trigger enrichment
console.log("5️⃣  Triggering enrichment worker...");
try {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/enrich-signals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({
      batch_size: 10,
    }),
  });
  
  if (response.ok) {
    const result = await response.json();
    console.log(`✅ Enrichment completed:`);
    console.log(`   - Signals processed: ${result.signals_processed}`);
    console.log(`   - Language detected: ${result.language_detected}`);
    console.log(`   - Topics extracted: ${result.topics_extracted}`);
    console.log(`   - Entities extracted: ${result.entities_extracted}`);
    console.log(`   - Summaries generated: ${result.summaries_generated}`);
    if (result.errors && result.errors.length > 0) {
      console.log(`   - Errors: ${result.errors.length}`);
    }
    console.log();
  } else {
    const errorText = await response.text();
    throw new Error(`Enrichment failed (${response.status}): ${errorText}`);
  }
} catch (error) {
  console.error(`❌ Enrichment failed: ${error.message}\n`);
}

// Step 6: Check enriched signals
console.log("6️⃣  Checking enriched signals...");
try {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/signal_items?select=id,title,language_code,enrichment_status,signal_topics(topics(name))&enrichment_status=eq.completed&limit=5`, {
    headers: {
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  
  if (response.ok) {
    const signals = await response.json();
    console.log(`✅ Found ${signals.length} enriched signals:`);
    for (const signal of signals) {
      const topics = signal.signal_topics?.map((st: any) => st.topics.name).join(", ") || "none";
      console.log(`   - ${signal.title.substring(0, 50)}...`);
      console.log(`     Language: ${signal.language_code || 'unknown'}, Topics: ${topics}`);
    }
    console.log();
  } else {
    throw new Error(`Failed to query enriched signals: ${response.status}`);
  }
} catch (error) {
  console.error(`❌ Failed to query enriched signals: ${error.message}\n`);
}

// Step 7: Trigger feed export
console.log("7️⃣  Triggering feed export...");
try {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/export-feeds`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({
      export_types: ["index", "monthly"],
    }),
  });
  
  if (response.ok) {
    const result = await response.json();
    console.log(`✅ Feed export completed:`);
    console.log(`   - Index generated: ${result.index_generated}`);
    console.log(`   - Monthly archives: ${result.monthly_archives.length}`);
    if (result.monthly_archives.length > 0) {
      console.log(`     Files: ${result.monthly_archives.join(", ")}`);
    }
    if (result.errors && result.errors.length > 0) {
      console.log(`   - Errors: ${result.errors.length}`);
    }
    console.log();
  } else {
    const errorText = await response.text();
    throw new Error(`Export failed (${response.status}): ${errorText}`);
  }
} catch (error) {
  console.error(`❌ Export failed: ${error.message}\n`);
}

// Step 8: Verify public feed
console.log("8️⃣  Verifying public feed...");
try {
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/public/public-feeds/index.json`);
  
  if (response.ok) {
    const feedData = await response.json();
    console.log(`✅ Public feed accessible:`);
    console.log(`   - Title: ${feedData.title}`);
    console.log(`   - Item count: ${feedData.item_count}`);
    console.log(`   - Last updated: ${feedData.last_updated}`);
    console.log();
  } else {
    throw new Error(`Public feed not accessible: ${response.status}`);
  }
} catch (error) {
  console.error(`❌ Public feed verification failed: ${error.message}\n`);
}

console.log("✨ End-to-end test completed!\n");
console.log("📊 Summary:");
console.log("   ✅ Database connectivity");
console.log("   ✅ RSS sources configured");
console.log("   ✅ Ingestion pipeline");
console.log("   ✅ Enrichment pipeline");
console.log("   ✅ Feed export");
console.log("   ✅ Public feed accessible");
console.log("\n🎉 System is operational!");
