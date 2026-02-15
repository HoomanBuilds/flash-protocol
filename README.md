# Flash Protocol

Flash Protocol is an enterprise-grade, non-custodial cryptocurrency payment orchestration platform. It is engineered to bridge the gap between traditional commerce and decentralized finance, empowering merchants to accept payments in any token across over 70 blockchain networks while maintaining a seamless, single-currency settlement workflow.

## Strategic Overview

The platform operates as a liquidity aggregator and payment orchestrator. By leveraging advanced cross-chain routing protocols, it guarantees the most efficient execution path for every transaction. The system aggregates liquidity from six major cross-chain providers, ensuring minimal slippage and optimal gas costs for users, while delivering settlement in the merchant's preferred stablecoin.

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

### Liquidity Aggregation Engine

Our proprietary `TransactionExecutor` aggregates and compares routes from the industry's leading cross-chain bridges and DEX aggregators to orchestrate the optimal path for every payment.

**Integrated Providers:**

1.  **LI.FI:** Comprehensive bridge and DEX aggregator for any-to-any swaps.
2.  **Rango Exchange:** Cross-chain DEX aggregator connecting Cosmos, Solana, and EVM ecosystems.
3.  **Rubic:** Multi-chain tech aggregator supporting over 70 blockchains.
4.  **Symbiosis:** Decentralized liquidity protocol enabling single-click cross-chain swaps.
5.  **Circle CCTP:** Cross-Chain Transfer Protocol for capital-efficient, native USDC transfers.
6.  **Near Intents:** Intent-based execution for highly efficient, slippage-protected swaps.

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

The application is built on a modern, scalable stack designed for security and performance:

- **Frontend:** Next.js 16 (React), Tailwind CSS, Shadcn UI
- **Blockchain Interaction:** Wagmi, Viem, TanStack Query
- **Backend/Database:** Supabase (PostgreSQL), Next.js API Routes
- **Integration:** @lifi/sdk, rango-sdk-basic, Symbiosis API

## API Documentation

For integrators and developers, the platform includes a dedicated documentation portal.

**Access the Documentation:**

- **Local Development:** Navigate to `/docs` (e.g., `https://flash-protocol.vercel.app/docs`)
- **Key Sections:**
  - **Authentication:** API Key generation and security best practices.
  - **Payment Links:** Creating, retrieving, and managing payment sessions.
  - **Transactions:** Reconciling payments and verifying status.

### Example: Create a Payment Link

```bash
curl -X POST https://flash-protocol.vercel.app/api/v1/payment-links \
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
    git clone https://github.com/flash-protocol/payment-gateway.git
    cd payment-gateway
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Configure environment:**

    Create a `.env.local` file with the required keys (Supabase, WalletConnect, Provider Keys).

    ```env
    NEXT_PUBLIC_SUPABASE_URL=...
    NEXT_PUBLIC_SUPABASE_ANON_KEY=...
    NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=...
    ```

4.  **Launch development environment:**

    ```bash
    npm run dev
    ```

## License

Copyright © 2024 Flash Protocol. All rights reserved.
This project is proprietary and confidential. Unauthorized copying, distribution, or modification of this file, via any medium, is strictly prohibited.
