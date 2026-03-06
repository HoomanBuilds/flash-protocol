-- Migration: Change receive_chain_id from integer to varchar
-- This allows non-numeric chain keys like 'solana' to be stored as destination chains.
-- Existing numeric values (e.g. 42161) are cast to their string representation.

ALTER TABLE payment_links
  ALTER COLUMN receive_chain_id TYPE varchar
  USING receive_chain_id::varchar;
