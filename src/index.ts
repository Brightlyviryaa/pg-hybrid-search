export { pool, withClient } from './db.js';
export { embedTextOpenAI } from './embedding.js';
export { 
  add, 
  remove, 
  search,
  upsertDocument, 
  deleteById,
  type SearchResult,
  type SearchWeights,
  type SearchOptions
} from './search.js';
export { 
  rerankVoyage, 
  searchHybridWithRerank,
  type Candidate,
  type VoyageRerankResponse
} from './rerank.js';
export { 
  createClient, 
  PgHybridClient, 
  PgHybridIndex,
  type ClientSearchOptions
} from './client.js';