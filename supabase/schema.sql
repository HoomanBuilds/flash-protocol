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
    create type provider_type as enum ('lifi', 'rango', 'near_intents', 'rubic', 'symbiosis');
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
    id uuid primary key references auth.users(id) on delete cascade,
    wallet_address varchar unique not null,
    email varchar,
    business_name varchar,
    default_receive_chain integer,
    default_receive_token varchar,
    branding_settings jsonb default '{}'::jsonb,
    total_links_created integer default 0,
    total_revenue decimal default 0,
    created_at timestamp with time zone default now(),
    last_login_at timestamp with time zone
);

-- RLS for Merchants
alter table merchants enable row level security;
create policy "Public profiles are viewable by everyone" on merchants for select using (true);
create policy "Users can insert their own profile" on merchants for insert with check (auth.uid() = id);
create policy "Users can update own profile" on merchants for update using (auth.uid() = id);

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
    status payment_link_status default 'active',
    max_uses integer, -- nullable, null means unlimited
    current_uses integer default 0,
    expires_at timestamp with time zone,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- RLS for Payment Links
alter table payment_links enable row level security;
create policy "Payment links viewable by everyone" on payment_links for select using (true);
create policy "Merchants can insert own links" on payment_links for insert with check (auth.uid() = merchant_id);
create policy "Merchants can update own links" on payment_links for update using (auth.uid() = merchant_id);

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


-- Indexes
create index if not exists idx_merchant_id on payment_links(merchant_id);
create index if not exists idx_payment_link_status on payment_links(status);
create index if not exists idx_payment_link_expires on payment_links(expires_at);

create index if not exists idx_tx_payment_link_id on transactions(payment_link_id);
create index if not exists idx_tx_status on transactions(status);
create index if not exists idx_tx_provider on transactions(provider);
create index if not exists idx_tx_source_hash on transactions(source_tx_hash);
create index if not exists idx_tx_customer_wallet on transactions(customer_wallet);
create index if not exists idx_tx_created_at on transactions(created_at desc);

create index if not exists idx_failure_tx_id on failure_logs(transaction_id);
create index if not exists idx_failure_provider_stage on failure_logs(provider, failure_stage);
create index if not exists idx_failure_created_at on failure_logs(created_at desc);

create index if not exists idx_analytics_date_provider on analytics(date, provider);
create index if not exists idx_analytics_date on analytics(date desc);

-- Realtime Subscriptions
begin;
  alter publication supabase_realtime add table transactions;
  alter publication supabase_realtime add table payment_links;
exception when others then
  null;
end;
