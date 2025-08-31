import { withClient } from './db.js';
import { embedTextOpenAI } from './embedding.js';

export interface SearchResult {
  id: string;
  raw_content: string;
  cosine_sim?: number;
  ts_score?: number;
  hybrid_score?: number;
  created_at?: string;
  updated_at?: string;
}

export interface SearchWeights {
  vectorW: number;
  textW: number;
}

export interface SearchOptions {
  query: string;
  limit?: number;
  vectorOnly?: boolean;
  weights?: SearchWeights;
  indexName?: string;
}

export async function add(raw: string, indexName: string = 'default'): Promise<string> {
  return withClient(async c => {
    const emb = await embedTextOpenAI(raw);
    const res = await c.query(
      `INSERT INTO vector_table (index_name, raw_content, embedding) VALUES ($1, $2, $3) RETURNING id`,
      [indexName, raw, emb]
    );
    return res.rows[0].id;
  });
}

export async function remove(id: string, indexName?: string): Promise<void> {
  return withClient(async c => {
    if (indexName) {
      await c.query(`DELETE FROM vector_table WHERE id = $1 AND index_name = $2`, [id, indexName]);
    } else {
      await c.query(`DELETE FROM vector_table WHERE id = $1`, [id]);
    }
  });
}

export async function search(options: SearchOptions): Promise<SearchResult[]> {
  const { query, limit = 10, vectorOnly = false, weights = { vectorW: 0.7, textW: 0.3 }, indexName = 'default' } = options;
  
  return withClient(async c => {
    const qvec = await embedTextOpenAI(query);
    
    if (vectorOnly) {
      // Pure vector search
      const res = await c.query(`
        SELECT id, raw_content, created_at, updated_at,
          1 - (embedding <=> $1::vector) AS cosine_sim
        FROM vector_table
        WHERE index_name = $2
        ORDER BY embedding <=> $1::vector
        LIMIT $3
      `, [qvec, indexName, limit]);
      return res.rows;
    }
    
    // Hybrid search (default)
    const res = await c.query(`
      WITH scored AS (
        SELECT id, raw_content, created_at, updated_at,
          1 - (embedding <=> $1::vector) AS cosine_sim,
          ts_rank_cd(content_tsv, plainto_tsquery('simple', $2)) AS ts_score
        FROM vector_table
        WHERE index_name = $3
      ),
      normed AS (
        SELECT *,
          cosine_sim / NULLIF(max(cosine_sim) OVER (),0) AS cos_norm,
          ts_score / NULLIF(max(ts_score) OVER (),0) AS ts_norm
        FROM scored
      )
      SELECT id, raw_content, created_at, updated_at, cosine_sim, ts_score,
             ($4 * cos_norm + $5 * ts_norm) AS hybrid_score
      FROM normed
      ORDER BY hybrid_score DESC
      LIMIT $6
    `, [qvec, query, indexName, weights.vectorW, weights.textW, limit]);
    return res.rows;
  });
}

// Legacy functions for backward compatibility
export async function upsertDocument(raw: string): Promise<string> {
  return add(raw);
}

export async function deleteById(id: string): Promise<void> {
  return remove(id);
}