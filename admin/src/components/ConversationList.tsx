import type { Row, Tab } from '../api';
import { Archive, Bell, Sparkle, User } from '../kit/icons';
import { Avatar, Count, Divider, Flex, Meta, Reason, RowButton, Scroll, SearchField, Segment, Segmented, Spinner, Text, initials } from '../kit/ui';
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
      <Flex $justify="space-between" $gap={8} style={{ width: '100%' }}>
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
      <Flex $direction="column" $gap={12} style={{ padding: 16 }}>
        <Segmented role="tablist" aria-label={t('plugin.name')}>
          {TABS.map((which) => (
            <Segment key={which} type="button" role="tab" aria-selected={tab === which} $active={tab === which} onClick={() => onTab(which)}>
              {t(`tabs.${which}`)}
              {count(which) ? <Count $strong={which === 'wanted'}>{count(which)}</Count> : null}
            </Segment>
          ))}
        </Segmented>
        <SearchField value={q} onChange={onSearch} placeholder={t('search')} clearLabel={t('actions.cancel')} />
      </Flex>
      <Divider />
      <Scroll>
        {rows === null ? (
          <Flex $justify="center" style={{ padding: 24 }}>
            <Spinner />
          </Flex>
        ) : rows.length === 0 ? (
          <Text tag="p" color="neutral500" align="center" style={{ display: 'block', padding: 24 }}>
            {empty}
          </Text>
        ) : (
          <ul>
            {rows.map((row) => {
              const name = row.visitor.name || row.visitor.email || t('visitor.guest');
              const at = row.lastMessageAt ?? row.createdAt;
              return (
                <li key={row.id}>
                  <RowButton type="button" $active={row.id === open} aria-current={row.id === open ? 'true' : undefined} onClick={() => onOpen(row.id)} data-conversation={row.id}>
                    <Avatar $size={36}>{initials(name)}</Avatar>
                    <Flex $direction="column" $gap={4} $grow>
                      <Flex $justify="space-between" $gap={8}>
                        <Text weight="bold" ellipsis>
                          {name}
                        </Text>
                        <Text
                          variant="pi"
                          weight={row.waiting || row.state === 'wanted' ? 'bold' : undefined}
                          color={row.waiting || row.state === 'wanted' ? 'danger600' : 'neutral500'}
                          style={{ whiteSpace: 'nowrap' }}
                        >
                          {ago(at)}
                        </Text>
                      </Flex>
                      <Text color="neutral700" ellipsis>
                        {row.lastMessage || row.title || ''}
                      </Text>
                      <div style={{ paddingTop: 4 }}>
                        <RowMeta row={row} me={me} />
                      </div>
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
