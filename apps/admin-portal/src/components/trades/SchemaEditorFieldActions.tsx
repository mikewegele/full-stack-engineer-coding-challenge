import ArrowDownwardOutlinedIcon from '@mui/icons-material/ArrowDownwardOutlined';
import ArrowUpwardOutlinedIcon from '@mui/icons-material/ArrowUpwardOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { IconButton, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface Props {
  index: number;
  fieldCount: number;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
}

export function SchemaEditorFieldActions(props: Props): JSX.Element {
  const { index, fieldCount, onMove, onRemove } = props;
  const { t } = useTranslation();

  return (
    <Stack direction="row" spacing={0.5}>
      <IconButton
        aria-label={t('trades.schemaEditor.moveFieldUp')}
        onClick={() => onMove(index, -1)}
        disabled={index === 0}
      >
        <ArrowUpwardOutlinedIcon />
      </IconButton>

      <IconButton
        aria-label={t('trades.schemaEditor.moveFieldDown')}
        onClick={() => onMove(index, 1)}
        disabled={index === fieldCount - 1}
      >
        <ArrowDownwardOutlinedIcon />
      </IconButton>

      <IconButton aria-label={t('trades.schemaEditor.removeField')} onClick={() => onRemove(index)}>
        <DeleteOutlineOutlinedIcon />
      </IconButton>
    </Stack>
  );
}
