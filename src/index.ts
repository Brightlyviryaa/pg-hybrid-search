export { pool, withClient } from './db.js';
export { embedTextOpenAI } from './embedding.js';
export { 
  upsertDocument, 
  deleteById, 
  searchVector, 
  searchHybrid,
  type SearchResult,
  type HybridWeights
} from './search.js';
export { 
  rerankVoyage, 
  searchHybridWithRerank,
  type Candidate,
  type VoyageRerankResponse
} from './rerank.js';