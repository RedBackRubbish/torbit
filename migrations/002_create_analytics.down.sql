-- 002_create_analytics.down.sql
-- Reverse migration: drop analytics tables

DROP TABLE IF EXISTS analytics_performance CASCADE;
DROP TABLE IF EXISTS analytics_executions CASCADE;

-- Integrity assertions: tables should no longer exist
-- SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'analytics_executions'; -- expect 0
-- SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'analytics_performance'; -- expect 0
