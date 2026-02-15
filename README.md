<div align="center">
  <img src="public/logo-white.png" alt="Flash Protocol Logo" width="120" height="120" />
  
  # Flash Protocol Payment Gateway

[![Next.js](https://img.shields.io/badge/Next.js-15.0-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)


</div>

<br />

Flash Protocol is an enterprise-grade, non-custodial cryptocurrency payment orchestration platform. It is engineered to bridge the gap between traditional commerce and decentralized finance, empowering merchants to accept payments in any token across over 70 blockchain networks while maintaining a seamless, single-currency settlement workflow.

## Strategic Overview

The platform operates as a liquidity aggregator and payment orchestrator. By leveraging advanced cross-chain routing protocols, it guarantees the most efficient execution path for every transaction. The system aggregates liquidity from **six major cross-chain providers**, ensuring minimal slippage and optimal gas costs for users, while delivering settlement in the merchant's preferred stablecoin.

### Core Value Proposition

- **Universal Asset Acceptance:** Merchants define their settlement currency (e.g., USDC on Base), while customers retain the flexibility to pay using any asset from any supported chain (e.g., ETH on Arbitrum, SOL on Solana).
- **Non-Custodial Architecture:** Funds settle directly into the merchant's self-custudial wallet. The platform never holds user assets, effectively eliminating counterparty risk and regulatory overhead.
- **Enterprise-Grade Performance:** Designed for high throughput, the system delivers sub-second quote generation and robust status tracking suitable for high-volume commercial applications.
- **Developer-Centric Design:** Built with a resilient API architecture, facilitating deep integration into existing e-commerce flows, subscription models, and custom applications.

## Global Infrastructure

### Supported Networks

The platform supports payments across **70+ blockchain networks**, ensuring maximum accessibility.

- **EVM Ecosystem:** Ethereum, Arbitrum, Optimism, Base, Polygon, BSC, Avalanche, Linea, Scroll, zkSync Era, and others.
- **Non-EVM Ecosystem:** Solana, Cosmos (via IBC), Tron, TON, Starknet.
- **Bitcoin Ecosystem:** Bitcoin, Litecoin.

### Liquidity & Integration Engine

Our proprietary `TransactionExecutor` aggregates and compares routes from the industry's leading cross-chain bridges and DEX aggregators to orchestrate the optimal path for every payment.

**Integrated Providers:**

| Provider           | Type               |
| :----------------- | :----------------- |
| **LI.FI**          | Aggregator         |
| **Rango Exchange** | Aggregator         |
| **Rubic**          | Aggregator         |
| **Symbiosis**      | Liquidity Protocol |
| **Circle CCTP**    | Bridge Protocol    |
| **Near Intents**   | Intent Network     |

## Key Features

### Merchant Dashboard

A unified command center for managing payment operations:

- **Payment Links:** Generate reusable or one-time payment links with fixed or dynamic amounts.
- **Transaction Analytics:** Real-time visibility into transaction volume, success rates, and revenue streams.
- **API Management:** Secure generation and revocation of API keys for programmatic access.
- **Cross-Chain Preview:** Live visualization of payment routes and estimated fees.

### Smart Execution Engine

The client-side execution engine handles the complexity of cross-chain transactions transparently:

- **Intelligent Routing:** Algorithmically selects the best provider based on cost, speed, and reliability.
- **Multi-Step Orchestration:** Manages token approvals, bridging, and swapping in a unified, user-friendly interface.
- **Atomic Settlement:** Supports direct contract calls for atomic providers, reducing transaction failure rates.

### Developer API

We provide a comprehensive RESTful API to enable businesses to integrate custom crypto payment flows:

- **Payment Links API:** programmatic creation and management of payment sessions.
- **Transactions API:** Retrieve detailed transaction history and status for reconciliation.
- **Secure Authentication:** Server-to-server communication secured via hashed API keys.

## Technical Architecture

The application is built on a modern, scalable stack designed for security and performance.

### Frontend Layer

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS, Shadcn UI, Framer Motion
- **State Management:** TanStack Query (Server State), Zustand (Client State)
- **Blockchain Hooks:** Wagmi (EVM), Custom Hooks (Solana/Cosmos)

### Backend & Data Layer

- **API Runtime:** Next.js API Routes (Edge & Serverless)
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth + HttpOnly Session Cookies
- **Security:** Server-side API Key Hashing, Rate Limiting

### Integration Layer (The "Brain")

The core logic resides in a unified `PaymentInterface` that abstracts the complexity of 6 different SDKs:

1.  **Quote Aggregation:** Fetches quotes from all providers in parallel.
2.  **Normalization:** Standardizes different quote formats into a single `Quote` interface.
3.  **Route Scoring:** Ranks routes based on `(Output Amount - Fees) / Time`.
4.  **Execution Orchestrator:** Handles the specific transaction lifecycle (Approve -> Swap -> Bridge) for the selected provider.

## API Documentation

For integrators and developers, the platform includes a dedicated documentation portal.

**Access the Documentation:**

- **Local Development:** Navigate to `/docs` (e.g., `http://localhost:3000/docs`)
- **Key Sections:**
  - **Authentication:** API Key generation and security best practices.
  - **Payment Links:** Creating, retrieving, and managing payment sessions.
  - **Transactions:** Reconciling payments and verifying status.

### Example: Create a Payment Link

```bash
curl -X POST https://flashprotocol.com/api/v1/payment-links \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.00,
    "currency": "USD",
    "title": "Enterprise License",
    "success_url": "https://your-platform.com/success"
  }'
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/HoomanBuilds/flash-protocol.git
    cd payment-gateway
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Configure environment:**

    Create a `.env.local` file with the required keys (Supabase, WalletConnect, Provider Keys).

    ```env
    NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
    SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-for-admin-operations

    NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_reown_project_id
    NEXT_PUBLIC_ALCHEMY_KEY=your_alchemy_api_key

    # Exchange Providers
    RANGO_API_KEY=c6381a79-2817-4602-83bf-6a641a409e32
    NEAR_INTENTS_JWT=your_near_intents_jwt_token

    NEXT_PUBLIC_ENABLE_TESTNETS=true
    ```

4.  **Launch development environment:**

    ```bash
    npm run dev
    ```

## License
MIT