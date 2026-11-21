import { Box, Flex, Loader, Searchbar, Typography } from '@strapi/design-system';
import { Archive, Bell, Sparkle, User } from '@strapi/icons';
import type { Row, Tab } from '../api';
import { Avatar, Count, Meta, Reason, RowButton, Scroll, Segment, Segmented, initials } from './ui';
import { useWords } from './words';

interface Props {
  tab: Tab;
  onTab: (tab: Tab) => void;
  q: string;
  onSearch: (q: string) => void;
  rows: Row[] | null;
  counts: { wanted: number; mine: number } | null;
  open: string | null;
  onOpen: (id: string) => void;
  me: number | null;
}

const TABS: Tab[] = ['wanted', 'mine', 'all'];

/** Under the last message: why it waits, who holds it, or that the assistant answers. */
const RowMeta = ({ row, me }: { row: Row; me: number | null }) => {
  const { t } = useWords();
  if (row.state === 'wanted') {
    return (
      <Reason $tone="warning" title={row.wanted?.reason ?? undefined}>
        <Bell aria-hidden />
        <span>{row.wanted?.reason || t('chip.wanted')}</span>
      </Reason>
    );
  }
  if (row.state === 'held') {
    return (
      <Flex justifyContent="space-between" gap={2} width="100%">
        <Meta $tone={row.holder?.id === me ? 'success' : 'neutral'}>
          <User aria-hidden />
          <span>{row.holder?.id === me ? t('chip.yours') : (row.holder?.name ?? '')}</span>
        </Meta>
        {row.waiting ? <Meta $tone="danger">{t('waiting')}</Meta> : null}
      </Flex>
    );
  }
  if (row.state === 'closed') {
    return (
      <Meta>
        <Archive aria-hidden />
        <span>{t('chip.closed')}</span>
      </Meta>
    );
  }
  return (
    <Meta>
      <Sparkle aria-hidden />
      <span>{t('assistant')}</span>
    </Meta>
  );
};

/** The conversations, as in a support inbox: tabs, a search, one row each. */
export const ConversationList = ({ tab, onTab, q, onSearch, rows, counts, open, onOpen, me }: Props) => {
  const { t, ago } = useWords();
  const count = (which: Tab) => (which === 'wanted' ? counts?.wanted : which === 'mine' ? counts?.mine : undefined);
  const empty = q ? t('no_match') : tab === 'wanted' ? t('empty.wanted') : tab === 'mine' ? t('empty.mine') : t('empty.description');

  return (
    <>
      <Flex direction="column" alignItems="stretch" gap={3} padding={4}>
        <Segmented role="tablist" aria-label={t('plugin.name')}>
          {TABS.map((which) => (
            <Segment key={which} type="button" role="tab" aria-selected={tab === which} $active={tab === which} onClick={() => onTab(which)}>
              {t(`tabs.${which}`)}
              {count(which) ? <Count $strong={which === 'wanted'}>{count(which)}</Count> : null}
            </Segment>
          ))}
        </Segmented>
        <Searchbar
          name="q"
          size="S"
          value={q}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => onSearch(event.target.value)}
          onClear={() => onSearch('')}
          clearLabel={t('actions.cancel')}
          placeholder={t('search')}
        >
          {t('search')}
        </Searchbar>
      </Flex>
      <Box borderColor="neutral150" style={{ borderTopWidth: 1, borderTopStyle: 'solid' }} />
      <Scroll>
        {rows === null ? (
          <Flex justifyContent="center" padding={6}>
            <Loader small />
          </Flex>
        ) : rows.length === 0 ? (
          <Box padding={6}>
            <Typography variant="omega" textColor="neutral500" tag="p" textAlign="center">
              {empty}
            </Typography>
          </Box>
        ) : (
          <ul>
            {rows.map((row) => {
              const name = row.visitor.name || row.visitor.email || t('visitor.guest');
              const at = row.lastMessageAt ?? row.createdAt;
              return (
                <li key={row.id}>
                  <RowButton type="button" $active={row.id === open} aria-current={row.id === open ? 'true' : undefined} onClick={() => onOpen(row.id)} data-conversation={row.id}>
                    <Avatar $size={36}>{initials(name)}</Avatar>
                    <Flex direction="column" alignItems="stretch" gap={1} flex="1" minWidth={0}>
                      <Flex justifyContent="space-between" gap={2}>
                        <Typography fontWeight="bold" textColor="neutral800" ellipsis>
                          {name}
                        </Typography>
                        <Typography
                          variant="pi"
                          fontWeight={row.waiting || row.state === 'wanted' ? 'bold' : undefined}
                          textColor={row.waiting || row.state === 'wanted' ? 'danger600' : 'neutral500'}
                          style={{ whiteSpace: 'nowrap' }}
                        >
                          {ago(at)}
                        </Typography>
                      </Flex>
                      <Typography variant="omega" textColor="neutral700" ellipsis>
                        {row.lastMessage || row.title || ''}
                      </Typography>
                      <Box paddingTop={1}>
                        <RowMeta row={row} me={me} />
                      </Box>
                    </Flex>
                  </RowButton>
                </li>
              );
            })}
          </ul>
        )}
      </Scroll>
    </>
  );
};
