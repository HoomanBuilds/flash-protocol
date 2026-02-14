# Payment Gateway

Payment Gateway is an enterprise-grade, multi-chain cryptocurrency payment processing platform designed to bridge the gap between traditional commerce and decentralized finance. It empowers merchants to accept payments in any token across over 70 blockchain networks while allowing customers to pay with their preferred assets.

## Platform Overview

The platform operates as a non-custodial payment orchestrator, leveraging advanced cross-chain routing protocols to ensure seamless liquidity and execution. By aggregating liquidity from six major cross-chain providers, the system guarantees the most efficient route for every transaction, minimizing slippage and gas costs.

### Core Value Proposition

- **Universal Acceptance:** Merchants can define their settlement currency (e.g., USDC that settles on Base), while customers can pay using any token from any supported chain (e.g., ETH on Arbitrum).
- **Non-Custodial Architecture:** Funds settle directly into the merchant's wallet. The platform never holds user assets, eliminating counterparty risk.
- **Enterprise Scalability:** Built to handle high transaction volumes with sub-second quote generation and robust status tracking.
- **Developer-First:** Built with a resilient API architecture to facilitate deep integration into existing e-commerce flows and applications.

## Global Infrastructure

### Supported Networks

The platform supports payments across **70+ blockchain networks**, ensuring maximum accessibility for users regardless of where their assets are held.

- **EVM Chains:** Ethereum, Arbitrum, Optimism, Base, Polygon, BSC, Avalanche, Linea, Scroll, zkSync Era, and more.
- **Non-EVM Chains:** Solana, Cosmos (via Rango), Tron, TON, Starknet.
- **Bitcoin Ecosystem:** Bitcoin, Litecoin (via Rango).

### Liquidity Aggregation Engine

Our proprietary `TransactionExecutor` aggregates and compares routes from the industry's leading cross-chain bridges and DEX aggregators to find the optimal path for every payment.

**Integrated Providers:**

1.  **LI.FI:** A leading liquidity aggregator that connects bridges and DEXs for seamless any-to-any swaps.
2.  **Rango Exchange:** The first cross-chain DEX aggregator for the Cosmos, Solana, and EVM ecosystems.
3.  **Rubic:** A cross-chain tech aggregator supporting over 70 blockchains and 15,500+ assets.
4.  **Symbiosis:** A decentralized multi-chain liquidity protocol that enables single-click swaps.
5.  **Circle CCTP:** The Cross-Chain Transfer Protocol for capital-efficient USDC transfers via native burning and minting.
6.  **Near Intents:** Intent-based execution for highly efficient, slippage-protected swaps.

## Key Features

### Merchant Dashboard

A centralized command center for managing payment operations:

- **Payment Links:** Generate reusable or one-time payment links with fixed or dynamic amounts.
- **Analytics:** Real-time tracking of transaction volume, success rates, and revenue.
- **API Management:** Generate and manage API keys for programmatic access.

### Smart Execution

The client-side execution engine handles the complexity of cross-chain transactions transparently:

- **Intelligent Routing:** Automatically selects the best provider based on cost, speed, and reliability.
- **Multi-Step Orchestration:** Manages token approvals, bridging, and swapping in a unified UI flow.
- **Atomic Swaps:** Supports direct contract calls for atomic providers.

### Developer API

We provide a RESTful API to enable businesses to integrate crypto payments directly into their products:

- **Programmatic Payments:** Create and manage payment intents via API.
- **Webhooks (Coming Soon):** Receive real-time notifications for transaction status updates.
- **Secure Authentication:** Secure server-to-server communication using hashed API keys.

## Technical Architecture

The application is built on a modern, scalable stack designed for performance and security:

- **Frontend:** Next.js 16 (React), Tailwind CSS, Shadcn UI
- **Blockchain Interaction:** Wagmi, Viem, TanStack Query
- **Backend/Database:** Supabase (PostgreSQL), Next.js API Routes
- **Integration:** @lifi/sdk, rango-sdk-basic, Symbiosis API

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1.  Clone the repository:

    ```bash
    git clone https://github.com/your-org/payment-gateway.git
    cd payment-gateway
    ```

2.  Install dependencies:

    ```bash
    npm install
    ```

3.  Configure environment variables:
    Create a `.env.local` file with the following keys:

    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id
    NEXT_PUBLIC_RANGO_API_KEY=your_rango_key
    ```

4.  Run the development server:
    ```bash
    npm run dev
    ```

## API Documentation

The platform includes a dedicated documentation portal for integrators.
Access the full API references and guides at `/docs` when running the application locally, or refer to the `API_DOCUMENTATION.md` file in the repository.

### Example: Create a Payment Link

```bash
curl -X POST https://api.payment-gateway.com/v1/payment-links \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "title": "Premium Subscription",
    "amount": 49.99,
    "currency": "USDC"
  }'
```

## License

This project is proprietary and confidential. Unauthorized copying of this file, via any medium, is strictly prohibited.
