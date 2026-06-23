import {
  Alert,
  Button,
  Chip,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
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
  PricingCatalogPositionResponse,
  PricingCatalogVersionResponse,
  publishPricingCatalog,
  TradeCode,
  TradeConfigResponse,
  updatePricingCatalog,
  UpdatePricingCatalogPositionRequest,
} from '../services/pricing-catalogs.service';
import { PricingCatalogPositionDialog } from './PricingCatalogPositionDialog';
import { mapCatalogToTableRows } from './pricing-catalog.utils';

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

function formatCents(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value / 100);
}

function formatVatRate(value: string): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function toOptionalNumber(value: string | null): number | undefined {
  if (value === null) {
    return undefined;
  }

  return Number(value);
}

function toUpdatePositionRequest(
  position: PricingCatalogPositionResponse,
): UpdatePricingCatalogPositionRequest {
  return {
    key: position.key,
    label: position.label,
    unit: position.unit,
    netPriceCents: position.netPriceCents,
    vatRate: Number(position.vatRate),
    minQuantity: toOptionalNumber(position.minQuantity),
    maxQuantity: toOptionalNumber(position.maxQuantity),
    attributes: position.attributes,
    surcharges: [],
  };
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
  const [positionDialogOpen, setPositionDialogOpen] = useState(false);
  const [savingPosition, setSavingPosition] = useState(false);
  const [publishingDraft, setPublishingDraft] = useState(false);
  const [snack, setSnack] = useState<{ severity: 'success' | 'error'; message: string } | null>(
    null,
  );

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
    const userCraftsmanId = user?.craftsmanId;

    if (!userCraftsmanId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const [craftsmanResult, tradesResult] = await Promise.all([
        fetchCraftsman(userCraftsmanId),
        listTrades(),
      ]);

      const assignedTradeConfigs = tradesResult.filter((trade) =>
        craftsmanResult.trades.includes(trade.trade),
      );

      const catalogEntries = await Promise.all(
        assignedTradeConfigs.map(async (trade) => {
          const catalogs = await listPricingCatalogs(craftsmanResult.id, trade.trade as TradeCode);

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

    const trade = selectedTrade as TradeCode;

    setCreatingDraft(true);
    setLoadError(null);

    try {
      const created = await createPricingCatalog({
        craftsmanId: craftsman.id,
        trade,
        effectiveFrom: new Date().toISOString(),
      });

      setCatalogsByTrade((current) => ({
        ...current,
        [selectedTrade]: [created, ...(current[selectedTrade] ?? [])],
      }));

      setSnack({ severity: 'success', message: t('pricing.messages.draftCreated') });
    } catch (err: unknown) {
      const message =
        err instanceof ApiError ? err.message : t('pricing.messages.createDraftFailed');

      setSnack({ severity: 'error', message });
    } finally {
      setCreatingDraft(false);
    }
  }, [craftsman, selectedTrade, t]);

  const savePosition = useCallback(
    async (position: UpdatePricingCatalogPositionRequest): Promise<void> => {
      if (!draft || !selectedTrade) {
        return;
      }

      setSavingPosition(true);
      setLoadError(null);

      try {
        const updated = await updatePricingCatalog(draft.id, {
          positions: [...draft.positions.map(toUpdatePositionRequest), position],
        });

        setCatalogsByTrade((current) => ({
          ...current,
          [selectedTrade]: (current[selectedTrade] ?? []).map((catalog) =>
            catalog.id === updated.id ? updated : catalog,
          ),
        }));

        setPositionDialogOpen(false);
        setSnack({ severity: 'success', message: t('pricing.messages.positionSaved') });
      } catch (err: unknown) {
        const message =
          err instanceof ApiError ? err.message : t('pricing.messages.positionSaveFailed');

        setSnack({ severity: 'error', message });
      } finally {
        setSavingPosition(false);
      }
    },
    [draft, selectedTrade, t],
  );

  const publishDraft = useCallback(async (): Promise<void> => {
    if (!draft || !selectedTrade) {
      return;
    }

    setPublishingDraft(true);
    setLoadError(null);

    try {
      const publishedCatalog = await publishPricingCatalog(draft.id);

      setCatalogsByTrade((current) => ({
        ...current,
        [selectedTrade]: [
          publishedCatalog,
          ...(current[selectedTrade] ?? []).filter((catalog) => catalog.id !== publishedCatalog.id),
        ],
      }));

      setSnack({ severity: 'success', message: t('pricing.messages.published') });
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : t('pricing.messages.publishFailed');

      setSnack({ severity: 'error', message });
    } finally {
      setPublishingDraft(false);
    }
  }, [draft, selectedTrade, t]);

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
              <Chip label={draft ? t('pricing.status.hasDraft') : t('pricing.status.noDraft')} />
              <Chip
                label={
                  published ? t('pricing.status.hasPublished') : t('pricing.status.noPublished')
                }
              />
            </Stack>
          </Stack>

          {draft ? (
            <CatalogPositionsTable
              catalog={draft}
              title={t('pricing.sections.draft')}
              publishing={publishingDraft}
              onAddPosition={() => setPositionDialogOpen(true)}
              onPublish={publishDraft}
            />
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
            <CatalogPositionsTable catalog={published} title={t('pricing.sections.published')} />
          ) : null}
        </Stack>
      </Paper>

      <PricingCatalogPositionDialog
        open={positionDialogOpen}
        fields={selectedTradeConfig?.pricingSchema?.fields ?? []}
        onClose={() => setPositionDialogOpen(false)}
        onSave={savePosition}
        saving={savingPosition}
      />

      <Snackbar
        open={!!snack}
        autoHideDuration={3500}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {snack ? (
          <Alert severity={snack.severity} onClose={() => setSnack(null)}>
            {snack.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Stack>
  );
}

function CatalogPositionsTable(props: {
  catalog: PricingCatalogVersionResponse;
  title: string;
  publishing?: boolean;
  onAddPosition?: () => void;
  onPublish?: () => void;
}): JSX.Element {
  const { catalog, title, publishing = false, onAddPosition, onPublish } = props;
  const { t } = useTranslation();
  const rows = mapCatalogToTableRows(catalog);
  const canEdit = !!onAddPosition && !!onPublish;

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between">
          <Stack spacing={0.5}>
            <Typography variant="h3">{title}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('pricing.effectiveFrom', { date: formatDate(catalog.effectiveFrom) })}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            {canEdit ? (
              <>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={onAddPosition}
                  disabled={publishing}
                >
                  {t('pricing.positions.add')}
                </Button>
                <Button variant="contained" size="small" onClick={onPublish} disabled={publishing}>
                  {publishing ? t('pricing.publishing') : t('pricing.publish')}
                </Button>
              </>
            ) : null}
            <Chip label={catalog.status} />
          </Stack>
        </Stack>

        {rows.length === 0 ? (
          <Alert severity="info">{t('pricing.empty.noPositions')}</Alert>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('pricing.positions.key')}</TableCell>
                <TableCell>{t('pricing.positions.label')}</TableCell>
                <TableCell>{t('pricing.positions.unit')}</TableCell>
                <TableCell align="right">{t('pricing.positions.netPrice')}</TableCell>
                <TableCell align="right">{t('pricing.positions.vatRate')}</TableCell>
                <TableCell>{t('pricing.positions.attributes')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell>{row.key}</TableCell>
                  <TableCell>{row.label}</TableCell>
                  <TableCell>{row.unit}</TableCell>
                  <TableCell align="right">{formatCents(row.netPriceCents)}</TableCell>
                  <TableCell align="right">{formatVatRate(row.vatRate)}</TableCell>
                  <TableCell>{row.attributesSummary}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Stack>
    </Paper>
  );
}
