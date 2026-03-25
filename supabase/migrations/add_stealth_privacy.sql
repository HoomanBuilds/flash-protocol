-- EVM Stealth Address Privacy
-- Adds stealth mode opt-in for merchants and per-payment stealth address tracking.

-- Merchant stealth columns
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS stealth_enabled BOOLEAN DEFAULT false;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS stealth_viewing_key_node TEXT;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS stealth_meta_address TEXT CHECK(stealth_meta_address IS NULL OR length(stealth_meta_address) >= 130);

-- Per-link privacy toggle
ALTER TABLE payment_links ADD COLUMN IF NOT EXISTS use_stealth BOOLEAN DEFAULT false;

-- Per-payment stealth address tracking
CREATE TABLE IF NOT EXISTS stealth_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID REFERENCES merchants(id) NOT NULL,
  payment_link_id UUID REFERENCES payment_links(id),
  transaction_id UUID REFERENCES transactions(id),
  nonce INTEGER NOT NULL,
  stealth_safe_address VARCHAR NOT NULL,
  chain_id VARCHAR NOT NULL,
  ephemeral_public_key TEXT NOT NULL,
  amount_received DECIMAL,
  claimed BOOLEAN DEFAULT false,
  claimed_at TIMESTAMPTZ,
  claim_tx_hash VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (idempotent: drop first if exists)
ALTER TABLE stealth_addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stealth_addresses_public_read" ON stealth_addresses;
DROP POLICY IF EXISTS "stealth_addresses_service_write" ON stealth_addresses;
CREATE POLICY "stealth_addresses_public_read" ON stealth_addresses FOR SELECT USING (true);
CREATE POLICY "stealth_addresses_service_write" ON stealth_addresses FOR ALL USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stealth_merchant ON stealth_addresses(merchant_id);
CREATE INDEX IF NOT EXISTS idx_stealth_unclaimed ON stealth_addresses(merchant_id, claimed) WHERE claimed = false;
CREATE INDEX IF NOT EXISTS idx_stealth_safe ON stealth_addresses(stealth_safe_address);
CREATE INDEX IF NOT EXISTS idx_stealth_nonce ON stealth_addresses(merchant_id, nonce);
CREATE INDEX IF NOT EXISTS idx_stealth_payment_link ON stealth_addresses(payment_link_id);

-- Comments
COMMENT ON TABLE stealth_addresses IS 'Per-payment stealth Safe addresses generated via Fluidkey SDK';
COMMENT ON COLUMN merchants.stealth_viewing_key_node IS 'BIP-32 viewing key node for stealth address generation (NOT the spending key)';
COMMENT ON COLUMN merchants.stealth_meta_address IS 'Public stealth meta-address for verification';
