import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { BASE, usePolled, type Detail, type Me, type SavedReply } from '../api';
import { http, statusOf } from '../kit/http';
import { Archive, ArrowLeft, ArrowRight, HandBack, User } from '../kit/icons';
import { Avatar, Button, Column, Confirm, Dialog, Flex, IconButton, Label, NarrowOnly, Scroll, Select, Spinner, Text, initials } from '../kit/ui';
import { Composer } from './Composer';
import { Transcript } from './Transcript';
import { VisitorPanel } from './VisitorPanel';
import { useWords } from './words';

interface Props {
  id: string;
  me: Me;
  savedReplies: SavedReply[];
  onChanged: () => void;
  onOpen: (id: string) => void;
  onBack: () => void;
  onError: (message: string) => void;
}

/** One conversation: where it stands, what can be done with it, what was said, and the visitor. */
export const ConversationView = ({ id, me, savedReplies, onChanged, onOpen, onBack, onError }: Props) => {
  const { t } = useWords();
  const { data: detail, setData, error } = usePolled<Detail>(`/conversations/${encodeURIComponent(id)}`);
  const [assigning, setAssigning] = useState(false);
  const [confirming, setConfirming] = useState<'close' | 'take' | null>(null);
  const [team, setTeam] = useState<{ id: number; name: string }[]>([]);
  const [colleague, setColleague] = useState('');

  useEffect(() => {
    if (!assigning) return;
    void http.get<{ results: { id: number; name: string }[] }>(`${BASE}/team`).then(({ data }) => setTeam(data.results));
  }, [assigning]);

  const act = async (path: string, body: Record<string, unknown> = {}): Promise<boolean> => {
    try {
      const { data } = await http.post<Detail>(`${BASE}/conversations/${encodeURIComponent(id)}/${path}`, body);
      setData(data);
      onChanged();
      return true;
    } catch (failure) {
      const status = statusOf(failure);
      onError(status === 409 && path === 'messages' ? t('not_yours') : status === 403 ? t('forbidden') : t('error'));
      return false;
    }
  };

  if (error && !detail) {
    return (
      <Column data-center-column>
        <Text color="danger600" style={{ padding: 24 }}>
          {t('error')}
        </Text>
      </Column>
    );
  }
  if (!detail) {
    return (
      <Column data-center-column>
        <Flex $justify="center" style={{ padding: 32 }}>
          <Spinner />
        </Flex>
      </Column>
    );
  }

  const conversation = detail.conversation;
  const mine = conversation.state === 'held' && conversation.holder?.id === me.id;
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

  const takeOver = () => (heldByOther ? setConfirming('take') : void act('take'));

  return (
    <>
      <Column data-center-column>
        <Header>
          <Flex $gap={12}>
            <NarrowOnly>
              <IconButton label={t('back')} onClick={onBack}>
                <ArrowLeft />
              </IconButton>
            </NarrowOnly>
            <Avatar $size={40}>{initials(name)}</Avatar>
            <Flex $direction="column" $align="flex-start" $grow>
              <Text variant="delta" tag="h2" ellipsis style={{ maxWidth: '100%' }}>
                {name}
              </Text>
              {conversation.title ? (
                <Text variant="pi" color="neutral600" ellipsis style={{ maxWidth: '100%' }}>
                  {conversation.title}
                </Text>
              ) : null}
            </Flex>
            <Text variant="pi" weight="bold" color={stateColor} style={{ whiteSpace: 'nowrap', alignSelf: 'flex-start', paddingTop: 4 }}>
              {stateLabel}
            </Text>
          </Flex>
          {me.can.answer || me.can.assign || me.can.close ? (
            <Flex $gap={8} $wrap style={{ paddingTop: 12 }}>
              {me.can.answer && !mine ? (
                <Button size="S" startIcon={<User />} onClick={takeOver}>
                  {t('actions.take_over')}
                </Button>
              ) : null}
              {me.can.answer && mine && me.assistant ? (
                <Button size="S" variant="tertiary" startIcon={<HandBack />} onClick={() => void act('hand-back')}>
                  {t('actions.hand_back')}
                </Button>
              ) : null}
              {me.can.assign ? (
                <Button size="S" variant="tertiary" startIcon={<ArrowRight />} onClick={() => setAssigning(true)}>
                  {t('actions.assign')}
                </Button>
              ) : null}
              {me.can.close && conversation.state !== 'closed' ? (
                <Button size="S" variant="tertiary" startIcon={<Archive />} onClick={() => setConfirming('close')}>
                  {t('actions.close')}
                </Button>
              ) : null}
            </Flex>
          ) : null}
        </Header>
        <Scroll>
          <Transcript detail={detail} wantedReason={conversation.wanted?.reason ?? null} />
        </Scroll>
        <Composer
          key={id}
          canReply={mine && me.can.answer}
          canAnswer={me.can.answer}
          savedReplies={savedReplies}
          onSend={(mode, text) => act(mode === 'note' ? 'notes' : 'messages', { text })}
          onTyping={() => void http.post(`${BASE}/conversations/${encodeURIComponent(id)}/typing`).catch(() => {})}
          onTakeOver={heldByOther ? null : () => void act('take')}
        />
      </Column>
      <VisitorPanel detail={detail} onOpen={onOpen} />

      <Confirm
        open={confirming === 'close'}
        onClose={() => setConfirming(null)}
        onConfirm={() => void act('close')}
        title={t('actions.close')}
        confirm={t('actions.close')}
        cancel={t('actions.cancel')}
        danger
      >
        {t('actions.close_description')}
      </Confirm>
      <Confirm
        open={confirming === 'take'}
        onClose={() => setConfirming(null)}
        onConfirm={() => void act('take')}
        title={t('actions.take_over')}
        confirm={t('actions.take_over')}
        cancel={t('actions.cancel')}
      >
        {t('actions.take_from', { name: conversation.holder?.name ?? '' })}
      </Confirm>

      <Dialog
        open={assigning}
        onClose={() => setAssigning(false)}
        title={t('actions.assign')}
        closeLabel={t('actions.cancel')}
        width="440px"
        footer={
          <>
            <Button variant="tertiary" onClick={() => setAssigning(false)}>
              {t('actions.cancel')}
            </Button>
            <Button
              disabled={!colleague}
              onClick={async () => {
                if (await act('assign', { userId: Number(colleague) })) setAssigning(false);
              }}
            >
              {t('assign.submit')}
            </Button>
          </>
        }
      >
        <Label htmlFor="aparte-desk-member">{t('assign.member')}</Label>
        <Select id="aparte-desk-member" value={colleague} onChange={(event) => setColleague(event.target.value)}>
          <option value="" disabled>
            {t('assign.pick')}
          </option>
          {team.map((member) => (
            <option key={member.id} value={String(member.id)}>
              {member.name}
            </option>
          ))}
        </Select>
      </Dialog>
    </>
  );
};

const Header = styled.header`
  padding: 16px 24px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral150};
`;
