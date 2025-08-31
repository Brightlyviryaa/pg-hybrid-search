import fetch from 'node-fetch';
import { SearchResult, search } from './search.js';

export interface Candidate {
  text: string;
  [key: string]: any;
}

export interface VoyageRerankResponse {
  results: Array<{
    index: number;
    relevance_score: number;
  }>;
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
      model: process.env.RERANK_MODEL || "rerank-2",
      top_k: candidates.length
    })
  });

  if (!res.ok) {
    throw new Error(`Gagal rerank dengan Voyage: ${await res.text()}`);
  }

  const data = await res.json() as VoyageRerankResponse;
  
  return data.results
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .map(result => ({
      ...candidates[result.index],
      rerank_score: result.relevance_score
    }));
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