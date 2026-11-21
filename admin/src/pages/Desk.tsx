import { Button, Flex, Typography } from '@strapi/design-system';
import { Bell, Lightning, Message } from '@strapi/icons';
import { Layouts, Page, useAuth, useFetchClient } from '@strapi/strapi/admin';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BASE, usePolled, type Row, type SavedReply, type Tab } from '../api';
import { ConversationList } from '../components/ConversationList';
import { ConversationView } from '../components/ConversationView';
import { SavedReplies } from '../components/SavedReplies';
import { Avatar, Column, Panel } from '../components/ui';
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
  const back = () => navigate(`/plugins/${PLUGIN_ID}`);
  const refresh = () => {
    void list.reload();
    void counts.reload();
  };

  return (
    <Page.Main>
      <Page.Title>{t('plugin.name')}</Page.Title>
      <Layouts.Header
        title={t('page.title')}
        subtitle={t('page.subtitle')}
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
            <Button variant="secondary" startIcon={<Lightning />} onClick={() => setSavedOpen(true)}>
              {t('saved.many')}
            </Button>
          </Flex>
        }
      />
      <Layouts.Content>
        <Panel data-open={id ? 'true' : 'false'}>
          <Column $border="end" data-list-column>
            <ConversationList tab={tab} onTab={setTab} q={q} onSearch={setQ} rows={list.data?.results ?? null} counts={counts.data} open={id ?? null} onOpen={open} me={me} />
          </Column>
          {id ? (
            <ConversationView key={id} id={id} me={me} hasAssistant={hasAssistant} savedReplies={savedReplies} onChanged={refresh} onOpen={open} onBack={back} />
          ) : (
            <Column data-center-column>
              <Flex direction="column" justifyContent="center" alignItems="center" gap={3} flex="1" padding={8}>
                <Avatar $size={56} $tone="primary" aria-hidden>
                  <Message />
                </Avatar>
                <Typography variant="delta" tag="p">
                  {list.data?.results.length === 0 && tab === 'all' && !q ? t('empty.heading') : t('pick.title')}
                </Typography>
                <Typography textColor="neutral600" tag="p" textAlign="center">
                  {list.data?.results.length === 0 && tab === 'all' && !q ? t('empty.description') : t('pick')}
                </Typography>
              </Flex>
            </Column>
          )}
        </Panel>
      </Layouts.Content>
      <SavedReplies open={savedOpen} onOpenChange={setSavedOpen} replies={savedReplies} onChanged={() => void loadSaved()} />
    </Page.Main>
  );
};
