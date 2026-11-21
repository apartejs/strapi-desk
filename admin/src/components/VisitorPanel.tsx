import { Box, Flex, Typography } from '@strapi/design-system';
import type { Detail } from '../api';
import { StateChip } from './StateChip';
import { useWords } from './words';

/** Who the visitor is, beside the conversation: what the widget told, and their other conversations. */
export const VisitorPanel = ({ detail, onOpen }: { detail: Detail; onOpen: (id: string) => void }) => {
  const { t, when } = useWords();
  const context = Object.entries(detail.conversation.context ?? {}).filter(([, value]) => value !== null && value !== '' && typeof value !== 'object');

  return (
    <Box width="15rem" style={{ flexShrink: 0 }} background="neutral0" hasRadius shadow="tableShadow" padding={4} overflow="auto" data-visitor-panel>
      <Typography variant="sigma" textColor="neutral600" tag="h3">
        {t('panel.title')}
      </Typography>
      <Box paddingTop={3}>
        <Typography fontWeight="bold" tag="p">
          {detail.visitor.name || t('visitor.guest')}
        </Typography>
        {detail.visitor.email ? (
          <Typography variant="pi" tag="p">
            <a href={`mailto:${detail.visitor.email}`}>{detail.visitor.email}</a>
          </Typography>
        ) : null}
        <Typography variant="pi" textColor="neutral600" tag="p">
          {t('panel.started')} · {when(detail.conversation.createdAt)}
        </Typography>
      </Box>
      {context.length > 0 ? (
        <Box paddingTop={4}>
          <Typography variant="sigma" textColor="neutral600" tag="h3">
            {t('panel.context')}
          </Typography>
          <Box tag="dl" paddingTop={2}>
            {context.map(([key, value]) => (
              <Box key={key} paddingBottom={2}>
                <Typography variant="pi" textColor="neutral600" tag="dt">
                  {key}
                </Typography>
                <Typography variant="omega" tag="dd" style={{ overflowWrap: 'anywhere' }}>
                  {String(value)}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      ) : null}
      {detail.visitor.conversations.length > 0 ? (
        <Box paddingTop={4}>
          <Typography variant="sigma" textColor="neutral600" tag="h3">
            {t('panel.previous')}
          </Typography>
          <Flex tag="ul" direction="column" alignItems="stretch" gap={2} paddingTop={2}>
            {detail.visitor.conversations.map((other) => (
              <li key={other.id}>
                <Box tag="button" type="button" onClick={() => onOpen(other.id)} style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer', textAlign: 'start' }}>
                  <Typography variant="omega" textColor="primary600" ellipsis tag="p">
                    {other.title || t('visitor.guest')}
                  </Typography>
                </Box>
                <Flex gap={2}>
                  <StateChip row={{ state: other.state, holder: null }} me={null} />
                  <Typography variant="pi" textColor="neutral600">
                    {when(other.lastMessageAt)}
                  </Typography>
                </Flex>
              </li>
            ))}
          </Flex>
        </Box>
      ) : null}
    </Box>
  );
};
