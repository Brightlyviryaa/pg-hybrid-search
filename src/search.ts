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

export interface HybridWeights {
  vectorW: number;
  textW: number;
}

export async function upsertDocument(raw: string): Promise<string> {
  return withClient(async c => {
    const emb = await embedTextOpenAI(raw);
    const res = await c.query(
      `INSERT INTO vector_table (raw_content, embedding) VALUES ($1, $2) RETURNING id`,
      [raw, emb]
    );
    return res.rows[0].id;
  });
}

export async function deleteById(id: string): Promise<void> {
  return withClient(async c => {
    await c.query(`DELETE FROM vector_table WHERE id = $1`, [id]);
  });
}

export async function searchVector(query: string, k = 10): Promise<SearchResult[]> {
  return withClient(async c => {
    const qvec = await embedTextOpenAI(query);
    const res = await c.query(`
      SELECT id, raw_content, created_at, updated_at,
        1 - (embedding <=> $1::vector) AS cosine_sim
      FROM vector_table
      ORDER BY embedding <=> $1::vector
      LIMIT $2
    `, [qvec, k]);
    return res.rows;
  });
}

export async function searchHybrid(
  query: string, 
  k = 10, 
  weights: HybridWeights = { vectorW: 0.7, textW: 0.3 }
): Promise<SearchResult[]> {
  return withClient(async c => {
    const qvec = await embedTextOpenAI(query);
    const res = await c.query(`
      WITH scored AS (
        SELECT id, raw_content, created_at, updated_at,
          1 - (embedding <=> $1::vector) AS cosine_sim,
          ts_rank_cd(content_tsv, plainto_tsquery('simple', $2)) AS ts_score
        FROM vector_table
      ),
      normed AS (
        SELECT *,
          cosine_sim / NULLIF(max(cosine_sim) OVER (),0) AS cos_norm,
          ts_score / NULLIF(max(ts_score) OVER (),0) AS ts_norm
        FROM scored
      )
      SELECT id, raw_content, created_at, updated_at, cosine_sim, ts_score,
             ($3 * cos_norm + $4 * ts_norm) AS hybrid_score
      FROM normed
      ORDER BY hybrid_score DESC
      LIMIT $5
    `, [qvec, query, weights.vectorW, weights.textW, k]);
    return res.rows;
  });
}