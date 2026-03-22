-- Add price column to dishes table
-- Using TEXT type to support various price formats: "NT$140", "140", "NT$140-180", etc.
ALTER TABLE dishes ADD COLUMN IF NOT EXISTS price TEXT;
