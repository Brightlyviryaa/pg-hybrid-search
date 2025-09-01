// Public surface (Modern API only)
export { pool, withClient } from './db.js';
export { add, remove, search, destroy } from './search.js';
export type { SearchResult, SearchWeights, SearchOptions } from './search.js';
export { 
  createClient, 
  PgHybridClient, 
  PgHybridIndex,
} from './client.js';
export type { ClientSearchOptions } from './client.js';
