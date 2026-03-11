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
- includes integration coverage for signature compatibility across `ethers` client versions

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

## Release Docker Hub

This repository can publish Docker images automatically from Git tags matching `v*.*.*`.

### One-time GitHub setup

In the GitHub repository settings, create these Actions secrets:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

The Docker Hub token must be an access token generated from your Docker Hub account.

### Release a new version

1. bump the application version:

```bash
npm version patch
# or: npm version minor
# or: npm version major
```

2. push the branch and the tag created by `npm version`:

```bash
git push origin main --follow-tags
```

3. GitHub Actions will run the publish workflow and push these tags to Docker Hub:

- `x.y.z`
- `x.y`
- `x`
- `latest` for stable releases only

Example for a `v1.2.3` release:

- `safe-anvil-mock:1.2.3`
- `safe-anvil-mock:1.2`
- `safe-anvil-mock:1`
- `safe-anvil-mock:latest`

The workflow uses the Docker Hub repository `${DOCKERHUB_USERNAME}/safe-anvil-mock`.

## Signature Compatibility

`safe-anvil-mock` accepts the most common Safe proposal signature encodings seen in local integration flows, including differences introduced by client or SDK upgrades.

Supported proposal signature variants:

- `ethers@5` style `signMessage(arrayify(safeTxHash))`
- `ethers@6` style `signMessage(getBytes(safeTxHash))`
- `ethers@6` style `signMessage(safeTxHash)` when the hex string itself is signed
- Safe `ETH_SIGN` signatures using the adjusted `v` value (`31` / `32`)

This compatibility is covered by HTTP integration tests against `POST /v2/safes/:safe/multisig-transactions/`, using both `ethers@5` and `ethers@6`.

If your application upgrades its signing stack and proposals start failing with `Unable to recover signer from signature`, rebuild the container first to make sure the running image includes the latest compatibility fixes.

## Troubleshooting

### `Unable to recover signer from signature`

This usually means one of these things:

- the running container still uses an older build of `safe-anvil-mock`
- your application changed the way it signs `safeTxHash`
- the recovered signer is not one of the configured Safe owners

Recommended checks:

1. rebuild and restart the mock container
2. verify that `SYSTEM_PUBLIC_KEY` or `SAFE_MOCK_OWNERS` contains the proposer address
3. inspect the request body sent to `POST /v2/safes/:safe/multisig-transactions/`
4. confirm which signing method your client currently uses

Example rebuild:

```bash
docker compose build safe-anvil-mock
docker compose up -d safe-anvil-mock
```

Useful payload fields to inspect:

- `safeTxHash`
- `senderAddress`
- `senderSignature`
- `signature`
- `owner`

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
