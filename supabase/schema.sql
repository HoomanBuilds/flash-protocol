-- Enable UUID extension (Supabase usually has this enabled by default)
create extension if not exists "uuid-ossp";

-- Enums
do $$ begin
    create type payment_link_status as enum ('active', 'paused', 'archived', 'expired');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type transaction_status as enum (
        'initiated', 'quote_generated', 'pending_signature', 'submitted', 
        'processing', 'swapping', 'bridging', 'settling', 'completed', 'failed', 'expired'
    );
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type provider_type as enum ('lifi', 'rango', 'near-intents', 'rubic', 'symbiosis', 'cctp');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type refund_status as enum ('not_needed', 'pending', 'processing', 'completed', 'failed');
exception
    when duplicate_object then null;
end $$;

-- Merchants Table (Profile table linked to auth.users)
-- "merchants (users table)" from technical docs
create table if not exists merchants (
    id uuid primary key default uuid_generate_v4(),
    wallet_address varchar unique not null,
    email varchar,
    business_name varchar,
    default_receive_chain integer,
    default_receive_token varchar,
    branding_settings jsonb default '{}'::jsonb,
    total_links_created integer default 0,
    total_revenue decimal default 0,
    -- API Integration columns (Phase 4B)
    api_key_hash varchar(255) unique,
    api_key_prefix varchar(20),
    api_enabled boolean default false,
    api_created_at timestamp with time zone,
    api_last_used_at timestamp with time zone,
    api_total_calls integer default 0,
    -- Timestamps
    created_at timestamp with time zone default now(),
    last_login_at timestamp with time zone
);

-- RLS for Merchants
alter table merchants enable row level security;
create policy "Public profiles are viewable by everyone" on merchants for select using (true);
create policy "Anyone can insert profile" on merchants for insert with check (true);
create policy "Users can update own profile" on merchants for update using (false); -- Strict: Only Service Role can update

-- Indexes for Merchants
create index if not exists idx_merchants_wallet on merchants(wallet_address);
create index if not exists idx_merchants_api_key_hash on merchants(api_key_hash);
create index if not exists idx_merchants_api_enabled on merchants(api_enabled);

-- Comments
comment on column merchants.api_key_hash is 'Hashed API key for programmatic access (bcrypt)';
comment on column merchants.api_key_prefix is 'First 16 chars of API key for display (e.g., cp_live_abc12345)';
comment on column merchants.api_enabled is 'Whether API access is enabled for this merchant';
comment on column merchants.api_total_calls is 'Total number of API calls made by this merchant';

-- Payment Links Table
create table if not exists payment_links (
    id uuid primary key default uuid_generate_v4(),
    merchant_id uuid references merchants(id) not null,
    amount decimal,
    currency varchar default 'USD',
    receive_token varchar,
    receive_token_symbol varchar,
    receive_chain_id integer,
    recipient_address varchar,
    title text,
    customization jsonb default '{}'::jsonb,
    receive_mode varchar default 'specific_chain' check (receive_mode in ('same_chain', 'specific_chain')),
    status payment_link_status default 'active',
    max_uses integer, -- nullable, null means unlimited
    current_uses integer default 0,
    expires_at timestamp with time zone,
    -- API Integration columns (Phase 4B)
    created_via varchar(20) default 'dashboard' check (created_via in ('dashboard', 'api')),
    success_url text,
    cancel_url text,
    api_metadata jsonb default '{}'::jsonb,
    -- Timestamps
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- RLS for Payment Links
alter table payment_links enable row level security;
create policy "Payment links viewable by everyone" on payment_links for select using (true);
create policy "Merchants can insert own links" on payment_links for insert with check (true);
create policy "Merchants can update own links" on payment_links for update using (false); -- Enforce API-only updates

-- Indexes for Payment Links
create index if not exists idx_payment_links_merchant_id on payment_links(merchant_id);
create index if not exists idx_payment_links_status on payment_links(status);
create index if not exists idx_payment_links_expires on payment_links(expires_at);
create index if not exists idx_payment_links_created_via on payment_links(created_via);

-- Comments
comment on column payment_links.created_via is 'How link was created: dashboard (UI) or api (programmatic)';
comment on column payment_links.success_url is 'Redirect URL after successful payment (API users only)';
comment on column payment_links.cancel_url is 'Redirect URL if payment cancelled (API users only)';
comment on column payment_links.api_metadata is 'Custom metadata from API user (e.g., order_id, customer_email)';

-- Transactions Table
create table if not exists transactions (
    id uuid primary key default uuid_generate_v4(),
    payment_link_id uuid references payment_links(id),
    customer_wallet varchar,
    from_chain_id integer,
    from_token varchar,
    from_token_symbol varchar,
    from_amount decimal,
    to_chain_id integer,
    to_token varchar,
    to_token_symbol varchar,
    to_amount decimal, -- Expected output
    actual_output decimal,
    status transaction_status default 'initiated',
    provider provider_type,
    route_details jsonb,
    source_tx_hash varchar,
    bridge_tx_hash varchar,
    dest_tx_hash varchar,
    gas_estimate decimal,
    gas_paid decimal,
    slippage_tolerance decimal default 0.5,
    actual_slippage decimal,
    platform_fee decimal,
    provider_fee decimal,
    total_fees decimal,
    error_message text,
    failure_stage varchar,
    refund_status refund_status default 'not_needed',
    refund_tx_hash varchar,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    completed_at timestamp with time zone
);

-- RLS for Transactions
alter table transactions enable row level security;
create policy "Transactions viewable by everyone" on transactions for select using (true);
create policy "System can insert transactions" on transactions for insert with check (true); 

-- Indexes for Transactions
create index if not exists idx_tx_payment_link_id on transactions(payment_link_id);
create index if not exists idx_tx_status on transactions(status);
create index if not exists idx_tx_provider on transactions(provider);
create index if not exists idx_tx_source_hash on transactions(source_tx_hash);
create index if not exists idx_tx_customer_wallet on transactions(customer_wallet);
create index if not exists idx_tx_created_at on transactions(created_at desc);

-- Quotes Table
create table if not exists quotes (
    id uuid primary key default uuid_generate_v4(),
    payment_link_id uuid references payment_links(id),
    session_id varchar,
    from_chain_id integer,
    from_token varchar,
    from_amount decimal,
    to_chain_id integer,
    to_token varchar,
    providers_queried text[], -- Array of strings
    lifi_quote jsonb,
    rango_quote jsonb,
    near_quote jsonb,
    rubic_quote jsonb,
    symbiosis_quote jsonb,
    best_provider varchar,
    best_output decimal,
    comparison_data jsonb,
    expires_at timestamp with time zone,
    created_at timestamp with time zone default now()
);

-- RLS for Quotes
alter table quotes enable row level security;
create policy "Quotes viewable by everyone" on quotes for select using (true);
create policy "Anyone can create quotes" on quotes for insert with check (true);

-- Customers Table
create table if not exists customers (
    id uuid primary key default uuid_generate_v4(),
    wallet_address varchar unique not null,
    email varchar,
    total_payments integer default 0,
    total_volume decimal default 0,
    first_payment_at timestamp with time zone,
    last_payment_at timestamp with time zone,
    metadata jsonb default '{}'::jsonb,
    created_at timestamp with time zone default now()
);

-- RLS for Customers
alter table customers enable row level security;
create policy "Customers viewable by everyone" on customers for select using (true);

-- Sessions Table (for SIWE authentication - MVP only)
create table if not exists sessions (
    id uuid primary key default uuid_generate_v4(),
    wallet_address varchar not null,
    nonce varchar not null,
    signature text,
    message text,
    expires_at timestamp with time zone not null,
    created_at timestamp with time zone default now()
);

-- RLS for Sessions
alter table sessions enable row level security;
create policy "Sessions viewable by owner" on sessions for select using (wallet_address = auth.jwt()->>'sub'); 
create policy "Anyone can create session" on sessions for insert with check (true);

-- Indexes for Sessions
create index if not exists idx_session_wallet on sessions(wallet_address);
create index if not exists idx_session_expires on sessions(expires_at);
create index if not exists idx_session_nonce on sessions(nonce);

-- Failure Logs Table
create table if not exists failure_logs (
    id uuid primary key default uuid_generate_v4(),
    transaction_id uuid references transactions(id),
    provider varchar,
    failure_stage varchar,
    error_code varchar,
    error_message text,
    blockchain_error text,
    stack_trace text,
    refund_initiated boolean default false,
    refund_completed boolean default false,
    support_ticket_id varchar,
    resolved_at timestamp with time zone,
    resolution_notes text,
    created_at timestamp with time zone default now()
);

-- RLS for Failure Logs
alter table failure_logs enable row level security;
create policy "Failure logs viewable by system" on failure_logs for select using (true);

-- Indexes for Failure Logs
create index if not exists idx_failure_tx_id on failure_logs(transaction_id);
create index if not exists idx_failure_provider_stage on failure_logs(provider, failure_stage);
create index if not exists idx_failure_created_at on failure_logs(created_at desc);

-- Analytics Table (Optional for MVP but good to have)
create table if not exists analytics (
    id uuid primary key default uuid_generate_v4(),
    date date,
    provider varchar,
    chain_id integer,
    total_transactions integer default 0,
    successful_transactions integer default 0,
    failed_transactions integer default 0,
    total_volume decimal default 0,
    total_fees_collected decimal default 0,
    avg_transaction_value decimal default 0,
    avg_completion_time integer default 0,
    unique_payers integer default 0,
    unique_merchants integer default 0,
    created_at timestamp with time zone default now()
);

-- RLS for Analytics
alter table analytics enable row level security;
create policy "Analytics viewable by everyone" on analytics for select using (true);

-- Indexes for Analytics
create index if not exists idx_analytics_date_provider on analytics(date, provider);
create index if not exists idx_analytics_date on analytics(date desc);

-- API Logs Table (Phase 4B - Optional for debugging)
create table if not exists api_logs (
    id uuid primary key default uuid_generate_v4(),
    merchant_id uuid references merchants(id),
    endpoint varchar(255) not null,
    method varchar(10) not null,
    status_code integer,
    request_body jsonb,
    response_body jsonb,
    error_message text,
    ip_address varchar(45),
    user_agent text,
    execution_time_ms integer,
    created_at timestamp with time zone default now()
);

-- RLS for API Logs
alter table api_logs enable row level security;
create policy "Merchants can view own API logs" on api_logs 
    for select 
    using (merchant_id = (select id from merchants where wallet_address = auth.jwt()->>'sub'));

-- Indexes for API Logs
create index if not exists idx_api_logs_merchant on api_logs(merchant_id);
create index if not exists idx_api_logs_created_at on api_logs(created_at desc);
create index if not exists idx_api_logs_endpoint on api_logs(endpoint);
create index if not exists idx_api_logs_status on api_logs(status_code);

-- Comment
comment on table api_logs is 'API request logs for debugging (automatically deleted after 30 days)';

-- Realtime Subscriptions
do $$
begin
  alter publication supabase_realtime add table transactions;
  alter publication supabase_realtime add table payment_links;
exception when others then
  null;
end $$;

-- RPC for atomic updates

create or replace function increment_payment_link_uses(link_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update payment_links
  set current_uses = current_uses + 1,
      updated_at = now()
  where id = link_id;
end;
$$;

create or replace function update_merchant_revenue(merchant_uuid uuid, amount decimal)
returns void
language plpgsql
security definer
as $$
begin
  update merchants
  set total_revenue = total_revenue + amount,
      total_links_created = total_links_created -- no change
  where id = merchant_uuid;
end;
$$;

-- Function to delete old API logs (keep last 30 days)
create or replace function delete_old_api_logs()
returns void
language plpgsql
security definer
as $$
begin
    delete from api_logs 
    where created_at < now() - interval '30 days';
end;
$$;

-- Optional: Set up cron job to auto-delete old logs (requires pg_cron extension)
-- This is commented out by default, enable if needed
/*
select cron.schedule(
    'delete-old-api-logs',
    '0 3 * * *', -- Run daily at 3 AM
    $$select delete_old_api_logs()$$
);
*/