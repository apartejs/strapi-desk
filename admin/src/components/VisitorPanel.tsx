import type { Detail } from '../api';
import { Avatar, Card, Column, Divider, Flex, Scroll, Text, initials } from '../kit/ui';
import { StateChip } from './StateChip';
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
  <Flex $justify="space-between" $align="flex-start" $gap={12} style={{ paddingBottom: 8 }}>
    <Text color="neutral600" tag="dt" style={{ flexShrink: 0 }}>
      {name}
    </Text>
    <Text tag="dd" align="end" style={{ margin: 0, overflowWrap: 'anywhere' }}>
      {value}
    </Text>
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
        <div style={{ padding: 24 }}>
          <Flex $direction="column" $align="center" $gap={8} style={{ paddingBottom: 20 }}>
            <Avatar $size={64}>{initials(name)}</Avatar>
            <Text variant="delta" tag="p" align="center">
              {name}
            </Text>
            {detail.visitor.email ? (
              <Text variant="pi" color="neutral600" tag="p" align="center" style={{ overflowWrap: 'anywhere' }}>
                <a href={`mailto:${detail.visitor.email}`} style={{ color: 'inherit' }}>
                  {detail.visitor.email}
                </a>
              </Text>
            ) : null}
          </Flex>
          <Divider />
          <dl style={{ margin: 0, paddingTop: 20 }}>
            <Line name={t('panel.started')} value={date(detail.conversation.createdAt)} />
            <Line name={t('panel.messages')} value={String(messages)} />
            {context.map(([key, value]) => (
              <Line key={key} name={label(key)} value={String(value)} />
            ))}
          </dl>
          {detail.visitor.conversations.length > 0 ? (
            <div style={{ paddingTop: 20 }}>
              <Text variant="sigma" color="neutral600" tag="h3">
                {t('panel.previous')}
              </Text>
              <Flex as="ul" $direction="column" $gap={8} style={{ margin: 0, padding: 0, paddingTop: 12, listStyle: 'none' }}>
                {detail.visitor.conversations.map((other) => (
                  <li key={other.id}>
                    <Card type="button" onClick={() => onOpen(other.id)}>
                      <Text weight="semiBold" ellipsis tag="p">
                        {other.title || t('visitor.guest')}
                      </Text>
                      <Flex $justify="space-between" $gap={8} style={{ paddingTop: 4 }}>
                        <Text variant="pi" color="neutral600">
                          {when(other.lastMessageAt)}
                        </Text>
                        <StateChip row={{ state: other.state, holder: null }} me={null} />
                      </Flex>
                    </Card>
                  </li>
                ))}
              </Flex>
            </div>
          ) : null}
        </div>
      </Scroll>
    </Column>
  );
};
