import { Box, Flex, Typography } from '@strapi/design-system';
import { useEffect, useRef } from 'react';
import type { Detail, Message, Note } from '../api';
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

/**
 * The whole conversation: the visitor on one side, the assistant and the team on the other,
 * what happened in the middle, and the team's notes in their own colour, all in time order.
 */
export const Transcript = ({ detail, wantedReason }: { detail: Detail; wantedReason: string | null }) => {
  const { t, time } = useWords();
  const eventLine = useEventLine();
  const end = useRef<HTMLDivElement>(null);
  const entries: Entry[] = [
    ...detail.messages.map((message) => ({ kind: 'message' as const, at: message.createdAt, message })),
    ...detail.notes.map((note) => ({ kind: 'note' as const, at: note.createdAt, note })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  const last = entries.length;

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [last]);

  if (entries.length === 0) {
    return (
      <Box padding={6}>
        <Typography textColor="neutral600">{t('transcript.empty')}</Typography>
      </Box>
    );
  }

  return (
    <Flex direction="column" alignItems="stretch" gap={3} padding={4}>
      {entries.map((entry) => {
        if (entry.kind === 'note') {
          return (
            <Box key={`note-${entry.note.id}`} background="warning100" borderColor="warning200" hasRadius padding={3} data-note>
              <Typography variant="pi" fontWeight="bold" textColor="warning700">
                {t('note.label', { name: entry.note.author.name })} · {time(entry.note.createdAt)}
              </Typography>
              <Typography tag="p" style={{ whiteSpace: 'pre-wrap' }}>
                {entry.note.text}
              </Typography>
            </Box>
          );
        }
        const message = entry.message;
        if (message.from === 'event') {
          return (
            <Flex key={message.id} justifyContent="center" data-event={message.event ?? ''}>
              <Typography variant="pi" textColor="neutral600">
                {eventLine(message)}
                {message.event === 'wanted' && wantedReason && message.meta?.source === 'tool' ? ` : ${wantedReason}` : ''} · {time(message.createdAt)}
              </Typography>
            </Flex>
          );
        }
        const visitor = message.from === 'visitor';
        const who = visitor ? detail.visitor.name || t('visitor.guest') : message.from === 'assistant' ? t('assistant') : (message.author?.name ?? '');
        return (
          <Flex key={message.id} direction="column" alignItems={visitor ? 'flex-start' : 'flex-end'} data-from={message.from}>
            <Typography variant="pi" textColor="neutral600">
              {who} · {time(message.createdAt)}
            </Typography>
            <Box
              background={visitor ? 'neutral100' : message.from === 'team' ? 'primary600' : 'primary100'}
              color={message.from === 'team' ? 'neutral0' : 'neutral800'}
              hasRadius
              padding={3}
              maxWidth="75%"
            >
              <Typography textColor={message.from === 'team' ? 'neutral0' : 'neutral800'} tag="p" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                {message.text}
              </Typography>
            </Box>
            {visitor && message.readBy ? (
              <Typography variant="pi" textColor="neutral500">
                {t('read_by', { name: message.readBy })}
              </Typography>
            ) : null}
          </Flex>
        );
      })}
      {detail.visitor.typing ? (
        <Typography variant="pi" textColor="neutral600" aria-live="polite">
          {t('visitor_typing')}
        </Typography>
      ) : null}
      <div ref={end} />
    </Flex>
  );
};
