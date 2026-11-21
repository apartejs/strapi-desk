import { Box, Button, Dialog, Field, Flex, Loader, Modal, SingleSelect, SingleSelectOption, Typography } from '@strapi/design-system';
import { ConfirmDialog, useFetchClient, useNotification } from '@strapi/strapi/admin';
import { useEffect, useState } from 'react';
import { BASE, usePolled, type Detail, type SavedReply } from '../api';
import { Composer } from './Composer';
import { StateChip } from './StateChip';
import { Transcript } from './Transcript';
import { VisitorPanel } from './VisitorPanel';
import { useWords } from './words';

interface Props {
  id: string;
  me: number | null;
  hasAssistant: boolean;
  savedReplies: SavedReply[];
  onChanged: () => void;
  onOpen: (id: string) => void;
}

/** One conversation: where it stands, what can be done with it, what was said, and the visitor. */
export const ConversationView = ({ id, me, hasAssistant, savedReplies, onChanged, onOpen }: Props) => {
  const { t } = useWords();
  const { post, get } = useFetchClient();
  const { toggleNotification } = useNotification();
  const { data: detail, setData, error } = usePolled<Detail>(`/conversations/${encodeURIComponent(id)}`);
  const [assigning, setAssigning] = useState(false);
  const [team, setTeam] = useState<{ id: number; name: string }[]>([]);
  const [colleague, setColleague] = useState<string>('');

  useEffect(() => {
    if (!assigning) return;
    void get<{ results: { id: number; name: string }[] }>(`${BASE}/team`).then(({ data }) => setTeam(data.results));
  }, [assigning, get]);

  const act = async (path: string, body: Record<string, unknown> = {}): Promise<boolean> => {
    try {
      const { data } = await post<Detail>(`${BASE}/conversations/${encodeURIComponent(id)}/${path}`, body);
      setData(data);
      onChanged();
      return true;
    } catch (failure) {
      const status = (failure as { status?: number; response?: { status?: number } })?.status ?? (failure as { response?: { status?: number } })?.response?.status;
      toggleNotification({ type: 'danger', message: status === 409 && path === 'messages' ? t('not_yours') : t('error') });
      return false;
    }
  };

  if (error && !detail) {
    return (
      <Box padding={6}>
        <Typography textColor="danger600">{t('error')}</Typography>
      </Box>
    );
  }
  if (!detail) {
    return (
      <Flex justifyContent="center" padding={8}>
        <Loader small />
      </Flex>
    );
  }

  const conversation = detail.conversation;
  const mine = conversation.state === 'held' && conversation.holder?.id === me;
  const heldByOther = conversation.state === 'held' && !mine;

  const status = mine
    ? hasAssistant
      ? t('status.yours')
      : t('status.yours_team_only')
    : heldByOther
      ? t('status.held', { name: conversation.holder?.name ?? '' })
      : conversation.state === 'wanted'
        ? t('status.wanted', { reason: conversation.wanted?.reason ?? '' })
        : conversation.state === 'closed'
          ? hasAssistant
            ? t('status.closed')
            : t('status.closed_team_only')
          : t('status.assistant');

  const takeOver = heldByOther ? (
    <Dialog.Root>
      <Dialog.Trigger>
        <Button size="S">{t('actions.take_over')}</Button>
      </Dialog.Trigger>
      <ConfirmDialog icon={undefined} onConfirm={() => void act('take')} variant="default" title={t('actions.take_over')}>
        {t('actions.take_from', { name: conversation.holder?.name ?? '' })}
      </ConfirmDialog>
    </Dialog.Root>
  ) : !mine ? (
    <Button size="S" onClick={() => void act('take')}>
      {t('actions.take_over')}
    </Button>
  ) : null;

  return (
    <Flex alignItems="stretch" height="100%" gap={4}>
      <Flex direction="column" alignItems="stretch" flex="1" minWidth={0} background="neutral0" hasRadius shadow="tableShadow">
        <Box padding={4} borderColor="neutral200" style={{ borderBottomWidth: 1, borderBottomStyle: 'solid' }}>
          <Flex justifyContent="space-between" gap={3} wrap="wrap">
            <Flex direction="column" alignItems="flex-start" gap={1} minWidth={0}>
              <Typography variant="delta" tag="h2" ellipsis>
                {conversation.title || detail.visitor.name || t('visitor.guest')}
              </Typography>
              <StateChip row={conversation} me={me} />
            </Flex>
            <Flex gap={2} wrap="wrap">
              {takeOver}
              {mine && hasAssistant ? (
                <Button size="S" variant="secondary" onClick={() => void act('hand-back')}>
                  {t('actions.hand_back')}
                </Button>
              ) : null}
              <Button size="S" variant="tertiary" onClick={() => setAssigning(true)}>
                {t('actions.assign')}
              </Button>
              {conversation.state !== 'closed' ? (
                <Dialog.Root>
                  <Dialog.Trigger>
                    <Button size="S" variant="danger-light">
                      {t('actions.close')}
                    </Button>
                  </Dialog.Trigger>
                  <ConfirmDialog icon={undefined} onConfirm={() => void act('close')} variant="danger-light" title={t('actions.close')}>
                    {t('actions.close_description')}
                  </ConfirmDialog>
                </Dialog.Root>
              ) : null}
            </Flex>
          </Flex>
          <Box paddingTop={2}>
            <Typography variant="pi" textColor="neutral600">
              {status}
            </Typography>
          </Box>
        </Box>
        <Box flex="1" overflow="auto">
          <Transcript detail={detail} wantedReason={conversation.wanted?.reason ?? null} />
        </Box>
        <Composer
          key={`${id}-${mine}`}
          canReply={mine}
          savedReplies={savedReplies}
          onSend={(mode, text) => act(mode === 'note' ? 'notes' : 'messages', { text })}
          onTyping={() => void post(`${BASE}/conversations/${encodeURIComponent(id)}/typing`, {}).catch(() => {})}
        />
      </Flex>
      <VisitorPanel detail={detail} onOpen={onOpen} />

      <Modal.Root open={assigning} onOpenChange={setAssigning}>
        <Modal.Content>
          <Modal.Header>
            <Modal.Title>{t('actions.assign')}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Field.Root name="member">
              <Field.Label>{t('assign.member')}</Field.Label>
              <SingleSelect value={colleague} onChange={(value: string | number) => setColleague(String(value))}>
                {team.map((member) => (
                  <SingleSelectOption key={member.id} value={String(member.id)}>
                    {member.name}
                  </SingleSelectOption>
                ))}
              </SingleSelect>
            </Field.Root>
          </Modal.Body>
          <Modal.Footer>
            <Modal.Close>
              <Button variant="tertiary">{t('actions.cancel')}</Button>
            </Modal.Close>
            <Button
              disabled={!colleague}
              onClick={async () => {
                if (await act('assign', { userId: Number(colleague) })) setAssigning(false);
              }}
            >
              {t('assign.submit')}
            </Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </Flex>
  );
};
