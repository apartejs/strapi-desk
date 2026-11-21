import { Badge, Box, Flex, Searchbar, Tabs, Typography } from '@strapi/design-system';
import type { Row, Tab } from '../api';
import { StateChip } from './StateChip';
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

const TABS: Tab[] = ['wanted', 'mine', 'waiting', 'all'];

/** The conversations on the left, as in a support inbox: tabs, a search, one row each. */
export const ConversationList = ({ tab, onTab, q, onSearch, rows, counts, open, onOpen, me }: Props) => {
  const { t, when } = useWords();
  const count = (which: Tab) => (which === 'wanted' ? counts?.wanted : which === 'mine' ? counts?.mine : undefined);

  const empty = q ? t('no_match') : tab === 'wanted' ? t('empty.wanted') : tab === 'mine' ? t('empty.mine') : t('empty.heading');

  return (
    <Flex direction="column" alignItems="stretch" gap={3} height="100%">
      <Tabs.Root value={tab} onValueChange={(value: string) => onTab(value as Tab)}>
        <Tabs.List aria-label={t('plugin.name')} style={{ overflowX: 'auto', overflowY: 'hidden' }}>
          {TABS.map((which) => (
            <Tabs.Trigger key={which} value={which} style={{ whiteSpace: 'nowrap', paddingInline: '0.75rem' }}>
              <Flex gap={1}>
                {t(`tabs.${which}`)}
                {count(which) ? <Badge active>{count(which)}</Badge> : null}
              </Flex>
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </Tabs.Root>
      <Searchbar
        name="q"
        value={q}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => onSearch(event.target.value)}
        onClear={() => onSearch('')}
        clearLabel={t('actions.cancel')}
        placeholder={t('search')}
      >
        {t('search')}
      </Searchbar>
      <Box overflow="auto" flex="1" background="neutral0" hasRadius shadow="tableShadow">
        {rows && rows.length === 0 ? (
          <Box padding={6}>
            <Typography textColor="neutral600">{empty}</Typography>
          </Box>
        ) : null}
        <Box tag="ul">
          {(rows ?? []).map((row) => (
            <Box tag="li" key={row.id} borderColor="neutral150" style={{ borderBottomWidth: 1, borderBottomStyle: 'solid' }}>
              <Box
                tag="button"
                type="button"
                onClick={() => onOpen(row.id)}
                aria-current={row.id === open ? 'true' : undefined}
                padding={3}
                width="100%"
                background={row.id === open ? 'primary100' : 'neutral0'}
                style={{ textAlign: 'start', cursor: 'pointer', border: 0, display: 'block' }}
                data-conversation={row.id}
              >
                <Flex justifyContent="space-between" gap={2}>
                  <Typography fontWeight="bold" ellipsis>
                    {row.visitor.name || row.visitor.email || t('visitor.guest')}
                  </Typography>
                  <Typography variant="pi" textColor="neutral600" style={{ whiteSpace: 'nowrap' }}>
                    {when(row.lastMessageAt ?? row.createdAt)}
                  </Typography>
                </Flex>
                <Box paddingTop={1}>
                  <Typography variant="omega" textColor="neutral800" ellipsis tag="p">
                    {row.title || row.lastMessage || ''}
                  </Typography>
                </Box>
                {row.lastMessage && row.lastMessage !== row.title ? (
                  <Typography variant="pi" textColor="neutral600" ellipsis tag="p">
                    {row.lastFrom === 'visitor' ? '' : `${row.lastFrom === 'assistant' ? t('assistant') : (row.holder?.name ?? '')} · `}
                    {row.lastMessage}
                  </Typography>
                ) : null}
                <Flex gap={2} paddingTop={2} wrap="wrap">
                  <StateChip row={row} me={me} />
                  {row.waiting ? (
                    <Badge backgroundColor="danger100" textColor="danger700">
                      {t('waiting')}
                    </Badge>
                  ) : null}
                </Flex>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Flex>
  );
};
