import { Divider, Paper, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { QuoteResult } from '../../../services/pricing-catalogs.service';
import { calculateTotalSurchargeCents, formatCents } from './pricing-catalog-quote-dialog.utils';

interface Props {
  result: QuoteResult;
}

export function PricingCatalogQuoteResultView(props: Props): JSX.Element {
  const { result } = props;
  const { t } = useTranslation();

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h3">{t('pricing.quote.result.title')}</Typography>

        <Stack spacing={1}>
          <ResultRow
            label={t('pricing.quote.result.subtotalNet')}
            value={formatCents(result.totals.netCents)}
          />
          <ResultRow
            label={t('pricing.quote.result.surcharge')}
            value={formatCents(calculateTotalSurchargeCents(result))}
          />
          <ResultRow
            label={t('pricing.quote.result.discount')}
            value={formatCents(result.totals.discountCents)}
          />
          <Divider />
          <ResultRow
            label={t('pricing.quote.result.totalNet')}
            value={formatCents(result.totals.netCents)}
          />
          <ResultRow
            label={t('pricing.quote.result.vat')}
            value={formatCents(result.totals.vatCents)}
          />
          <ResultRow
            label={t('pricing.quote.result.totalGross')}
            value={formatCents(result.totals.grossCents)}
            strong
          />
        </Stack>

        {result.lines.length > 0 ? (
          <Stack spacing={1}>
            <Typography variant="h4">{t('pricing.quote.result.lines')}</Typography>
            {result.lines.map((line) => (
              <Paper key={line.positionKey} variant="outlined" sx={{ p: 1.5 }}>
                <Stack spacing={0.5}>
                  <Typography variant="body1">{line.label}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('pricing.quote.result.lineSummary', {
                      quantity: line.quantity,
                      net: formatCents(line.netCents),
                      gross: formatCents(line.grossCents),
                    })}
                  </Typography>
                </Stack>
              </Paper>
            ))}
          </Stack>
        ) : null}
      </Stack>
    </Paper>
  );
}

function ResultRow(props: { label: string; value: string; strong?: boolean }): JSX.Element {
  const { label, value, strong = false } = props;

  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography variant="body2" fontWeight={strong ? 700 : 400}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={strong ? 700 : 400}>
        {value}
      </Typography>
    </Stack>
  );
}
