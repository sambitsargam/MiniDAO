# 🗳️ MiniDAO - Decentralized Governance Platform

MiniDAO is a decentralized governance platform built on OneChain that enables communities to create proposals and participate in transparent voting with AI-powered assistance.

## Features

- **Smart Proposals**: AI-generated summaries for better understanding
- **Transparent Voting**: Every vote recorded immutably on-chain
- **Spam Protection**: AI filters low-quality proposals automatically
- **Member Management**: Join DAOs and participate in governance

## Project Structure

```
MiniDAO/
├── contracts/          # Move smart contracts
│   ├── Move.toml
│   └── sources/
│       └── minidao.move
└── frontend/           # React TypeScript frontend
    ├── src/
    │   ├── App.tsx
    │   ├── App.css
    │   └── main.tsx
    └── .env
```

## Prerequisites

- Rust (stable)
- Node.js 18+
- OneChain CLI installed
- OneChain wallet with testnet ONE tokens

## Installation & Deployment

### 1. Setup OneChain

```bash
git clone https://github.com/one-chain-labs/onechain.git
cd onechain
cargo install --path crates/one --locked --features tracing
one client new-env --alias testnet --rpc https://rpc-testnet.onelabs.cc:443
one client switch --env testnet
```

### 2. Deploy Contract

```bash
cd MiniDAO/contracts
one move build
one client publish --gas-budget 50000000 .
```

### 3. Configure Frontend

Update `frontend/.env`:
```
VITE_PACKAGE_ID=0x<your_package_id>
```

### 4. Run Frontend

```bash
cd frontend
npm install
npm run dev
```

## Usage

1. Connect your OneChain wallet
2. Create a DAO with name and description
3. Members can join the DAO
4. Create proposals with AI-generated summaries
5. Members vote on proposals
6. View voting results on-chain

## Smart Contract Functions

- `create_dao`: Create a new DAO
- `create_proposal`: Submit a new proposal
- `vote`: Cast vote on a proposal
- `join_dao`: Join an existing DAO
- `get_dao_info`: View DAO details
- `get_proposal_votes`: View voting results

## Technology Stack

- **Blockchain**: OneChain (Move language)
- **Frontend**: React + TypeScript + Vite
- **Styling**: Custom CSS with particle effects
- **Wallet Integration**: @onelabs/dapp-kit

## License

MIT License
