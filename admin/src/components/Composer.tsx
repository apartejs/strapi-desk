import { useRef, useState } from 'react';
import styled from 'styled-components';
import type { SavedReply } from '../api';
import { Lock, Send } from '../kit/icons';
import { Bare, Button, Flex, ModeTab, Text, TextArea } from '../kit/ui';
import { useWords } from './words';

type Mode = 'reply' | 'note';

interface Props {
  /** They hold the conversation: they may answer the visitor. */
  canReply: boolean;
  /** Their role lets them take over: they may write notes, and take it over to answer. */
  canAnswer: boolean;
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
export const Composer = ({ canReply, canAnswer, savedReplies, onSend, onTyping, onTakeOver }: Props) => {
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

  if (!canAnswer) {
    return (
      <Footer note={false}>
        <Text color="neutral600">{t('reply.read_only')}</Text>
      </Footer>
    );
  }

  return (
    <Footer note={note}>
      <Flex $gap={20} role="tablist" aria-label={t('reply.mode')}>
        <ModeTab type="button" role="tab" aria-selected={!note} $active={!note} $tone="primary" onClick={() => setMode('reply')}>
          {t('reply.mode')}
        </ModeTab>
        <ModeTab type="button" role="tab" aria-selected={note} $active={note} $tone="warning" onClick={() => setMode('note')}>
          {t('note.mode')}
        </ModeTab>
      </Flex>

      {!note && !canReply ? (
        <Flex $gap={12} $wrap style={{ paddingTop: 12, paddingBottom: 4 }}>
          <Text color="neutral600">{t('reply.take_over_first')}</Text>
          {onTakeOver ? (
            <Button size="S" variant="secondary" onClick={onTakeOver}>
              {t('actions.take_over')}
            </Button>
          ) : null}
        </Flex>
      ) : (
        <div style={{ paddingTop: 12, position: 'relative' }}>
          {matches.length > 0 ? <Picker matches={matches} onPick={insert} label={t('saved.many')} /> : null}
          <TextArea
            name="text"
            aria-label={note ? t('note.mode') : t('reply.mode')}
            placeholder={note ? t('note.placeholder') : t('reply.placeholder')}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              if (!note && Date.now() - lastTyping.current > 3000) {
                lastTyping.current = Date.now();
                onTyping();
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                if (matches.length > 0) insert(matches[0]);
                else void send();
              }
            }}
          />
          <Flex $justify="space-between" $gap={16} style={{ paddingTop: 12 }}>
            <Text variant="pi" color="neutral600">
              {note ? t('note.hint') : t('reply.hint')}
            </Text>
            <Button
              onClick={() => void send()}
              loading={busy}
              disabled={!text.trim()}
              variant={note ? 'secondary' : 'default'}
              startIcon={note ? <Lock /> : undefined}
              endIcon={note || busy ? undefined : <Send />}
            >
              {note ? t('note.send') : t('reply.send')}
            </Button>
          </Flex>
        </div>
      )}
    </Footer>
  );
};

const Footer = ({ note, children }: { note: boolean; children: React.ReactNode }) => (
  <FooterBox $note={note}>{children}</FooterBox>
);

const FooterBox = styled.div<{ $note: boolean }>`
  padding: 12px 24px 16px;
  border-top: 1px solid ${({ theme }) => theme.colors.neutral150};
  background: ${({ theme, $note }) => ($note ? theme.colors.warning100 : theme.colors.neutral0)};
`;

const PickerList = styled.ul`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 100%;
  z-index: 2;
  margin-bottom: 4px;
  padding: 4px;
  border: 1px solid ${({ theme }) => theme.colors.neutral150};
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.neutral0};
  box-shadow: ${({ theme }) => theme.shadows.popupShadow};
`;

/** The saved replies whose shortcut starts with what follows "/": Enter takes the first. */
const Picker = ({ matches, onPick, label }: { matches: SavedReply[]; onPick: (reply: SavedReply) => void; label: string }) => (
  <PickerList aria-label={label}>
    {matches.map((reply, index) => (
      <li key={reply.id}>
        <Bare type="button" onClick={() => onPick(reply)} style={{ display: 'block', width: '100%' }}>
          <PickerItem $first={index === 0}>
            <Text weight="bold" color="primary600" tag="p">
              /{reply.title}
            </Text>
            <Text variant="pi" color="neutral600" ellipsis tag="p">
              {reply.text}
            </Text>
          </PickerItem>
        </Bare>
      </li>
    ))}
  </PickerList>
);

const PickerItem = styled.div<{ $first: boolean }>`
  padding: 8px;
  border-radius: 4px;
  background: ${({ theme, $first }) => ($first ? theme.colors.primary100 : 'transparent')};
`;
