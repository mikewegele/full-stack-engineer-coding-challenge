# DESIGN.md

## Pricing Catalog Service

This document summarizes the main implementation decisions for the pricing catalog feature.

## Scope

Implemented backend support for versioned pricing catalogs per `(craftsmanId, trade)`, an admin-facing trade schema
editor, and a partner-facing pricing catalog workflow.

Implemented:

- draft catalog creation and updates
- catalog publishing
- quote calculation for exact catalog versions
- quote calculation against the active published catalog
- trade-specific attribute validation through `pricingSchema`
- admin editing of trade schemas through structured form controls
- schema patch conflict detection for existing catalog positions
- partner catalog management by assigned trade
- dynamic partner position forms based on trade schemas
- published catalog display in the partner portal
- quote preview for published partner catalogs
- local reset script for pricing catalog test data
- optional 24-hour idempotency for both quote endpoints

## Data Model

A pricing catalog version belongs to one craftsman and one trade. It contains positions, position surcharges, catalog
discounts, status, `effectiveFrom`, and publication metadata.

Published versions are treated as immutable. Draft versions can be updated.

Positions use stable string keys and store trade-specific attributes as JSONB. These attributes are validated against
the trade's `pricingSchema`, which is stored on `TradeConfig`. This keeps the relational catalog model stable while
allowing each trade to define different pricing inputs.

The current implementation allows only one published catalog per `(craftsmanId, trade)`. This keeps active lookup
deterministic and avoids overlapping active intervals. Historical interval-based version lookup was left out.

## Money Representation

Money is stored and calculated as integer minor units, currently cents.

Reasons:

- avoids floating-point surprises for stored prices and totals
- keeps database values deterministic
- makes API responses easy to compare in tests

Percentage-based adjustments can create fractional cents. These intermediate values are rounded with `Math.round` at the
point where the percentage amount is materialized.

Example: a 10% surcharge on `999` cents produces `99.9` cents and is rounded to `100` cents.

The API returns monetary values as integer cents. Formatting into localized Euro strings belongs to the frontend.

## Quote Calculation

The calculator evaluates a quote in this order:

1. resolve each requested `positionKey`
2. validate quantity against `minQuantity` / `maxQuantity`
3. calculate line net amount as `quantity × netPriceCents`
4. apply selected position surcharges
5. apply catalog discounts in `sortOrder`
6. apply discount caps immediately before the next discount is evaluated
7. group remaining net amounts by VAT rate
8. calculate VAT per VAT group
9. return line items, VAT breakdown, and totals

This order keeps line-level adjustments local to the line and catalog-level discounts deterministic.

The partner portal currently exposes quote preview for published catalogs using position and quantity. Attribute-based
quote requests were intentionally not added because the backend quote DTO accepts position keys, quantities, and
optional surcharge keys, but not arbitrary attributes.

## Quote Idempotency

Both quote endpoints accept an optional `Idempotency-Key` header. Records are scoped by user and key and expire after
24 hours. A SHA-256 hash covers the canonical request body and quote target, preventing reuse of a key for another
catalog or request.

The serialized response is stored as text. Repeating the same request returns the cached response byte-identically;
reusing the key with a different request returns `409 Conflict`. Requests without a key bypass persistence. A unique
database constraint and pessimistic row lock coordinate concurrent requests using the same key.

## Trade-Specific Pricing Schema

`pricingSchema` is stored as JSONB on `TradeConfig`.

Supported schema features:

- field types: `string`, `number`, `boolean`, `enum`
- required fields
- numeric `min` / `max`
- enum value lists
- conditional fields through `dependsOn`

Validation is implemented as a pure function and is applied when draft positions are written.

Schema updates through `PATCH /trades/:trade` reject incompatible changes with `409 Conflict` if existing positions in
any catalog version would become invalid. I chose rejection over a `SCHEMA_DRIFTED` state because it keeps published
audit data simple and avoids introducing a second lifecycle state for versions.

## Publishing and Concurrency

Publishing runs inside a database transaction. The service checks that the catalog exists, the caller may access the
craftsman, the catalog is still a draft, and no published catalog already exists for the same `(craftsmanId, trade)`.

A pessimistic database lock is used during publishing so two concurrent publish calls cannot both win.

After publishing, the service reloads the catalog with positions, surcharges, and discounts before returning the
response. This ensures the partner portal can show the newly published catalog immediately without requiring a browser
refresh.

Rejected alternatives:

- Unique partial index: useful for a single published row, but less flexible once validity intervals or superseding
  behavior are added.
- Advisory lock: also viable, but easier to misuse because it is detached from the affected rows and less visible in
  normal relational access patterns.

## Access Control

Admins may access all pricing catalogs.

Craftsman users may only access catalogs belonging to their own `craftsmanId`. These row-level checks live in the
service layer and are used consistently for read, write, publish, and quote operations.

## Admin Portal

The admin portal provides a structured schema editor on the trade configuration page.

It supports:

- adding, editing, deleting, and reordering fields
- field types `string`, `number`, `boolean`, `enum`
- `min` / `max` for number fields
- allowed values for enum fields
- optional `dependsOn` configuration
- validation before saving
- MUI field-level validation for invalid schema fields
- success and error feedback via MUI states/snackbar
- generated API types from the OpenAPI document, with a narrower local type for `pricingSchema`

The editor intentionally avoids direct JSON editing.

## Partner Portal

The partner portal provides a pricing catalog workflow for authenticated craftsman users.

It supports:

- login redirect directly to the pricing catalog page
- listing assigned trade categories
- loading draft and published catalogs per trade
- creating an empty draft catalog
- adding positions through a dynamic form based on the trade schema
- validating required fields and numeric values with MUI form states
- publishing a draft catalog
- displaying the active published catalog
- calculating a quote preview for published catalog positions

The partner portal uses the generated OpenAPI types where available and adds local response types for quote results
where the generated schema does not expose a complete response DTO.

## Local Development Utilities

A helper script was added for resetting pricing catalog test data without deleting users, trades, or craftsmen:

```bash
./scripts/db/reset-pricing-catalogs.sh windows
./scripts/db/reset-pricing-catalogs.sh hvac
./scripts/db/reset-pricing-catalogs.sh
```

The script targets the `pricing` database and the `pricing_service` schema. It deletes pricing catalog versions and
their dependent positions, surcharges, and discounts for a given trade or for all trades.

## Not Implemented

The following parts were intentionally left out or simplified:

- time-travel quote lookup by arbitrary timestamp
- multiple published versions with validity intervals
- automatic replacement of an existing published catalog when publishing a new draft
- Terraform / AWS deployment
- advanced migration tooling for already existing position attributes
- attribute-based quote requests

These were cut to keep the implemented backend, calculator, schema validation, admin configuration path, and partner
catalog workflow coherent and tested.

## Tests

Implemented tests cover:

- schema validation, including `dependsOn`
- trade schema patch compatibility
- quote calculation and quote edge cases
- VAT grouping and discount behavior
- publishing behavior
- active published catalog quoting
- access control checks
- admin schema editor data-processing helpers
- partner pricing catalog table mapping helpers
- quote idempotency: cached replay, conflicting request, and expired-key reuse

Current verification commands:

- `yarn workspace @sandbox/admin-portal test`
- `yarn workspace @sandbox/admin-portal build`
- `yarn workspace @sandbox/partner-portal test`
- `yarn workspace @sandbox/partner-portal build`
- `yarn workspace @sandbox/pricing-service test`

## Manual Verification

The main browser flow was verified manually:

1. Admin configures optional schema fields for a trade.
2. Partner logs in and is redirected to the pricing catalog page.
3. Partner creates a draft catalog.
4. Partner adds a position using dynamic schema fields.
5. Partner publishes the draft.
6. The published catalog updates without requiring a refresh.
7. Partner calculates a quote preview.
8. Quote totals are displayed without `NaN` values.
9. Both quote endpoints return byte-identical responses for repeated requests with the same idempotency key.
10. Reusing a key with a different request returns `409 Conflict`.

## Run Notes

The stack runs through Docker Compose:

```bash
docker compose up --build
```

The pricing service exposes Swagger at:

```text
http://localhost:3000/api/docs
```

OpenAPI types can be regenerated from the running pricing service:

```bash
yarn workspace @sandbox/admin-portal generate:pricing-api
yarn workspace @sandbox/partner-portal generate:pricing-api
```

Run database migrations:

```bash
yarn workspace @sandbox/pricing-service migration:run
```

Type-check the pricing service:

```bash
yarn workspace @sandbox/pricing-service tsc --noEmit -p tsconfig.json
```

## AI Usage

Manually started and implemented:

- service logic and private helper methods
- DTOs, entities, and controller endpoints
- validation schema
- initial quote calculation structure
- admin schema editor integration and UI flow
- partner pricing catalog workflow
- local reset script for pricing catalog test data

AI-assisted parts:

- fixing TypeScript and test errors during implementation
- reviewing and improving DTOs, entities, and controller code
- refining quote calculation logic
- checking edge cases and validation behavior
- reviewing frontend schema-editor state handling
- refactoring frontend components into smaller files
- admin-portal and partner-portal i18n keys and validation messages
- documentation wording
- designing and implementing quote idempotency, including persistence, request hashing, locking, and tests

Validation and review:

- reviewed generated suggestions manually before applying them
- rejected or adjusted suggestions that did not fit the existing project structure
- validated backend behavior with the pricing-service test suite
- validated admin data-processing logic with the admin-portal test suite
- validated partner catalog helper logic with the partner-portal test suite
- manually tested the admin schema editor in the browser
- manually tested the partner draft, publish, and quote-preview flow in the browser
- verified persisted `pricingSchema` and pricing catalog values through the database/API
- ran all 88 pricing-service tests and the TypeScript compiler
- executed the idempotency migration against PostgreSQL
- verified cached replay and conflict handling through both quote endpoints
