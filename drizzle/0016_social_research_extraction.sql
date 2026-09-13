-- Compact live extraction diagnostics. Never store retrieved web bodies.
ALTER TABLE `social_research_candidates` ADD COLUMN `extraction_json` text;
