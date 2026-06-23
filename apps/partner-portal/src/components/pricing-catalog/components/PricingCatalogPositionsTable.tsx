import {
  Alert,
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { PricingCatalogVersionResponse } from '../../../services/pricing-catalogs.service';
import { formatCents, formatDate, formatVatRate } from '../utils/pricing-catalog-page.utils';
import { mapCatalogToTableRows } from '../utils/pricing-catalog.utils';

interface Props {
  catalog: PricingCatalogVersionResponse;
  title: string;
  publishing?: boolean;
  onAddPosition?: () => void;
  onPublish?: () => void;
  onQuote?: () => void;
}

export function PricingCatalogPositionsTable(props: Props): JSX.Element {
  const { catalog, title, publishing = false, onAddPosition, onPublish, onQuote } = props;
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

            {onQuote ? (
              <Button variant="outlined" size="small" onClick={onQuote}>
                {t('pricing.quote.open')}
              </Button>
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
