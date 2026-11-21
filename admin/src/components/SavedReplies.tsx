import { useState } from 'react';
import styled from 'styled-components';
import { BASE, type SavedReply } from '../api';
import { http } from '../kit/http';
import { Pencil, Plus, Trash } from '../kit/icons';
import { Button, Dialog, Flex, IconButton, Input, Label, Text, TextArea } from '../kit/ui';
import { useWords } from './words';

type Draft = SavedReply | { id: null; title: string; text: string };

interface Props {
  open: boolean;
  onClose: () => void;
  replies: SavedReply[];
  onChanged: () => void;
  onError: (message: string) => void;
}

/** The answers the team gives often, written once and inserted with "/" in a reply. */
export const SavedReplies = ({ open, onClose, replies, onChanged, onError }: Props) => {
  const { t } = useWords();
  const [editing, setEditing] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  const close = () => {
    setEditing(null);
    onClose();
  };

  const save = async () => {
    if (!editing) return;
    const body = { title: editing.title.trim().replace(/^\//, ''), text: editing.text };
    setBusy(true);
    try {
      if (editing.id === null) await http.post(`${BASE}/saved-replies`, body);
      else await http.put(`${BASE}/saved-replies/${editing.id}`, body);
      setEditing(null);
      onChanged();
    } catch {
      onError(t('error'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (reply: SavedReply) => {
    try {
      await http.del(`${BASE}/saved-replies/${reply.id}`);
      onChanged();
    } catch {
      onError(t('error'));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title={t('saved.many')}
      closeLabel={t('actions.cancel')}
      footer={
        editing ? (
          <>
            <Button variant="tertiary" onClick={() => setEditing(null)}>
              {t('actions.cancel')}
            </Button>
            <Button onClick={() => void save()} loading={busy} disabled={!editing.title.trim() || !editing.text.trim()}>
              {t('saved.save')}
            </Button>
          </>
        ) : (
          <>
            <Button variant="tertiary" onClick={close}>
              {t('actions.cancel')}
            </Button>
            <Button startIcon={<Plus />} onClick={() => setEditing({ id: null, title: '', text: '' })}>
              {t('saved.add')}
            </Button>
          </>
        )
      }
    >
      {editing ? (
        <Flex $direction="column" $gap={16}>
          <div>
            <Label htmlFor="aparte-desk-shortcut" hint={t('saved.shortcut_help')}>
              {t('saved.shortcut')}
            </Label>
            <Input id="aparte-desk-shortcut" required value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} />
          </div>
          <div>
            <Label htmlFor="aparte-desk-saved-text">{t('saved.text')}</Label>
            <TextArea id="aparte-desk-saved-text" required value={editing.text} onChange={(event) => setEditing({ ...editing, text: event.target.value })} />
          </div>
        </Flex>
      ) : replies.length === 0 ? (
        <Flex $direction="column" $gap={4} style={{ padding: 8 }}>
          <Text weight="bold" tag="p">
            {t('saved.empty')}
          </Text>
          <Text color="neutral600" tag="p">
            {t('saved.empty_help')}
          </Text>
        </Flex>
      ) : (
        <Flex as="ul" $direction="column" $gap={8} style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {replies.map((reply) => (
            <Item key={reply.id}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <Text weight="bold" tag="p">
                  /{reply.title}
                </Text>
                <Text variant="pi" color="neutral600" ellipsis tag="p">
                  {reply.text}
                </Text>
              </div>
              <Flex $gap={4}>
                <IconButton label={t('saved.edit')} onClick={() => setEditing(reply)}>
                  <Pencil />
                </IconButton>
                <IconButton label={t('saved.delete')} onClick={() => void remove(reply)}>
                  <Trash />
                </IconButton>
              </Flex>
            </Item>
          ))}
        </Flex>
      )}
    </Dialog>
  );
};

const Item = styled.li`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 8px 8px 12px;
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.neutral100};
`;
