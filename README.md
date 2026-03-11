# safe-anvil-mock

[![CI](https://github.com/mlachgar/safe-anvil-mock/actions/workflows/ci.yml/badge.svg)](https://github.com/mlachgar/safe-anvil-mock/actions/workflows/ci.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=mlachgar_safe-anvil-mock&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=mlachgar_safe-anvil-mock)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=mlachgar_safe-anvil-mock&metric=coverage)](https://sonarcloud.io/summary/new_code?id=mlachgar_safe-anvil-mock)

Standalone Node.js ESM + Express mock of the Safe Transaction Service for local integration tests.

## Features

- validates Safe proposal signatures
- stores confirmations in memory
- executes proposed calls on Anvil when the threshold is reached
- exposes `POST /mock/transactions/:safeTxHash/confirm/` for IT flows
- exposes Safe-like confirmation endpoints for clients that post or list confirmations directly

## Supported Endpoints

- `GET /health/`
- `GET /v1/safes/:safe/`
- `GET /v2/safes/:safe/multisig-transactions/`
- `POST /v2/safes/:safe/multisig-transactions/`
- `GET /v2/multisig-transactions/:safeTxHash/`
- `GET /v1/multisig-transactions/:safeTxHash/confirmations/`
- `POST /v1/multisig-transactions/:safeTxHash/confirmations/`
- `POST /mock/transactions/:safeTxHash/confirm/`

The multisig transaction list supports the most common mock-friendly query params:

- `executed`
- `nonce`
- `nonce__gte`
- `ordering` such as `nonce` or `-nonce`
- `limit`
- `offset`

## Run locally

```bash
npm install
npm start
```

## Environment Variables

`safe-anvil-mock` reads its configuration from environment variables.

### Required

- `RPC_URL`
  RPC endpoint used for on-chain execution.
  This must point to Anvil, because execution relies on `anvil_impersonateAccount` and `anvil_setBalance`.
  Example: `RPC_URL=http://anvil:8546`

- `SYSTEM_PUBLIC_KEY`
  Address of the proposer owner expected by the mock.
  Your application usually signs Safe proposals with the corresponding private key, and `safe-anvil-mock` verifies that the recovered signer matches one of the configured Safe owners.
  Example: `SYSTEM_PUBLIC_KEY=0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A`

### Optional

- `PORT`
  HTTP port exposed by the service.
  Default: `8000`

- `SAFE_MOCK_THRESHOLD`
  Number of confirmations required before the mock executes the transaction on Anvil.
  Default behavior: if omitted, the threshold is set to the number of configured owners.

- `SAFE_MOCK_CONFIRMER_PRIVATE_KEY`
  Private key of the second mock owner used when your test calls `POST /mock/transactions/:safeTxHash/confirm/` without providing a signature.
  The service signs the Safe tx hash with this key and uses it as the additional confirmation.

- `SAFE_MOCK_OWNERS`
  Comma-separated list of extra owner addresses.
  This is useful if you want explicit owner control instead of relying only on `SYSTEM_PUBLIC_KEY` and the address derived from `SAFE_MOCK_CONFIRMER_PRIVATE_KEY`.
  Example:
  `SAFE_MOCK_OWNERS=0x111...,0x222...`

### How Owners Are Built

At runtime, the owner list is assembled in this order:

1. addresses from `SAFE_MOCK_OWNERS`
2. `SYSTEM_PUBLIC_KEY`
3. the address derived from `SAFE_MOCK_CONFIRMER_PRIVATE_KEY`

Duplicates are removed automatically.

### Typical Configurations

`1/1` local flow:

```env
RPC_URL=http://anvil:8546
SYSTEM_PUBLIC_KEY=0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A
SAFE_MOCK_THRESHOLD=1
```

In that mode, the proposal already carries the only required confirmation. The transaction is stored as confirmed, but it is still your test or your workflow that decides when to call `POST /mock/transactions/:safeTxHash/confirm/` if you want to trigger execution in a production-like way.

`2/2` integration flow:

```env
RPC_URL=http://anvil:8546
SYSTEM_PUBLIC_KEY=0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A
SAFE_MOCK_CONFIRMER_PRIVATE_KEY=0x2222222222222222222222222222222222222222222222222222222222222222
SAFE_MOCK_THRESHOLD=2
```

In that mode:

1. your application proposes the Safe transaction and signs it as `SYSTEM`
2. `safe-anvil-mock` verifies the proposer signature
3. your test calls `POST /mock/transactions/:safeTxHash/confirm/`
4. the mock adds the second signature and executes the call on Anvil

### Integration With Your Application

Your application must point its Safe transaction service URL to this container.

Example:

```env
SAFE_TX_SERVICE_URL=http://safe-anvil-mock:8000
```
