import { SearchResult, search } from './search.js';

export interface Candidate {
  text: string;
  [key: string]: any;
}

export interface VoyageRerankResponseItem {
  index: number;
  relevance_score: number;
  document?: string;
}

export interface VoyageRerankResponse {
  object?: string;
  data: VoyageRerankResponseItem[];
  model?: string;
  usage?: Record<string, any>;
}

export async function rerankVoyage(query: string, candidates: Candidate[]): Promise<Candidate[]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error("VOYAGE_API_KEY tidak di-set");
  }

  const texts = candidates.map(c => c.text);
  
  const res = await fetch("https://api.voyageai.com/v1/rerank", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query: query,
      documents: texts,
      model: process.env.RERANK_MODEL || "rerank-2.5-lite",
      top_k: candidates.length
    })
  });

  if (!res.ok) {
    throw new Error(`Gagal rerank dengan Voyage: ${await res.text()}`);
  }

  const data = await res.json() as VoyageRerankResponse;

  if (!data || !Array.isArray(data.data)) {
    throw new Error("Voyage rerank response malformed: missing 'data' array");
    }

  if (process.env.PG_HYBRID_DEBUG_RERANK === '1' || process.env.PG_HYBRID_DEBUG === '1') {
    try {
      // Lightweight debug info
      // eslint-disable-next-line no-console
      console.log('[pg-hybrid] rerank model:', data.model, 'candidates:', candidates.length);
      if (data.usage) {
        // eslint-disable-next-line no-console
        console.log('[pg-hybrid] rerank usage:', data.usage);
      }
    } catch {}
  }

  const merged: Candidate[] = data.data.map(item => ({
    ...candidates[item.index],
    rerank_score: item.relevance_score
  } as Candidate));

  // Tie-breaker: if rerank_score is close, use hybrid_score/cosine_sim as secondary criterion
  merged.sort((a, b) => {
    const diff = (b.rerank_score ?? 0) - (a.rerank_score ?? 0);
    if (Math.abs(diff) > 1e-6) return diff;
    const aFallback = (a.hybrid_score ?? a.cosine_sim ?? 0);
    const bFallback = (b.hybrid_score ?? b.cosine_sim ?? 0);
    return bFallback - aFallback;
  });

  return merged;
}

export async function searchHybridWithRerank(
  query: string, 
  k = 10, 
  topNForRerank = 50,
  indexName = 'default'
): Promise<SearchResult[]> {
  const hybridResults = await search({
    query,
    limit: topNForRerank,
    indexName
  });
  
  if (hybridResults.length === 0) {
    return [];
  }

  const candidates = hybridResults.map(result => ({
    text: result.raw_content,
    ...result
  }));

  const rerankedCandidates = await rerankVoyage(query, candidates);
  
  return rerankedCandidates
    .slice(0, k)
    .map(candidate => {
      const { text, ...rest } = candidate;
      return rest as SearchResult;
    });
}
