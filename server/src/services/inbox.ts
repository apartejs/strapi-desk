import type { Core } from '@strapi/strapi';
import { action } from '../permissions';
import { CONVERSATION, MESSAGE, NOTE, memberName, type Conversation, type Member, type Message } from './desk';

const SUPER_ADMIN = 'strapi-super-admin';
const MEMBER_FIELDS = ['id', 'firstname', 'lastname', 'username', 'email'];

export type Tab = 'wanted' | 'mine' | 'waiting' | 'all';

/** A conversation as the desk's list shows it. */
const row = (conversation: Conversation) => ({
  id: conversation.uid,
  title: conversation.title || null,
  visitor: { name: conversation.visitorName || null, email: conversation.visitorEmail || null },
  state: conversation.state,
  holder: conversation.holder ? { id: conversation.holder.id, name: memberName(conversation.holder) } : null,
  wanted: conversation.state === 'wanted' ? { reason: conversation.wantedReason ?? null, source: conversation.wantedSource ?? null, at: conversation.wantedAt ?? null } : null,
  lastMessage: conversation.lastMessage ?? null,
  lastFrom: conversation.lastFrom ?? null,
  lastMessageAt: conversation.lastMessageAt ?? null,
  // Nobody has answered the visitor's last message yet.
  waiting: conversation.lastFrom === 'visitor' && conversation.state !== 'closed',
  createdAt: conversation.createdAt,
});

/** What the desk reads: the list, one conversation, the counts, the team. */
const inbox = ({ strapi }: { strapi: Core.Strapi }) => {
  const conversations = () => strapi.db.query(CONVERSATION);

  const tabWhere = (tab: Tab, member: Member): Record<string, unknown> => {
    switch (tab) {
      case 'wanted':
        return { state: 'wanted' };
      case 'mine':
        return { state: 'held', holder: { id: member.id } };
      case 'waiting':
        return { lastFrom: 'visitor', state: { $ne: 'closed' } };
      default:
        return {};
    }
  };

  const search = (q: string | undefined) => {
    const words = (q ?? '').trim();
    if (!words) return {};
    return {
      $or: [
        { title: { $containsi: words } },
        { visitorName: { $containsi: words } },
        { visitorEmail: { $containsi: words } },
        { messages: { text: { $containsi: words } } },
      ],
    };
  };

  return {
    row,

    async list(member: Member, { tab = 'all', q, page = 1, pageSize = 30 }: { tab?: Tab; q?: string; page?: number; pageSize?: number }) {
      const where = { $and: [tabWhere(tab, member), search(q)] };
      // The queue: the oldest request first. Everything else: the newest activity first.
      const orderBy = tab === 'wanted' ? [{ wantedAt: 'asc' }] : [{ updatedAt: 'desc' }];
      const size = Math.min(Math.max(pageSize, 1), 100);
      const [results, total] = await Promise.all([
        conversations().findMany({
          where,
          orderBy,
          limit: size,
          offset: (Math.max(page, 1) - 1) * size,
          populate: { holder: { select: MEMBER_FIELDS } },
        }),
        conversations().count({ where }),
      ]);
      return { results: (results as Conversation[]).map(row), pagination: { page, pageSize: size, total } };
    },

    /** One conversation for the desk: everything said in it, its events, the team's notes, the visitor. */
    async show(conversation: Conversation) {
      const [messages, notes, others] = await Promise.all([
        strapi.db.query(MESSAGE).findMany({
          where: { conversation: conversation.id },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          populate: { author: { select: MEMBER_FIELDS } },
        }) as Promise<Message[]>,
        strapi.db.query(NOTE).findMany({
          where: { conversation: conversation.id },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          populate: { author: { select: MEMBER_FIELDS } },
        }),
        this.otherConversations(conversation),
      ]);
      const hub = strapi.plugin('aparte-desk').service('hub');
      return {
        conversation: { ...row(conversation), context: conversation.context ?? null },
        messages: messages.map((message) => ({
          id: message.uid,
          from: message.from,
          text: message.text ?? '',
          event: message.event ?? null,
          meta: message.meta ?? null,
          author: message.from === 'team' ? { id: message.author?.id ?? null, name: message.authorName || memberName(message.author) } : null,
          readBy: message.readByName ?? null,
          createdAt: message.createdAt,
        })),
        notes: notes.map((note: { id: number; text: string; authorName?: string; author?: Member; createdAt: string }) => ({
          id: note.id,
          text: note.text,
          author: { id: note.author?.id ?? null, name: note.authorName || memberName(note.author) },
          createdAt: note.createdAt,
        })),
        visitor: {
          name: conversation.visitorName ?? null,
          email: conversation.visitorEmail ?? null,
          userId: conversation.visitorUserId ?? null,
          typing: hub.isVisitorTyping(conversation.uid),
          conversations: others,
        },
      };
    },

    /** The visitor's other conversations, when the widget said who they are. */
    async otherConversations(conversation: Conversation) {
      const same: Record<string, unknown>[] = [];
      if (conversation.visitorUserId != null) same.push({ visitorUserId: conversation.visitorUserId });
      if (conversation.visitorEmail) same.push({ visitorEmail: conversation.visitorEmail });
      if (same.length === 0) return [];
      const found: Conversation[] = await conversations().findMany({
        where: { $or: same, id: { $ne: conversation.id } },
        orderBy: [{ updatedAt: 'desc' }],
        limit: 10,
      });
      return found.map((other) => ({ id: other.uid, title: other.title ?? null, state: other.state, lastMessageAt: other.lastMessageAt ?? null }));
    },

    /** The numbers the desk shows: what waits for someone, and what waits for me. */
    async counts(member: Member) {
      const [wanted, mine] = await Promise.all([
        conversations().count({ where: { state: 'wanted' } }),
        conversations().count({ where: { state: 'held', holder: { id: member.id }, lastFrom: 'visitor' } }),
      ]);
      return { wanted, mine };
    },

    /** Who may hold a conversation: the super admins, and the roles allowed to take over and answer. */
    async team(): Promise<{ id: number; name: string; email: string | null }[]> {
      const permissions: { role?: { id: number } }[] = await strapi.db.query('admin::permission').findMany({
        where: { action: action('answer') },
        populate: { role: { select: ['id'] } },
      });
      const roleIds = permissions.map((permission) => permission.role?.id).filter((id): id is number => typeof id === 'number');
      const users: Member[] = await strapi.db.query('admin::user').findMany({
        where: { isActive: true, roles: { $or: [{ code: SUPER_ADMIN }, ...(roleIds.length ? [{ id: { $in: roleIds } }] : [])] } },
        select: MEMBER_FIELDS,
        orderBy: [{ firstname: 'asc' }],
      });
      return users.map((user) => ({ id: user.id, name: memberName(user), email: user.email ?? null }));
    },
  };
};

export default inbox;
