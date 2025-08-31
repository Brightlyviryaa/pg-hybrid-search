DO $
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname='pgcrypto') THEN
    CREATE EXTENSION pgcrypto;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname='vector') THEN
    CREATE EXTENSION vector;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_trgm') THEN
    CREATE EXTENSION pg_trgm;
  END IF;
END$;

CREATE TABLE IF NOT EXISTS vector_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  index_name TEXT NOT NULL DEFAULT 'default',
  raw_content TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL,
  content_tsv TSVECTOR GENERATED ALWAYS AS (to_tsvector('simple', coalesce(raw_content,''))) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at_pg_hybrid() RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_updated_at_pg_hybrid ON vector_table;
CREATE TRIGGER trg_set_updated_at_pg_hybrid BEFORE UPDATE ON vector_table
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at_pg_hybrid();

CREATE INDEX IF NOT EXISTS idx_vector_table_embedding
  ON vector_table USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_vector_table_tsv
  ON vector_table USING GIN (content_tsv);

CREATE INDEX IF NOT EXISTS idx_vector_table_index_name
  ON vector_table (index_name);