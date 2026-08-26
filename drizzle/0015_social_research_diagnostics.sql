-- Audit-only live retrieval diagnostics. Never store API keys or request headers.
ALTER TABLE `social_research_runs` ADD COLUMN `diagnostics_json` text;
