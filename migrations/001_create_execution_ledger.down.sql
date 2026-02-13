-- 001_create_execution_ledger.down.sql
-- Reverse migration: drop execution_ledger table

DROP TABLE IF EXISTS execution_ledger CASCADE;

-- Integrity assertion: Ensure table no longer exists
-- SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'execution_ledger'; -- expect 0
