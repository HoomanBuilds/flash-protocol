-- Drop existing if re-running
DROP TABLE IF EXISTS cached_tokens;
DROP TABLE IF EXISTS cached_chains;

-- Pre-computed chain data from all providers (refreshed every 15min via Inngest)
CREATE TABLE IF NOT EXISTS cached_chains (
  key TEXT PRIMARY KEY,
  chain_id INTEGER,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  symbol TEXT NOT NULL,
  logo_url TEXT,
  has_usdc BOOLEAN DEFAULT false,
  providers JSONB NOT NULL DEFAULT '{}'::jsonb,
  provider_ids JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-computed token data per chain
CREATE TABLE IF NOT EXISTS cached_tokens (
  id TEXT PRIMARY KEY,
  chain_key TEXT NOT NULL,
  address TEXT NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  decimals INTEGER NOT NULL DEFAULT 18,
  logo_url TEXT,
  is_native BOOLEAN DEFAULT false,
  provider_ids JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_chain
    FOREIGN KEY(chain_key) 
    REFERENCES cached_chains(key)
    ON DELETE CASCADE
);

-- RLS
ALTER TABLE cached_chains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cached_chains_public_read" ON cached_chains FOR SELECT USING (true);
CREATE POLICY "cached_chains_service_write" ON cached_chains FOR ALL USING (true);

ALTER TABLE cached_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cached_tokens_public_read" ON cached_tokens FOR SELECT USING (true);
CREATE POLICY "cached_tokens_service_write" ON cached_tokens FOR ALL USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cached_tokens_chain ON cached_tokens(chain_key);
CREATE INDEX IF NOT EXISTS idx_cached_chains_has_usdc ON cached_chains(has_usdc);
CREATE INDEX IF NOT EXISTS idx_cached_chains_type ON cached_chains(type);
