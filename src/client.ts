import { add, remove, search, destroy as destroyIndex } from './search.js';
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

  async add(content: string, lang?: string): Promise<string> {
    return add(content, this.indexName, lang);
  }

  async remove(id: string): Promise<void> {
    return remove(id, this.indexName);
  }

  // Alias for remove, matching common naming
  async delete(id: string): Promise<void> {
    return this.remove(id);
  }

  async search(options: ClientSearchOptions): Promise<SearchResult[]> {
    const { query, limit = 10, reranking = false, vectorOnly = false, weights, topNForRerank = 50 } = options;
    
    if (reranking) {
      return searchHybridWithRerank(query, limit, topNForRerank, this.indexName);
    }
    
    return search({
      query,
      limit,
      vectorOnly,
      weights,
      indexName: this.indexName
    });
  }

  async destroy(): Promise<number> {
    return destroyIndex(this.indexName);
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
