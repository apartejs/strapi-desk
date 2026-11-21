import { Typography } from '@strapi/design-system';
import type { Row } from '../api';
import { useWords } from './words';

/** Where a conversation stands, in a few coloured words. */
export const StateChip = ({ row, me }: { row: Pick<Row, 'state' | 'holder'>; me: number | null }) => {
  const { t } = useWords();
  const [color, label] =
    row.state === 'held'
      ? row.holder?.id === me
        ? (['success600', t('chip.yours')] as const)
        : (['neutral600', row.holder ? t('chip.held', { name: row.holder.name }) : t('chip.held_anyone')] as const)
      : row.state === 'wanted'
        ? (['warning600', t('chip.wanted')] as const)
        : row.state === 'closed'
          ? (['neutral500', t('chip.closed')] as const)
          : (['primary600', t('chip.assistant')] as const);
  return (
    <Typography variant="pi" fontWeight="bold" textColor={color} style={{ whiteSpace: 'nowrap' }}>
      {label}
    </Typography>
  );
};
