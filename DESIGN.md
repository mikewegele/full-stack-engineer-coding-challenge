# DESIGN.md

## Pricing Catalog Service

This document summarizes the main implementation decisions for the pricing catalog feature.

---

## Scope

Implemented backend support for versioned pricing catalogs per `craftsmanId` and `trade`.

Main functionality:

- create draft pricing catalogs
- update draft pricing catalogs
- publish pricing catalogs
- calculate quotes for exact catalog versions
- calculate quotes using the active published catalog
- validate position attributes against a trade-specific pricing schema

---

## Data Model

A pricing catalog version belongs to one craftsman and one trade.

Each version contains:

- positions
- surcharges per position
- discounts per catalog version
- status: `DRAFT` or `PUBLISHED`
- `effectiveFrom`
- publication metadata

Published versions are treated as immutable. Draft versions can be updated.

The current implementation allows only one published catalog per `(craftsmanId, trade)`. This keeps active catalog
lookup simple and deterministic.

---

## Quote Calculation

All monetary values are represented as integer cents.

The quote calculator:

- validates requested position keys
- validates quantity limits
- applies selected surcharges
- applies discounts in `sortOrder`
- applies discount caps immediately
- calculates VAT grouped by VAT rate
- returns line items, VAT breakdown, and totals

Percentage-based adjustments are rounded with `Math.round`.

---

## Trade-Specific Pricing Schema

Trade-specific position attributes are validated through a JSONB `pricingSchema` stored on the trade configuration.

The schema supports:

- required fields
- strings, numbers, booleans, and enums
- numeric min/max constraints
- conditional required fields through `dependsOn`

Validation is implemented as a pure function and is applied when draft positions are written.

Schema updates through `PATCH /trades/:trade` return `409 Conflict` if they would invalidate existing positions.

---

## Publishing and Concurrency

Publishing is executed inside a database transaction.

The service verifies that:

- the catalog exists
- the caller may access the craftsman
- the catalog is still a draft
- no published catalog already exists for the same `(craftsmanId, trade)`

A pessimistic lock is used during publishing to avoid concurrent publication conflicts.

A future extension could replace the current single-published-version model with explicit validity intervals and
superseding behavior.

---

## Access Control

Admins may access all pricing catalogs.

Craftsman users may only access catalogs that belong to their own `craftsmanId`.

The same rule is used for quote calculation and publishing.

---

## Not Implemented

The following parts were intentionally left out or simplified:

- historical active-catalog lookup by arbitrary timestamp
- multiple published versions with validity intervals
- frontend integration beyond the available backend API
- advanced schema migration support for already existing positions

---

## Tests

The implementation is covered by tests for:

- schema validation
- draft update validation
- quote calculation
- quote edge cases
- publishing behavior
- active published catalog quoting
- access control checks

---

## AI Usage

- Manually started and implemented:
  - service logic and private helper methods
  - DTOs, entities, and controller endpoints
  - validation schema
  - initial quote calculation structure

- AI-assisted parts:
  - fixing TypeScript and test errors during implementation
  - reviewing and improving DTOs, entities, and controller code
  - refining quote calculation logic
  - checking edge cases and validation behavior
  - reviewing runtime and efficiency considerations

- All AI-assisted changes were reviewed manually and validated with the existing test suite.

