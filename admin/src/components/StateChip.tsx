import { Status, Typography } from '@strapi/design-system';
import type { Row } from '../api';
import { useWords } from './words';

/** Where a conversation stands, in one coloured word: the list's rows and the conversation's header. */
export const StateChip = ({ row, me }: { row: Pick<Row, 'state' | 'holder'>; me: number | null }) => {
  const { t } = useWords();
  const [variant, label] =
    row.state === 'held'
      ? row.holder?.id === me
        ? (['success', t('chip.yours')] as const)
        : (['secondary', t('chip.held', { name: row.holder?.name ?? '' })] as const)
      : row.state === 'wanted'
        ? (['warning', t('chip.wanted')] as const)
        : row.state === 'closed'
          ? (['neutral', t('chip.closed')] as const)
          : (['primary', t('chip.assistant')] as const);
  return (
    <Status variant={variant} size="XS">
      <Typography variant="pi" fontWeight="bold">
        {label}
      </Typography>
    </Status>
  );
};
