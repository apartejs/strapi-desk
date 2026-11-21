import { Box, Button, Flex, Textarea, Typography } from '@strapi/design-system';
import { Lock, PaperPlane } from '@strapi/icons';
import { useRef, useState } from 'react';
import type { SavedReply } from '../api';
import { Bare, ModeTab } from './ui';
import { useWords } from './words';

type Mode = 'reply' | 'note';

interface Props {
  canReply: boolean;
  savedReplies: SavedReply[];
  onSend: (mode: Mode, text: string) => Promise<boolean>;
  onTyping: () => void;
  onTakeOver: (() => void) | null;
}

/** The "/word" being typed at the end of the draft, if any. */
const shortcutOf = (text: string) => /(?:^|\s)\/([\p{L}\p{N}_-]*)$/u.exec(text);

/**
 * Where the team writes: a reply to the visitor (once they hold the conversation), or a note for
 * the team. "/" opens the saved replies; Enter sends, Shift + Enter goes to the line.
 */
export const Composer = ({ canReply, savedReplies, onSend, onTyping, onTakeOver }: Props) => {
  const { t } = useWords();
  const [mode, setMode] = useState<Mode>('reply');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const lastTyping = useRef(0);
  const note = mode === 'note';

  const typed = shortcutOf(text);
  const matches = typed ? savedReplies.filter((reply) => reply.title.toLowerCase().startsWith(typed[1].toLowerCase())).slice(0, 6) : [];

  const insert = (reply: SavedReply) => {
    if (!typed) return;
    setText(text.slice(0, typed.index + (typed[0].startsWith('/') ? 0 : 1)) + reply.text);
  };

  const send = async () => {
    const words = text.trim();
    if (!words || busy || (!note && !canReply)) return;
    setBusy(true);
    const sent = await onSend(mode, words);
    setBusy(false);
    if (sent) setText('');
  };

  return (
    <Box
      paddingTop={3}
      paddingBottom={4}
      paddingLeft={6}
      paddingRight={6}
      borderColor="neutral150"
      background={note ? 'warning100' : 'neutral0'}
      style={{ borderTopWidth: 1, borderTopStyle: 'solid' }}
    >
      <Flex gap={5} role="tablist" aria-label={t('reply.mode')}>
        <ModeTab type="button" role="tab" aria-selected={!note} $active={!note} $tone="primary" onClick={() => setMode('reply')}>
          {t('reply.mode')}
        </ModeTab>
        <ModeTab type="button" role="tab" aria-selected={note} $active={note} $tone="warning" onClick={() => setMode('note')}>
          {t('note.mode')}
        </ModeTab>
      </Flex>

      {!note && !canReply ? (
        <Flex gap={3} paddingTop={3} paddingBottom={1} wrap="wrap">
          <Typography variant="omega" textColor="neutral600">
            {t('reply.take_over_first')}
          </Typography>
          {onTakeOver ? (
            <Button size="S" variant="secondary" onClick={onTakeOver}>
              {t('actions.take_over')}
            </Button>
          ) : null}
        </Flex>
      ) : (
        <Box paddingTop={3} position="relative">
          {matches.length > 0 ? (
            <Box
              tag="ul"
              position="absolute"
              left={0}
              right={0}
              bottom="100%"
              marginBottom={1}
              background="neutral0"
              hasRadius
              shadow="popupShadow"
              borderColor="neutral150"
              padding={1}
              zIndex={2}
              aria-label={t('saved.many')}
            >
              {matches.map((reply, index) => (
                <li key={reply.id}>
                  <Bare type="button" onClick={() => insert(reply)} style={{ display: 'block', width: '100%' }}>
                    <Box padding={2} hasRadius background={index === 0 ? 'primary100' : undefined}>
                      <Typography fontWeight="bold" textColor="primary600">
                        /{reply.title}
                      </Typography>
                      <Typography variant="pi" textColor="neutral600" ellipsis tag="p">
                        {reply.text}
                      </Typography>
                    </Box>
                  </Bare>
                </li>
              ))}
            </Box>
          ) : null}
          <Textarea
            name="text"
            aria-label={note ? t('note.mode') : t('reply.mode')}
            placeholder={note ? t('note.placeholder') : t('reply.placeholder')}
            value={text}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
              setText(event.target.value);
              if (!note && Date.now() - lastTyping.current > 3000) {
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
          <Flex justifyContent="space-between" alignItems="center" gap={4} paddingTop={3}>
            <Typography variant="pi" textColor="neutral600">
              {note ? t('note.hint') : t('reply.hint')}
            </Typography>
            <Button
              onClick={() => void send()}
              loading={busy}
              disabled={!text.trim()}
              variant={note ? 'secondary' : 'default'}
              startIcon={note ? <Lock /> : undefined}
              endIcon={note ? undefined : <PaperPlane />}
              style={{ flexShrink: 0 }}
            >
              {note ? t('note.send') : t('reply.send')}
            </Button>
          </Flex>
        </Box>
      )}
    </Box>
  );
};
