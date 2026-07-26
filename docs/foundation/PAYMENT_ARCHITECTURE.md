# Payment Architecture

Foundation Sprint 01 implements no payment processing. This document defines a provider-neutral direction; legal, tax, security, and accounting review is required before implementation.

## Payment Orchestration Boundary

Chef Gringo should use regulated payment providers and tokenized payment methods. Card or wallet credentials must not pass through or be stored by Chef Gringo systems. A payment adapter should normalize provider intents, outcomes, refunds, disputes, and reconciliation identifiers without hiding provider-specific obligations.

## Supported Future Methods

- Credit and debit cards
- Apple Pay and Google Pay
- Bank payments
- Gift cards or account credits
- Buy-now-pay-later where appropriate and responsibly disclosed
- Selected cryptocurrency payment providers
- International and local payment options where viable

## Money and Transaction Types

The domain model must distinguish fiat currency, stable-value cryptocurrency, and volatile cryptocurrency; one-time transactions and recurring subscriptions; direct sales and marketplace payments; vendor payouts; full and partial refunds; taxes; fees; disputes; and reconciliation adjustments.

## Core Records

- Order and immutable line-item snapshot
- Payment intent and provider reference
- Authorized, captured, failed, refunded, or disputed transaction
- Ledger entries by currency and legal entity
- Tax calculation and evidence
- Vendor payable and payout
- Settlement batch and reconciliation exception
- Customer-visible receipt and refund record

## Marketplace Payments

Use a provider designed for platform onboarding, identity verification, split payments, reserves, and vendor payouts. Chef Gringo should not manually custody seller funds. Marketplace terms, prohibited businesses, dispute responsibility, and tax reporting must be explicit.

## Cryptocurrency

Crypto acceptance must address jurisdiction, accounting, tax reporting, refund policy, price volatility, network fees, wallet security, custodial versus non-custodial processing, conversion into fiat, subscription limitations, fraud, sanctions, and compliance obligations.

Prefer a regulated custodial processor with immediate fiat conversion when practical. Display a time-limited quote and the settlement currency. Refund policy must state whether refunds return the original asset amount, the fiat purchase value, or another defined amount. Chef Gringo will not create a wallet, token, cryptocurrency, or speculative feature.

## Security and Operations

Apply least privilege, provider webhooks with signature verification, idempotency keys, server-side amount calculation, immutable audit records, separated production credentials, refund permissions, monitoring, and daily reconciliation. Never expose secret keys to the browser.

## Decision Gates

Before payments: legal-entity review, tax design, product terms, privacy review, refund policy, chargeback ownership, provider comparison, accounting integration, security threat model, accessibility review, and test-mode operational rehearsal.
