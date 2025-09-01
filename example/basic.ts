import 'dotenv/config';
import { createClient, PgHybridIndex, withClient } from '../src/index.js';

async function main() {
  console.log('=== pg-hybrid-search Example (v0.5.0-beta) ===');
  console.log('Using DATABASE_URL:', process.env.DATABASE_URL ? 'set' : 'missing');
  console.log('Using OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'set' : 'missing');
  console.log('Using VOYAGE_API_KEY:', process.env.VOYAGE_API_KEY ? 'set' : 'missing (rerank optional)');

  // 1) Create client and three isolated indexes
  console.log('\n[1/5] Creating client and indexes (A/B/C)...');
  const client = createClient();
  const indexA = client.index('index_a'); // English/tech
  const indexB = client.index('index_b'); // Indonesian/soccer
  const indexC = client.index('index_c'); // English/movies
  console.log(' -> Client ready; indexes = index_a, index_b, index_c');

  // Ensure schema is upgraded for multi-language (adds 'lang' if missing)
  await withClient(async (c) => {
    await c.query("ALTER TABLE vector_table ADD COLUMN IF NOT EXISTS lang TEXT NOT NULL DEFAULT 'simple'");
  });

  // 2) Seed multiple indexes with distinct topics + prefixes
  const seedA: string[] = [
    'A:: AI accelerates data analysis and business decision-making',
    'A:: PostgreSQL offers robust full-text search and indexing',
    'A:: Vector similarity enables semantic retrieval of documents',
    'A:: Hybrid search combines vector similarity with BM25 for relevance',
    'A:: Reranking with Voyage AI improves top results ordering',
    'A:: Node.js and TypeScript provide a great developer experience',
    'A:: pgvector brings vector operations into PostgreSQL at scale',
    'A:: BM25 is a ranking function used by search engines for scoring',
    'A:: OpenAI embeddings map text into 1536-dimensional vectors',
    'A:: Production-grade search requires indexing, pooling, and monitoring'
  ];

  const seedB: string[] = [
    'B:: Sepak bola adalah olahraga paling populer di dunia',
    'B:: Strategi pressing dan formasi 4-3-3 sangat efektif',
    'B:: Tim nasional Indonesia dan liga lokal berkembang pesat',
    'B:: Piala Dunia adalah ajang tertinggi sepak bola',
    'B:: Klub Eropa seperti Barcelona dan Real Madrid mendominasi'
  ];

  const seedC: string[] = [
    'C:: Star Wars is an epic space opera with Jedi knights',
    'C:: The Matrix explores virtual reality and artificial intelligence',
    'C:: Interstellar explores time dilation and black holes',
    'C:: Blade Runner is a cyberpunk noir classic',
    'C:: Inception explores dreams within dreams'
  ];

  console.log('\n[2/5] Seeding index A (tech, lang=en default) ...');
  await seedIndex(indexA, seedA);

  console.log('\n[3/5] Seeding index B (soccer, lang=indonesian) ...');
  await seedIndex(indexB, seedB, 'indonesian');

  console.log('\n[4/5] Seeding index C (movies, lang=en default) ...');
  await seedIndex(indexC, seedC);

  // 5) Demonstrate index isolation and reranking
  const qa = 'ai search relevance with postgres';
  console.log(`\n[5/5] Search on index A: \"${qa}\" (no rerank)`);
  const resA = await indexA.search({ query: qa, limit: 5 });
  printResults(resA);
  assertAllPrefixed(resA, 'A::');

  console.log(`\n[Isolation] Search index A with B-specific query: "sepak bola pressing"`);
  const resAwithBQuery = await indexA.search({ query: 'sepak bola pressing', limit: 5 });
  printResults(resAwithBQuery);
  assertAllPrefixed(resAwithBQuery, 'A::');

  console.log(`\n[Isolation] Search index B with Indonesian query: "sepak bola pressing"`);
  const resB = await indexB.search({ query: 'sepak bola pressing', limit: 5 });
  printResults(resB);
  assertAllPrefixed(resB, 'B::');

  console.log(`\n[Rerank] Search index C WITH rerank=true (topNForRerank=50): "epic space opera"`);
  try {
    const resC = await indexC.search({ query: 'epic space opera', limit: 5, reranking: true, topNForRerank: 50 });
    printResults(resC, true);
    assertAllPrefixed(resC, 'C::');
  } catch (err: any) {
    console.error(' -> Rerank failed:', err?.message || err);
    console.error('    Make sure VOYAGE_API_KEY is set if you want reranking.');
  }

  // Additional demos: hybrid weights + cross-language queries
  console.log(`\n[Weights] Search index C with custom weights (vectorW=0.6, textW=0.4): "matrix virtual reality"`);
  const resCWeighted = await indexC.search({
    query: 'matrix virtual reality',
    limit: 5,
    weights: { vectorW: 0.6, textW: 0.4 }
  });
  printResults(resCWeighted);
  assertAllPrefixed(resCWeighted, 'C::');

  console.log(`\n[Cross-lang] Search index B (lang=indonesian) with English query: "soccer pressing 4-3-3 strategy"`);
  const resBCross = await indexB.search({ query: 'soccer pressing 4-3-3 strategy', limit: 5 });
  printResults(resBCross);
  assertAllPrefixed(resBCross, 'B::');

  console.log(`\n[Vector-only] Cross-lang on index C with Indonesian query (vectorOnly=true): "opera luar angkasa epik"`);
  const resCVectorOnly = await indexC.search({ query: 'opera luar angkasa epik', limit: 5, vectorOnly: true });
  printResults(resCVectorOnly);
  assertAllPrefixed(resCVectorOnly, 'C::');

  // Cleanup demo: destroy index A after searches
  console.log(`\n[Cleanup] Destroy index A after searches`);
  const removedA = await indexA.destroy();
  console.log(` -> index_a destroyed: ${removedA} rows removed`);

  // Optional verify: searching index A now should return 0
  const verifyA = await indexA.search({ query: qa, limit: 3 });
  console.log(` -> Verify after destroy: index A results = ${verifyA.length}`);

  console.log('\nAll done.');
}

function printResults(results: Array<any>, withRerank = false) {
  console.log(` -> Got ${results.length} results`);
  results.forEach((r, i) => {
    const base = [`#${i + 1}`, `id=${r.id}`];
    if (typeof r.hybrid_score === 'number') base.push(`hybrid=${r.hybrid_score.toFixed(4)}`);
    if (typeof r.cosine_sim === 'number') base.push(`cos=${r.cosine_sim.toFixed(4)}`);
    if (typeof r.ts_score === 'number') base.push(`bm25=${r.ts_score.toFixed(4)}`);
    if (withRerank && typeof r.rerank_score === 'number') base.push(`rerank=${r.rerank_score.toFixed(4)}`);
    console.log('   ', base.join(' | '));
    console.log('     ', (r.raw_content || '').slice(0, 100));
  });
}

async function seedIndex(index: PgHybridIndex, docs: string[], lang?: string) {
  console.time(`Seed-${(index as any).indexName || 'index'}`);
  for (let i = 0; i < docs.length; i++) {
    const text = docs[i];
    process.stdout.write(` -> [${i + 1}/${docs.length}] adding: \"${text.slice(0, 60)}\"... `);
    const id = await index.add(text, lang);
    console.log(`done (id=${id})`);
  }
  console.timeEnd(`Seed-${(index as any).indexName || 'index'}`);
}

function assertAllPrefixed(results: Array<any>, prefix: string) {
  const mismatches = results.filter(r => typeof r.raw_content !== 'string' || !r.raw_content.startsWith(prefix));
  if (mismatches.length === 0) {
    console.log(` -> Isolation check PASS: all results start with ${prefix}`);
  } else {
    console.warn(` -> Isolation check WARN: ${mismatches.length} result(s) without prefix ${prefix}`);
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
