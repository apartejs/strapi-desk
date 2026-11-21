import { Box, Button, EmptyStateLayout, Flex } from '@strapi/design-system';
import { Bell, Message } from '@strapi/icons';
import { Layouts, Page, useAuth, useFetchClient } from '@strapi/strapi/admin';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BASE, usePolled, type Row, type SavedReply, type Tab } from '../api';
import { ConversationList } from '../components/ConversationList';
import { ConversationView } from '../components/ConversationView';
import { SavedReplies } from '../components/SavedReplies';
import { useWords } from '../components/words';
import { PLUGIN_ID } from '../pluginId';

/**
 * Tells the team something waits, while the desk is open: the count in the tab's title, and a
 * notification of the system once they allowed it, when the queue grows with the tab behind.
 */
const useAttention = (wanted: number | undefined) => {
  const { t } = useWords();
  const before = useRef<number | undefined>(undefined);
  const title = useRef(document.title);

  useEffect(() => {
    const base = title.current;
    return () => {
      document.title = base;
    };
  }, []);

  useEffect(() => {
    if (wanted === undefined) return;
    document.title = wanted > 0 ? `(${wanted}) ${title.current}` : title.current;
    const grew = before.current !== undefined && wanted > before.current;
    before.current = wanted;
    if (grew && document.visibilityState !== 'visible' && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(t('browser.title'), { body: t('browser.body', { count: wanted }), tag: 'aparte-desk' });
    }
  }, [wanted, t]);
};

export const Desk = () => {
  const { t } = useWords();
  const { id } = useParams();
  const navigate = useNavigate();
  const me = useAuth('Desk', (auth) => auth.user?.id ?? null) as number | null;
  const { get } = useFetchClient();
  const [tab, setTab] = useState<Tab>('all');
  const [q, setQ] = useState('');
  const [savedOpen, setSavedOpen] = useState(false);
  const [savedReplies, setSavedReplies] = useState<SavedReply[]>([]);
  const [hasAssistant, setHasAssistant] = useState(true);
  const [canNotify, setCanNotify] = useState(typeof Notification !== 'undefined' && Notification.permission === 'default');

  const list = usePolled<{ results: Row[] }>(`/conversations?tab=${tab}&q=${encodeURIComponent(q)}`);
  const counts = usePolled<{ wanted: number; mine: number }>('/counts');
  useAttention(counts.data?.wanted);

  const loadSaved = useCallback(async () => {
    const { data } = await get<{ results: SavedReply[] }>(`${BASE}/saved-replies`);
    setSavedReplies(data.results);
  }, [get]);

  useEffect(() => {
    void loadSaved().catch(() => {});
    void get<{ assistant: boolean }>(`${BASE}/settings`)
      .then(({ data }) => setHasAssistant(data.assistant))
      .catch(() => {});
  }, [get, loadSaved]);

  const open = (next: string) => navigate(`/plugins/${PLUGIN_ID}/${encodeURIComponent(next)}`);
  const refresh = () => {
    void list.reload();
    void counts.reload();
  };

  return (
    <Page.Main>
      <Page.Title>{t('plugin.name')}</Page.Title>
      <Layouts.Header
        title={t('plugin.name')}
        primaryAction={
          <Flex gap={2}>
            {canNotify ? (
              <Button
                variant="tertiary"
                startIcon={<Bell />}
                onClick={() => void Notification.requestPermission().then(() => setCanNotify(Notification.permission === 'default'))}
              >
                {t('browser.enable')}
              </Button>
            ) : null}
            <Button variant="secondary" startIcon={<Message />} onClick={() => setSavedOpen(true)}>
              {t('saved.many')}
            </Button>
          </Flex>
        }
      />
      <Layouts.Content>
        <Flex alignItems="stretch" gap={4} style={{ height: 'calc(100vh - 13rem)', minHeight: '28rem' }}>
          <Box width="25rem" style={{ flexShrink: 0, minWidth: 0 }}>
            <ConversationList tab={tab} onTab={setTab} q={q} onSearch={setQ} rows={list.data?.results ?? null} counts={counts.data} open={id ?? null} onOpen={open} me={me} />
          </Box>
          <Box flex="1" minWidth={0}>
            {id ? (
              <ConversationView key={id} id={id} me={me} hasAssistant={hasAssistant} savedReplies={savedReplies} onChanged={refresh} onOpen={open} />
            ) : (
              <EmptyStateLayout
                icon={<Message width="6rem" height="6rem" />}
                content={list.data?.results.length === 0 && tab === 'all' && !q ? t('empty.description') : t('pick')}
              />
            )}
          </Box>
        </Flex>
      </Layouts.Content>
      <SavedReplies open={savedOpen} onOpenChange={setSavedOpen} replies={savedReplies} onChanged={() => void loadSaved()} />
    </Page.Main>
  );
};
