import { useCallback, useEffect, useRef, useState } from 'react';
import { BASE, usePolled, type Me, type Row, type SavedReply, type Tab } from '../api';
import { ConversationList } from '../components/ConversationList';
import { ConversationView } from '../components/ConversationView';
import { SavedReplies } from '../components/SavedReplies';
import { useWords } from '../components/words';
import { http } from '../kit/http';
import { Bell, Chat, Lightning } from '../kit/icons';
import { Avatar, Button, Column, Flex, PageHeader, Panel, Spinner, Text, useToast } from '../kit/ui';

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

/**
 * The conversation open is in the address (`?conversation=…`), so that a link to it works and
 * the browser's back goes back to the list, without the panel's router: it is not the same in
 * Strapi 4 and in Strapi 5.
 */
const useOpenConversation = () => {
  const read = () => new URLSearchParams(window.location.search).get('conversation');
  const [id, setId] = useState<string | null>(read);
  useEffect(() => {
    const onPop = () => setId(read());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const go = useCallback((next: string | null) => {
    const url = new URL(window.location.href);
    if (next) url.searchParams.set('conversation', next);
    else url.searchParams.delete('conversation');
    window.history.pushState(window.history.state, '', url);
    setId(next);
  }, []);
  return [id, go] as const;
};

export const Desk = () => {
  const { t } = useWords();
  const [id, go] = useOpenConversation();
  const [me, setMe] = useState<Me | null>(null);
  const [tab, setTab] = useState<Tab>('all');
  const [q, setQ] = useState('');
  const [savedOpen, setSavedOpen] = useState(false);
  const [savedReplies, setSavedReplies] = useState<SavedReply[]>([]);
  const [canNotify, setCanNotify] = useState(typeof Notification !== 'undefined' && Notification.permission === 'default');
  const { toast, toastNode } = useToast();

  const list = usePolled<{ results: Row[] }>(`/conversations?tab=${tab}&q=${encodeURIComponent(q)}`);
  const counts = usePolled<{ wanted: number; mine: number }>('/counts');
  useAttention(counts.data?.wanted);

  const loadSaved = useCallback(async () => {
    const { data } = await http.get<{ results: SavedReply[] }>(`${BASE}/saved-replies`);
    setSavedReplies(data.results);
  }, []);

  useEffect(() => {
    void http
      .get<Me>(`${BASE}/me`)
      .then(({ data }) => setMe(data))
      .catch(() => toast(t('error')));
    void loadSaved().catch(() => {});
    // Once, as the page opens: `t` is a new function at every render, and with it here the page
    // asked again at every render, a hundred times a second.
  }, []);

  const refresh = () => {
    void list.reload();
    void counts.reload();
  };

  return (
    <main>
      <PageHeader
        title={t('page.title')}
        subtitle={t('page.subtitle')}
        actions={
          <>
            {canNotify ? (
              <Button
                variant="tertiary"
                startIcon={<Bell />}
                onClick={() => void Notification.requestPermission().then(() => setCanNotify(Notification.permission === 'default'))}
              >
                {t('browser.enable')}
              </Button>
            ) : null}
            {me?.can.savedReplies ? (
              <Button variant="secondary" startIcon={<Lightning />} onClick={() => setSavedOpen(true)}>
                {t('saved.many')}
              </Button>
            ) : null}
          </>
        }
      />
      <div style={{ padding: '0 56px 40px' }}>
        {me === null ? (
          <Flex $justify="center" style={{ padding: 48 }}>
            <Spinner />
          </Flex>
        ) : (
          <Panel data-open={id ? 'true' : 'false'}>
            <Column $border="end" data-list-column>
              <ConversationList tab={tab} onTab={setTab} q={q} onSearch={setQ} rows={list.data?.results ?? null} counts={counts.data} open={id} onOpen={go} me={me.id} />
            </Column>
            {id ? (
              <ConversationView key={id} id={id} me={me} savedReplies={savedReplies} onChanged={refresh} onOpen={go} onBack={() => go(null)} onError={toast} />
            ) : (
              <Column data-center-column>
                <Flex $direction="column" $justify="center" $align="center" $gap={12} style={{ flex: 1, padding: 32 }}>
                  <Avatar $size={56} $tone="primary" aria-hidden>
                    <Chat />
                  </Avatar>
                  <Text variant="delta" tag="p">
                    {list.data?.results.length === 0 && tab === 'all' && !q ? t('empty.heading') : t('pick.title')}
                  </Text>
                  <Text color="neutral600" tag="p" align="center">
                    {list.data?.results.length === 0 && tab === 'all' && !q ? t('empty.description') : t('pick')}
                  </Text>
                </Flex>
              </Column>
            )}
          </Panel>
        )}
      </div>
      {me?.can.savedReplies ? (
        <SavedReplies open={savedOpen} onClose={() => setSavedOpen(false)} replies={savedReplies} onChanged={() => void loadSaved()} onError={toast} />
      ) : null}
      {toastNode}
    </main>
  );
};
