import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../services/api.service';
import { CraftsmanResponse, fetchCraftsman } from '../services/craftsmen.service';
import {
  createPricingCatalog,
  listPricingCatalogs,
  listTrades,
  PricingCatalogVersionResponse,
  TradeConfigResponse,
} from '../services/pricing-catalogs.service';

type CatalogsByTrade = Record<string, PricingCatalogVersionResponse[]>;

function findDraft(
  catalogs: PricingCatalogVersionResponse[],
): PricingCatalogVersionResponse | null {
  return catalogs.find((catalog) => catalog.status === 'DRAFT') ?? null;
}

function findPublished(
  catalogs: PricingCatalogVersionResponse[],
): PricingCatalogVersionResponse | null {
  return catalogs.find((catalog) => catalog.status === 'PUBLISHED') ?? null;
}

function formatDate(value: string | null): string {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('de-DE').format(new Date(value));
}

export function PricingCatalogPage(): JSX.Element {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [craftsman, setCraftsman] = useState<CraftsmanResponse | null>(null);
  const [trades, setTrades] = useState<TradeConfigResponse[]>([]);
  const [catalogsByTrade, setCatalogsByTrade] = useState<CatalogsByTrade>({});
  const [selectedTrade, setSelectedTrade] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creatingDraft, setCreatingDraft] = useState(false);

  const assignedTrades = useMemo(() => {
    if (!craftsman) {
      return [];
    }

    return trades.filter((trade) => craftsman.trades.includes(trade.trade));
  }, [craftsman, trades]);

  const selectedTradeConfig = useMemo(
    () => assignedTrades.find((trade) => trade.trade === selectedTrade) ?? null,
    [assignedTrades, selectedTrade],
  );

  const selectedCatalogs = selectedTrade ? (catalogsByTrade[selectedTrade] ?? []) : [];
  const draft = findDraft(selectedCatalogs);
  const published = findPublished(selectedCatalogs);

  const load = useCallback(async (): Promise<void> => {
    if (!user?.craftsmanId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const [craftsmanResult, tradesResult] = await Promise.all([
        fetchCraftsman(user.craftsmanId),
        listTrades(),
      ]);

      const assignedTradeConfigs = tradesResult.filter((trade) =>
        craftsmanResult.trades.includes(trade.trade),
      );

      const catalogEntries = await Promise.all(
        assignedTradeConfigs.map(async (trade) => {
          const catalogs = await listPricingCatalogs(craftsmanResult.id, trade.trade);
          return [trade.trade, catalogs] as const;
        }),
      );

      setCraftsman(craftsmanResult);
      setTrades(tradesResult);
      setCatalogsByTrade(Object.fromEntries(catalogEntries));
      setSelectedTrade((current) => current ?? assignedTradeConfigs[0]?.trade ?? null);
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : t('pricing.messages.loadFailed');
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, [t, user?.craftsmanId]);

  useEffect(() => {
    void load();
  }, [load]);

  const createEmptyDraft = useCallback(async (): Promise<void> => {
    if (!craftsman || !selectedTrade) {
      return;
    }

    setCreatingDraft(true);

    try {
      const created = await createPricingCatalog({
        craftsmanId: craftsman.id,
        trade: selectedTrade,
        effectiveFrom: new Date().toISOString(),
      });

      setCatalogsByTrade((current) => ({
        ...current,
        [selectedTrade]: [created, ...(current[selectedTrade] ?? [])],
      }));
    } catch (err: unknown) {
      const message =
        err instanceof ApiError ? err.message : t('pricing.messages.createDraftFailed');
      setLoadError(message);
    } finally {
      setCreatingDraft(false);
    }
  }, [craftsman, selectedTrade, t]);

  if (loading) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="text" width={280} height={56} />
        <Skeleton variant="rounded" height={72} />
        <Skeleton variant="rounded" height={280} />
      </Stack>
    );
  }

  if (!user?.craftsmanId) {
    return (
      <Paper sx={{ p: 4 }}>
        <Stack spacing={1} alignItems="center" textAlign="center">
          <Typography variant="h2">{t('pricing.heading')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('pricing.empty.noCraftsman')}
          </Typography>
        </Stack>
      </Paper>
    );
  }

  if (loadError) {
    return <Alert severity="error">{loadError}</Alert>;
  }

  if (!craftsman || assignedTrades.length === 0) {
    return (
      <Paper sx={{ p: 4 }}>
        <Stack spacing={1} alignItems="center" textAlign="center">
          <Typography variant="h2">{t('pricing.heading')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('pricing.empty.noTrades')}
          </Typography>
        </Stack>
      </Paper>
    );
  }

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h1">{t('pricing.heading')}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t('pricing.subheading')}
        </Typography>
      </Stack>

      <Paper sx={{ p: 2 }}>
        <Tabs
          value={selectedTrade ?? false}
          onChange={(_, value: string) => setSelectedTrade(value)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {assignedTrades.map((trade) => (
            <Tab key={trade.trade} value={trade.trade} label={trade.displayName} />
          ))}
        </Tabs>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Stack spacing={3}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between">
            <Stack spacing={0.5}>
              <Typography variant="h2">
                {selectedTradeConfig?.displayName ?? selectedTrade}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('pricing.schemaFields', {
                  count: selectedTradeConfig?.pricingSchema?.fields?.length ?? 0,
                })}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1}>
              <Chip
                label={draft ? t('pricing.status.hasDraft') : t('pricing.status.noDraft')}
                color={draft ? 'primary' : 'default'}
              />
              <Chip
                label={
                  published ? t('pricing.status.hasPublished') : t('pricing.status.noPublished')
                }
              />
            </Stack>
          </Stack>

          {draft ? (
            <CatalogSummary catalog={draft} title={t('pricing.sections.draft')} />
          ) : (
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Stack spacing={2} alignItems="flex-start">
                <Typography variant="h3">{t('pricing.empty.noDraftTitle')}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {published
                    ? t('pricing.empty.noDraftFromPublished')
                    : t('pricing.empty.noDraftEmpty')}
                </Typography>
                <Button variant="contained" onClick={createEmptyDraft} disabled={creatingDraft}>
                  {creatingDraft ? t('pricing.creatingDraft') : t('pricing.createDraft')}
                </Button>
              </Stack>
            </Paper>
          )}

          {published ? (
            <CatalogSummary catalog={published} title={t('pricing.sections.published')} />
          ) : null}
        </Stack>
      </Paper>
    </Stack>
  );
}

function CatalogSummary(props: {
  catalog: PricingCatalogVersionResponse;
  title: string;
}): JSX.Element {
  const { catalog, title } = props;
  const { t } = useTranslation();

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between">
          <Typography variant="h3">{title}</Typography>
          <Chip label={catalog.status} />
        </Stack>

        <Typography variant="body2" color="text.secondary">
          {t('pricing.effectiveFrom', { date: formatDate(catalog.effectiveFrom) })}
        </Typography>

        <Box>
          <Typography variant="body2" color="text.secondary">
            {t('pricing.positionCount', { count: catalog.positions.length })}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}
