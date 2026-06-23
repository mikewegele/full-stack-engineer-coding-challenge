# DESIGN.md

## Pricing Catalog Service

This document summarizes the main implementation decisions for the pricing catalog feature.

## Scope

Implemented backend support for versioned pricing catalogs per `(craftsmanId, trade)` and an admin-facing trade schema
editor.

Implemented:

- draft catalog creation and updates
- catalog publishing
- quote calculation for exact catalog versions
- quote calculation against the active published catalog
- trade-specific attribute validation through `pricingSchema`
- admin editing of trade schemas through structured form controls
- schema patch conflict detection for existing catalog positions

The partner-portal catalog editor was intentionally not completed. The backend API and schema model are prepared for it,
but the current frontend work focuses on the admin schema configuration path.

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

## Trade-Specific Pricing Schema

`pricingSchema` is stored as JSONB on `TradeConfig`.

Supported schema features:

- field types: `string`, `number`, `boolean`, `enum`
- required fields
- numeric `min` / `max`
- enum value lists
- conditional required fields through `dependsOn`

Validation is implemented as a pure function and is applied when draft positions are written.

Schema updates through `PATCH /trades/:trade` reject incompatible changes with `409 Conflict` if existing positions in
any catalog version would become invalid. I chose rejection over a `SCHEMA_DRIFTED` state because it keeps published
audit data simple and avoids introducing a second lifecycle state for versions.

## Publishing and Concurrency

Publishing runs inside a database transaction. The service checks that the catalog exists, the caller may access the
craftsman, the catalog is still a draft, and no published catalog already exists for the same `(craftsmanId, trade)`.

A pessimistic database lock is used during publishing so two concurrent publish calls cannot both win.

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

The admin portal now provides a structured schema editor on the trade configuration page.

It supports:

- adding, editing, deleting, and reordering fields
- field types `string`, `number`, `boolean`, `enum`
- `min` / `max` for number fields
- allowed values for enum fields
- optional `dependsOn` configuration
- validation before saving
- success and error feedback via MUI states/snackbar
- generated API types from the OpenAPI document, with a narrower local type for `pricingSchema`

The editor intentionally avoids direct JSON editing.

## Not Implemented

The following parts were intentionally left out or simplified:

- partner-portal catalog editor and dynamic position form
- time-travel quote lookup by arbitrary timestamp
- multiple published versions with validity intervals
- idempotency keys for quote endpoints
- Terraform / AWS deployment
- advanced migration tooling for already existing position attributes

These were cut to keep the implemented backend, calculator, schema validation, and admin configuration path coherent and
tested.

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

Current verification commands:

- `yarn workspace @sandbox/admin-portal test`
- `yarn workspace @sandbox/pricing-service test`

## Run Notes

The stack runs through Docker Compose:

- `docker compose up --build`

The pricing service exposes Swagger at:

- `http://localhost:3000/api/docs`

OpenAPI types for the admin portal can be regenerated from the running pricing service:

- `yarn workspace @sandbox/admin-portal generate:pricing-api`

## AI Usage

- Manually started and implemented:
  - service logic and private helper methods
  - DTOs, entities, and controller endpoints
  - validation schema
  - initial quote calculation structure
  - admin schema editor integration and UI flow

- AI-assisted parts:
  - fixing TypeScript and test errors during implementation
  - reviewing and improving DTOs, entities, and controller code
  - refining quote calculation logic
  - checking edge cases and validation behavior
  - reviewing frontend schema-editor state handling
  - admin-portal i18n keys and validation messages
  - documentation wording

- Validation and review:
  - reviewed generated suggestions manually before applying them
  - rejected or adjusted suggestions that did not fit the existing project structure
  - validated backend behavior with the pricing-service test suite
  - validated admin data-processing logic with the admin-portal test suite
  - manually tested the admin schema editor in the browser
  - verified persisted `pricingSchema` values directly through the database/API
