DROP INDEX IF EXISTS idx_vector_table_embedding;
DROP INDEX IF EXISTS idx_vector_table_tsv;
DROP TRIGGER IF EXISTS trg_set_updated_at_pg_hybrid ON vector_table;
DROP FUNCTION IF EXISTS set_updated_at_pg_hybrid();
DROP TABLE IF EXISTS vector_table;