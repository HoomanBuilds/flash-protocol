-- Reset merchants who generated invalid 20-byte stealth_meta_address (ETH addresses)
-- It should be an uncompressed public key (132 characters including "0x" prefix)
UPDATE merchants
SET 
  stealth_enabled = false,
  stealth_viewing_key_node = null,
  stealth_meta_address = null
WHERE stealth_meta_address IS NOT NULL AND length(stealth_meta_address) < 130;
