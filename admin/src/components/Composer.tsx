import { Box, Button, Flex, Textarea, Typography, SingleSelect, SingleSelectOption } from '@strapi/design-system';
import { useRef, useState } from 'react';
import type { SavedReply } from '../api';
import { useWords } from './words';

type Mode = 'reply' | 'note';

interface Props {
  canReply: boolean;
  savedReplies: SavedReply[];
  onSend: (mode: Mode, text: string) => Promise<boolean>;
  onTyping: () => void;
}

/** The "/word" being typed at the end of the draft, if any. */
const shortcutOf = (text: string) => /(?:^|\s)\/([\p{L}\p{N}_-]*)$/u.exec(text);

/**
 * Where the team writes: a reply to the visitor (once someone holds the conversation), or a
 * note for the team. "/" opens the saved replies; Enter sends, Shift + Enter goes to the line.
 */
export const Composer = ({ canReply, savedReplies, onSend, onTyping }: Props) => {
  const { t } = useWords();
  const [mode, setMode] = useState<Mode>(canReply ? 'reply' : 'note');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const lastTyping = useRef(0);
  const effective: Mode = canReply ? mode : 'note';

  const typed = shortcutOf(text);
  const matches = typed ? savedReplies.filter((reply) => reply.title.toLowerCase().startsWith(typed[1].toLowerCase())).slice(0, 6) : [];

  const insert = (reply: SavedReply) => {
    if (!typed) return;
    setText(text.slice(0, typed.index + (typed[0].startsWith('/') ? 0 : 1)) + reply.text);
  };

  const send = async () => {
    const words = text.trim();
    if (!words || busy) return;
    setBusy(true);
    const sent = await onSend(effective, words);
    setBusy(false);
    if (sent) setText('');
  };

  return (
    <Box padding={4} borderColor="neutral200" style={{ borderTopWidth: 1, borderTopStyle: 'solid' }} background={effective === 'note' ? 'warning100' : 'neutral0'}>
      <Flex gap={2} paddingBottom={2} alignItems="center">
        <Box width="200px">
          <SingleSelect
            aria-label={t('reply.mode')}
            value={effective}
            onChange={(value: string | number) => setMode(String(value) as Mode)}
            size="S"
          >
            <SingleSelectOption value="reply" disabled={!canReply}>
              {t('reply.mode')}
            </SingleSelectOption>
            <SingleSelectOption value="note">{t('note.mode')}</SingleSelectOption>
          </SingleSelect>
        </Box>
        <Typography variant="pi" textColor="neutral600">
          {effective === 'note' ? t('note.hint') : canReply ? t('reply.hint') : t('reply.take_over_first')}
        </Typography>
      </Flex>
      <Textarea
        name="text"
        aria-label={effective === 'note' ? t('note.mode') : t('reply.mode')}
        placeholder={effective === 'note' ? t('note.placeholder') : t('reply.placeholder')}
        value={text}
        onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
          setText(event.target.value);
          if (effective === 'reply' && Date.now() - lastTyping.current > 3000) {
            lastTyping.current = Date.now();
            onTyping();
          }
        }}
        onKeyDown={(event: React.KeyboardEvent<HTMLTextAreaElement>) => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            if (matches.length > 0) insert(matches[0]);
            else void send();
          }
        }}
      />
      {matches.length > 0 ? (
        <Box tag="ul" background="neutral0" hasRadius shadow="filterShadow" marginTop={1} padding={1} aria-label={t('saved.many')}>
          {matches.map((reply) => (
            <Box tag="li" key={reply.id}>
              <Box tag="button" type="button" padding={2} width="100%" style={{ textAlign: 'start', border: 0, background: 'none', cursor: 'pointer' }} onClick={() => insert(reply)}>
                <Typography fontWeight="bold">/{reply.title}</Typography>{' '}
                <Typography variant="pi" textColor="neutral600" ellipsis>
                  {reply.text}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      ) : null}
      <Flex justifyContent="flex-end" paddingTop={2}>
        <Button onClick={() => void send()} loading={busy} disabled={!text.trim()} variant={effective === 'note' ? 'secondary' : 'default'}>
          {effective === 'note' ? t('note.send') : t('reply.send')}
        </Button>
      </Flex>
    </Box>
  );
};
