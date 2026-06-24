#!/usr/bin/env bash
set -euo pipefail

TRADE="${1:-}"
DB_SERVICE="${DB_SERVICE:-postgres}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-pricing}"

docker compose exec -T "$DB_SERVICE" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -v trade="$TRADE" <<'SQL'
BEGIN;

CREATE TEMP TABLE target_pricing_catalog_versions AS
SELECT id
FROM pricing_service.pricing_catalog_versions
WHERE NULLIF(:'trade', '') IS NULL OR lower(trade) = lower(:'trade');

CREATE TEMP TABLE target_pricing_catalog_positions AS
SELECT id
FROM pricing_service.pricing_catalog_positions
WHERE version_id IN (
  SELECT id FROM target_pricing_catalog_versions
);

DELETE FROM pricing_service.pricing_catalog_surcharges
WHERE position_id IN (
  SELECT id FROM target_pricing_catalog_positions
);

DELETE FROM pricing_service.pricing_catalog_positions
WHERE id IN (
  SELECT id FROM target_pricing_catalog_positions
);

DELETE FROM pricing_service.pricing_catalog_discounts
WHERE version_id IN (
  SELECT id FROM target_pricing_catalog_versions
);

DELETE FROM pricing_service.pricing_catalog_versions
WHERE id IN (
  SELECT id FROM target_pricing_catalog_versions
);

COMMIT;
SQL

if [ -z "$TRADE" ]; then
  echo "Deleted all pricing catalogs."
else
  echo "Deleted pricing catalogs for trade: $TRADE"
fi
