import { add, remove, search } from './search.js';
import { searchHybridWithRerank } from './rerank.js';
import type { SearchResult, SearchWeights } from './search.js';

export interface ClientSearchOptions {
  query: string;
  limit?: number;
  reranking?: boolean;
  vectorOnly?: boolean;
  weights?: SearchWeights;
  topNForRerank?: number;
}

export class PgHybridIndex {
  constructor(private indexName: string) {}

  async add(content: string): Promise<string> {
    return add(content);
  }

  async remove(id: string): Promise<void> {
    return remove(id);
  }

  async search(options: ClientSearchOptions): Promise<SearchResult[]> {
    const { query, limit = 10, reranking = false, vectorOnly = false, weights, topNForRerank = 50 } = options;
    
    if (reranking) {
      return searchHybridWithRerank(query, limit, topNForRerank);
    }
    
    return search({
      query,
      limit,
      vectorOnly,
      weights
    });
  }
}

export class PgHybridClient {
  index(indexName: string): PgHybridIndex {
    return new PgHybridIndex(indexName);
  }
}

export function createClient(): PgHybridClient {
  return new PgHybridClient();
}