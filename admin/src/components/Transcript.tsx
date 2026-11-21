import { Box, Flex, Typography } from '@strapi/design-system';
import { Check, Lock, Sparkle } from '@strapi/icons';
import { Fragment, useEffect, useRef } from 'react';
import type { Detail, Message, Note } from '../api';
import { Avatar, Bubble, DayLabel, EventPill, NoteCard, initials } from './ui';
import { useWords } from './words';

type Entry = { kind: 'message'; at: string; message: Message } | { kind: 'note'; at: string; note: Note };

/** What happened, said for the team: "The assistant handed it to the team", "Marie took it over". */
const useEventLine = () => {
  const { t } = useWords();
  return (message: Message) => {
    const meta = message.meta ?? {};
    switch (message.event) {
      case 'wanted':
        return meta.source === 'visitor' ? t('events.wanted_visitor') : meta.source === 'message' ? t('events.wanted_message') : t('events.wanted');
      case 'held':
        return t('events.held', { name: meta.name ?? '' });
      case 'assigned':
        return t('events.assigned', { by: meta.by ?? '', name: meta.name ?? '' });
      case 'back':
        return t('events.back', { by: meta.by ?? '' });
      case 'closed':
        return t('events.closed', { by: meta.by ?? '' });
      default:
        return message.text;
    }
  };
};

const Caption = ({ children, align }: { children: React.ReactNode; align: 'start' | 'end' }) => (
  <Typography variant="pi" textColor="neutral500" style={{ display: 'block', textAlign: align, paddingTop: 4 }}>
    {children}
  </Typography>
);

/**
 * The whole conversation: the visitor on one side, the assistant and the team on the other,
 * what happened in the middle, and the team's notes in their own colour, day by day.
 */
export const Transcript = ({ detail, wantedReason }: { detail: Detail; wantedReason: string | null }) => {
  const { t, time, day } = useWords();
  const eventLine = useEventLine();
  const end = useRef<HTMLDivElement>(null);
  const entries: Entry[] = [
    ...detail.messages.map((message) => ({ kind: 'message' as const, at: message.createdAt, message })),
    ...detail.notes.map((note) => ({ kind: 'note' as const, at: note.createdAt, note })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  const last = entries.length;
  const visitorName = detail.visitor.name || t('visitor.guest');

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [last, detail.visitor.typing]);

  if (entries.length === 0) {
    return (
      <Flex justifyContent="center" padding={8}>
        <Typography textColor="neutral500">{t('transcript.empty')}</Typography>
      </Flex>
    );
  }

  return (
    <Flex direction="column" alignItems="stretch" gap={4} paddingTop={5} paddingBottom={5} paddingLeft={6} paddingRight={6}>
      {entries.map((entry, index) => {
        const previous = entries[index - 1];
        const newDay = !previous || new Date(previous.at).toDateString() !== new Date(entry.at).toDateString();
        return (
          <Fragment key={entry.kind === 'note' ? `note-${entry.note.id}` : entry.message.id}>
            {newDay ? <DayLabel>{day(entry.at)}</DayLabel> : null}
            {entry.kind === 'note' ? (
              <Flex justifyContent="flex-end" style={{ paddingInlineEnd: 36 }} data-note>
                <NoteCard>
                  <Flex gap={1} paddingBottom={1}>
                    <Lock width="1.2rem" height="1.2rem" fill="warning600" aria-hidden />
                    <Typography variant="pi" fontWeight="bold" textColor="warning700">
                      {t('note.label', { name: entry.note.author.name })} · {time(entry.note.createdAt)}
                    </Typography>
                  </Flex>
                  {entry.note.text}
                </NoteCard>
              </Flex>
            ) : (
              <MessageLine message={entry.message} visitorName={visitorName} wantedReason={wantedReason} eventLine={eventLine} />
            )}
          </Fragment>
        );
      })}
      {detail.visitor.typing ? (
        <Flex gap={2} aria-live="polite">
          <Avatar $size={28}>{initials(visitorName)}</Avatar>
          <Typography variant="pi" textColor="neutral500" style={{ fontStyle: 'italic' }}>
            {t('visitor_typing')}
          </Typography>
        </Flex>
      ) : null}
      <div ref={end} />
    </Flex>
  );
};

const MessageLine = ({
  message,
  visitorName,
  wantedReason,
  eventLine,
}: {
  message: Message;
  visitorName: string;
  wantedReason: string | null;
  eventLine: (message: Message) => string;
}) => {
  const { t, time } = useWords();

  if (message.from === 'event') {
    const reason = message.event === 'wanted' && wantedReason && message.meta?.source === 'tool' ? wantedReason : null;
    return (
      <EventPill data-event={message.event ?? ''}>
        {eventLine(message)}
        {reason ? (
          <>
            {' · '}
            <strong>{reason}</strong>
          </>
        ) : null}
        {` · ${time(message.createdAt)}`}
      </EventPill>
    );
  }

  if (message.from === 'visitor') {
    return (
      <Flex alignItems="flex-end" gap={2} data-from="visitor">
        <Avatar $size={28}>{initials(visitorName)}</Avatar>
        <Box minWidth={0} style={{ maxWidth: '75%' }}>
          <Bubble $from="visitor">{message.text}</Bubble>
          <Caption align="start">
            {time(message.createdAt)}
            {message.readBy ? (
              <>
                {' · '}
                <Check width="1rem" height="1rem" fill="success600" aria-hidden style={{ verticalAlign: 'middle' }} /> {t('read_by', { name: message.readBy })}
              </>
            ) : null}
          </Caption>
        </Box>
      </Flex>
    );
  }

  const assistant = message.from === 'assistant';
  const who = assistant ? t('assistant') : (message.author?.name ?? '');
  return (
    <Flex alignItems="flex-end" justifyContent="flex-end" gap={2} data-from={message.from}>
      <Box minWidth={0} style={{ maxWidth: '75%' }}>
        <Flex justifyContent="flex-end">
          <Bubble $from={assistant ? 'assistant' : 'team'}>{message.text}</Bubble>
        </Flex>
        <Caption align="end">
          <Typography variant="pi" fontWeight="bold" textColor="neutral600">
            {who}
          </Typography>{' '}
          · {time(message.createdAt)}
        </Caption>
      </Box>
      {assistant ? (
        <Avatar $size={28} $tone="warning" aria-hidden>
          <Sparkle />
        </Avatar>
      ) : (
        <Avatar $size={28} $tone="primary">
          {initials(who)}
        </Avatar>
      )}
    </Flex>
  );
};
