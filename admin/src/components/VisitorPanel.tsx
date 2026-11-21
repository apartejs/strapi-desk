import { Box, Divider, Flex, Typography } from '@strapi/design-system';
import type { Detail } from '../api';
import { StateChip } from './StateChip';
import { Avatar, Card, Column, Scroll, initials } from './ui';
import { useWords } from './words';

/** "orderNumber" → "Order number", "plan_name" → "Plan name". */
const label = (key: string) => {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const Line = ({ name, value }: { name: string; value: string }) => (
  <Flex justifyContent="space-between" alignItems="flex-start" gap={3} paddingBottom={2}>
    <Typography variant="omega" textColor="neutral600" tag="dt" style={{ flexShrink: 0 }}>
      {name}
    </Typography>
    <Typography variant="omega" textColor="neutral800" tag="dd" style={{ textAlign: 'end', overflowWrap: 'anywhere' }}>
      {value}
    </Typography>
  </Flex>
);

/** Who the visitor is, beside the conversation: what the widget told, and their other conversations. */
export const VisitorPanel = ({ detail, onOpen }: { detail: Detail; onOpen: (id: string) => void }) => {
  const { t, date, when } = useWords();
  const name = detail.visitor.name || t('visitor.guest');
  const context = Object.entries(detail.conversation.context ?? {}).filter(([, value]) => value !== null && value !== '' && typeof value !== 'object');
  const messages = detail.messages.filter((message) => message.from !== 'event').length;

  return (
    <Column $border="start" data-visitor-panel aria-label={t('panel.title')}>
      <Scroll>
        <Box padding={6}>
          <Flex direction="column" alignItems="center" gap={2} paddingBottom={5}>
            <Avatar $size={64}>{initials(name)}</Avatar>
            <Typography variant="delta" tag="p" textAlign="center">
              {name}
            </Typography>
            {detail.visitor.email ? (
              <Typography variant="pi" textColor="neutral600" tag="p" style={{ overflowWrap: 'anywhere', textAlign: 'center' }}>
                <a href={`mailto:${detail.visitor.email}`} style={{ color: 'inherit' }}>
                  {detail.visitor.email}
                </a>
              </Typography>
            ) : null}
          </Flex>
          <Divider />
          <Box tag="dl" paddingTop={5}>
            <Line name={t('panel.started')} value={date(detail.conversation.createdAt)} />
            <Line name={t('panel.messages')} value={String(messages)} />
            {context.map(([key, value]) => (
              <Line key={key} name={label(key)} value={String(value)} />
            ))}
          </Box>
          {detail.visitor.conversations.length > 0 ? (
            <Box paddingTop={5}>
              <Typography variant="sigma" textColor="neutral600" tag="h3">
                {t('panel.previous')}
              </Typography>
              <Flex tag="ul" direction="column" alignItems="stretch" gap={2} paddingTop={3}>
                {detail.visitor.conversations.map((other) => (
                  <li key={other.id}>
                    <Card type="button" onClick={() => onOpen(other.id)}>
                      <Typography variant="omega" fontWeight="semiBold" textColor="neutral800" ellipsis tag="p">
                        {other.title || t('visitor.guest')}
                      </Typography>
                      <Flex justifyContent="space-between" gap={2} paddingTop={1}>
                        <Typography variant="pi" textColor="neutral600">
                          {when(other.lastMessageAt)}
                        </Typography>
                        <StateChip row={{ state: other.state, holder: null }} me={null} />
                      </Flex>
                    </Card>
                  </li>
                ))}
              </Flex>
            </Box>
          ) : null}
        </Box>
      </Scroll>
    </Column>
  );
};
