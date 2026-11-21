import { Box, Button, Field, Flex, IconButton, Modal, TextInput, Textarea, Typography } from '@strapi/design-system';
import { Pencil, Plus, Trash } from '@strapi/icons';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';
import { useState } from 'react';
import { BASE, type SavedReply } from '../api';
import { useWords } from './words';

/** The answers the team gives often, written once and inserted with "/" in a reply. */
export const SavedReplies = ({ open, onOpenChange, replies, onChanged }: { open: boolean; onOpenChange: (open: boolean) => void; replies: SavedReply[]; onChanged: () => void }) => {
  const { t } = useWords();
  const { post, put, del } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [editing, setEditing] = useState<SavedReply | { id: null; title: string; text: string } | null>(null);

  const save = async () => {
    if (!editing) return;
    const body = { title: editing.title.trim().replace(/^\//, ''), text: editing.text };
    try {
      if (editing.id === null) await post(`${BASE}/saved-replies`, body);
      else await put(`${BASE}/saved-replies/${editing.id}`, body);
      setEditing(null);
      onChanged();
    } catch {
      toggleNotification({ type: 'danger', message: t('error') });
    }
  };

  const remove = async (reply: SavedReply) => {
    try {
      await del(`${BASE}/saved-replies/${reply.id}`);
      onChanged();
    } catch {
      toggleNotification({ type: 'danger', message: t('error') });
    }
  };

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>{t('saved.many')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editing ? (
            <Flex direction="column" alignItems="stretch" gap={4}>
              <Field.Root name="title" hint={t('saved.shortcut_help')} required>
                <Field.Label>{t('saved.shortcut')}</Field.Label>
                <TextInput value={editing.title} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEditing({ ...editing, title: event.target.value })} />
                <Field.Hint />
              </Field.Root>
              <Field.Root name="text" required>
                <Field.Label>{t('saved.text')}</Field.Label>
                <Textarea value={editing.text} onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setEditing({ ...editing, text: event.target.value })} />
              </Field.Root>
            </Flex>
          ) : replies.length === 0 ? (
            <Box padding={4}>
              <Typography fontWeight="bold" tag="p">
                {t('saved.empty')}
              </Typography>
              <Typography textColor="neutral600" tag="p">
                {t('saved.empty_help')}
              </Typography>
            </Box>
          ) : (
            <Flex tag="ul" direction="column" alignItems="stretch" gap={2}>
              {replies.map((reply) => (
                <Flex tag="li" key={reply.id} justifyContent="space-between" gap={2} padding={2} hasRadius background="neutral100">
                  <Box minWidth={0}>
                    <Typography fontWeight="bold" tag="p">
                      /{reply.title}
                    </Typography>
                    <Typography variant="pi" textColor="neutral600" ellipsis tag="p">
                      {reply.text}
                    </Typography>
                  </Box>
                  <Flex gap={1}>
                    <IconButton label={t('saved.save')} onClick={() => setEditing(reply)} variant="ghost">
                      <Pencil />
                    </IconButton>
                    <IconButton label={t('saved.delete')} onClick={() => void remove(reply)} variant="ghost">
                      <Trash />
                    </IconButton>
                  </Flex>
                </Flex>
              ))}
            </Flex>
          )}
        </Modal.Body>
        <Modal.Footer>
          {editing ? (
            <>
              <Button variant="tertiary" onClick={() => setEditing(null)}>
                {t('actions.cancel')}
              </Button>
              <Button onClick={() => void save()} disabled={!editing.title.trim() || !editing.text.trim()}>
                {t('saved.save')}
              </Button>
            </>
          ) : (
            <>
              <Modal.Close>
                <Button variant="tertiary">{t('actions.cancel')}</Button>
              </Modal.Close>
              <Button startIcon={<Plus />} onClick={() => setEditing({ id: null, title: '', text: '' })}>
                {t('saved.add')}
              </Button>
            </>
          )}
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};
