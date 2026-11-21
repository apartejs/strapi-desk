import { Box, Button, Dialog, Field, Flex, IconButton, Loader, Modal, SingleSelect, SingleSelectOption, Typography } from '@strapi/design-system';
import { Archive, ArrowLeft, ArrowRight, ArrowsCounterClockwise, User } from '@strapi/icons';
import { ConfirmDialog, useFetchClient, useNotification } from '@strapi/strapi/admin';
import { useEffect, useState } from 'react';
import { BASE, usePolled, type Detail, type SavedReply } from '../api';
import { Composer } from './Composer';
import { Transcript } from './Transcript';
import { Avatar, Column, NarrowOnly, Scroll, initials } from './ui';
import { VisitorPanel } from './VisitorPanel';
import { useWords } from './words';

interface Props {
  id: string;
  me: number | null;
  hasAssistant: boolean;
  savedReplies: SavedReply[];
  onChanged: () => void;
  onOpen: (id: string) => void;
  onBack: () => void;
}

/** One conversation: where it stands, what can be done with it, what was said, and the visitor. */
export const ConversationView = ({ id, me, hasAssistant, savedReplies, onChanged, onOpen, onBack }: Props) => {
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
      <Column data-center-column>
        <Box padding={6}>
          <Typography textColor="danger600">{t('error')}</Typography>
        </Box>
      </Column>
    );
  }
  if (!detail) {
    return (
      <Column data-center-column>
        <Flex justifyContent="center" padding={8}>
          <Loader small />
        </Flex>
      </Column>
    );
  }

  const conversation = detail.conversation;
  const mine = conversation.state === 'held' && conversation.holder?.id === me;
  const heldByOther = conversation.state === 'held' && !mine;
  const name = detail.visitor.name || detail.visitor.email || t('visitor.guest');

  const [stateColor, stateLabel] = mine
    ? (['success600', t('chip.yours')] as const)
    : heldByOther
      ? (['neutral600', t('chip.held', { name: conversation.holder?.name ?? '' })] as const)
      : conversation.state === 'wanted'
        ? (['warning600', t('chip.wanted')] as const)
        : conversation.state === 'closed'
          ? (['neutral500', t('chip.closed')] as const)
          : (['primary600', t('chip.assistant')] as const);

  const takeOver = heldByOther ? (
    <Dialog.Root>
      <Dialog.Trigger>
        <Button size="S" startIcon={<User />}>
          {t('actions.take_over')}
        </Button>
      </Dialog.Trigger>
      <ConfirmDialog icon={undefined} onConfirm={() => void act('take')} variant="default" title={t('actions.take_over')}>
        {t('actions.take_from', { name: conversation.holder?.name ?? '' })}
      </ConfirmDialog>
    </Dialog.Root>
  ) : !mine ? (
    <Button size="S" startIcon={<User />} onClick={() => void act('take')}>
      {t('actions.take_over')}
    </Button>
  ) : null;

  return (
    <>
      <Column data-center-column>
        <Box paddingTop={4} paddingBottom={4} paddingLeft={6} paddingRight={6} borderColor="neutral150" style={{ borderBottomWidth: 1, borderBottomStyle: 'solid' }}>
          <Flex gap={3} alignItems="center">
            <NarrowOnly>
              <IconButton label={t('back')} variant="ghost" onClick={onBack}>
                <ArrowLeft />
              </IconButton>
            </NarrowOnly>
            <Avatar $size={40}>{initials(name)}</Avatar>
            <Flex direction="column" alignItems="flex-start" flex="1" minWidth={0}>
              <Typography variant="delta" tag="h2" ellipsis style={{ maxWidth: '100%' }}>
                {name}
              </Typography>
              {conversation.title ? (
                <Typography variant="pi" textColor="neutral600" ellipsis style={{ maxWidth: '100%' }}>
                  {conversation.title}
                </Typography>
              ) : null}
            </Flex>
            <Typography variant="pi" fontWeight="bold" textColor={stateColor} style={{ whiteSpace: 'nowrap', alignSelf: 'flex-start', paddingTop: 4 }}>
              {stateLabel}
            </Typography>
          </Flex>
          <Flex gap={2} paddingTop={3} wrap="wrap">
            {takeOver}
            {mine && hasAssistant ? (
              <Button size="S" variant="tertiary" startIcon={<ArrowsCounterClockwise />} onClick={() => void act('hand-back')}>
                {t('actions.hand_back')}
              </Button>
            ) : null}
            <Button size="S" variant="tertiary" startIcon={<ArrowRight />} onClick={() => setAssigning(true)}>
              {t('actions.assign')}
            </Button>
            {conversation.state !== 'closed' ? (
              <Dialog.Root>
                <Dialog.Trigger>
                  <Button size="S" variant="tertiary" startIcon={<Archive />}>
                    {t('actions.close')}
                  </Button>
                </Dialog.Trigger>
                <ConfirmDialog icon={undefined} onConfirm={() => void act('close')} variant="danger-light" title={t('actions.close')}>
                  {t('actions.close_description')}
                </ConfirmDialog>
              </Dialog.Root>
            ) : null}
          </Flex>
        </Box>
        <Scroll>
          <Transcript detail={detail} wantedReason={conversation.wanted?.reason ?? null} />
        </Scroll>
        <Composer
          key={id}
          canReply={mine}
          savedReplies={savedReplies}
          onSend={(mode, text) => act(mode === 'note' ? 'notes' : 'messages', { text })}
          onTyping={() => void post(`${BASE}/conversations/${encodeURIComponent(id)}/typing`, {}).catch(() => {})}
          onTakeOver={heldByOther ? null : () => void act('take')}
        />
      </Column>
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
    </>
  );
};
