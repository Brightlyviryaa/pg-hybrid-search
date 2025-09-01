DO $$
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
END
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS vector_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  index_name TEXT NOT NULL DEFAULT 'default',
  raw_content TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'simple',
  embedding VECTOR(1536) NOT NULL,
  content_tsv TSVECTOR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Backward-compatible schema upgrade: ensure 'lang' column exists
ALTER TABLE vector_table ADD COLUMN IF NOT EXISTS lang TEXT NOT NULL DEFAULT 'simple';

-- Ensure content_tsv is a regular column (not generated), then keep it updated via trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vector_table' AND column_name = 'content_tsv'
  ) THEN
    ALTER TABLE vector_table ADD COLUMN content_tsv TSVECTOR;
  ELSE
    -- If previously defined as generated, recreate as regular column
    IF EXISTS (
      SELECT 1 
      FROM pg_attribute 
      WHERE attrelid = 'vector_table'::regclass 
        AND attname = 'content_tsv' 
        AND attgenerated = 's'
    ) THEN
      DROP INDEX IF EXISTS idx_vector_table_tsv;
      ALTER TABLE vector_table DROP COLUMN content_tsv;
      ALTER TABLE vector_table ADD COLUMN content_tsv TSVECTOR;
    END IF;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION set_updated_at_pg_hybrid() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_updated_at_pg_hybrid ON vector_table;
CREATE TRIGGER trg_set_updated_at_pg_hybrid BEFORE UPDATE ON vector_table
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_pg_hybrid();

-- Helper: safely resolve regconfig from text with fallback to 'simple'
CREATE OR REPLACE FUNCTION pg_hybrid_safe_regconfig(l TEXT)
RETURNS regconfig AS $$
DECLARE
  cfg regconfig;
BEGIN
  IF l IS NULL OR length(l) = 0 THEN
    RETURN 'simple'::regconfig;
  END IF;
  SELECT c.oid::regconfig INTO cfg
  FROM pg_ts_config c
  WHERE c.cfgname = l
  LIMIT 1;
  IF cfg IS NULL THEN
    RETURN 'simple'::regconfig;
  END IF;
  RETURN cfg;
END;
$$ LANGUAGE plpgsql STABLE;

-- Keep content_tsv updated according to lang and raw_content
CREATE OR REPLACE FUNCTION update_content_tsv_pg_hybrid() RETURNS TRIGGER AS $$
BEGIN
  NEW.content_tsv := to_tsvector(pg_hybrid_safe_regconfig(NEW.lang), coalesce(NEW.raw_content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_content_tsv_pg_hybrid ON vector_table;
CREATE TRIGGER trg_update_content_tsv_pg_hybrid
  BEFORE INSERT OR UPDATE ON vector_table
  FOR EACH ROW EXECUTE FUNCTION update_content_tsv_pg_hybrid();

CREATE INDEX IF NOT EXISTS idx_vector_table_embedding
  ON vector_table USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_vector_table_tsv
  ON vector_table USING GIN (content_tsv);

CREATE INDEX IF NOT EXISTS idx_vector_table_index_name
  ON vector_table (index_name);
