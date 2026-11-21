import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { Core } from '@strapi/strapi';
import { deskConfig, type DeskConfig } from '../config';
import type { Change, PublicMessage, PublicState } from './hub';

export const CONVERSATION = 'plugin::aparte-desk.conversation';
export const MESSAGE = 'plugin::aparte-desk.message';
export const NOTE = 'plugin::aparte-desk.note';

export type State = PublicState['state'];
export type WantedSource = 'tool' | 'visitor' | 'message';

/** An admin user, as the desk names them. */
export interface Member {
  id: number;
  firstname?: string | null;
  lastname?: string | null;
  username?: string | null;
  email?: string | null;
}

export interface Conversation {
  id: number;
  uid: string;
  tokenHash?: string;
  title?: string | null;
  state: State;
  holder?: Member | null;
  wantedReason?: string | null;
  wantedSource?: WantedSource | null;
  wantedAt?: string | null;
  takenAt?: string | null;
  closedAt?: string | null;
  lastMessageAt?: string | null;
  lastMessage?: string | null;
  lastFrom?: 'visitor' | 'assistant' | 'team' | null;
  visitorName?: string | null;
  visitorEmail?: string | null;
  visitorUserId?: number | null;
  context?: Record<string, unknown> | null;
  createdAt?: string;
}

export interface Message {
  id: number;
  uid: string;
  from: PublicMessage['from'];
  text?: string | null;
  event?: string | null;
  meta?: Record<string, unknown> | null;
  author?: Member | null;
  authorName?: string | null;
  readByName?: string | null;
  readAt?: string | null;
  createdAt: string;
}

/** The desk refuses: the controller turns it into an HTTP answer. */
export class DeskError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

const MEMBER_FIELDS = ['id', 'firstname', 'lastname', 'username', 'email'];

export const memberName = (member: Member | null | undefined): string => {
  if (!member) return '';
  const full = [member.firstname, member.lastname].filter(Boolean).join(' ').trim();
  return full || member.username || member.email || `#${member.id}`;
};

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

const preview = (text: string) => (text.length > 280 ? `${text.slice(0, 279)}…` : text);

const fill = (words: string, values: Record<string, string>) =>
  words.replace(/\{(\w+)\}/g, (all, key) => values[key] ?? all);

const desk = ({ strapi }: { strapi: Core.Strapi }) => {
  const config = (): DeskConfig => deskConfig(strapi);
  const conversations = () => strapi.db.query(CONVERSATION);
  const messages = () => strapi.db.query(MESSAGE);
  const hub = () => strapi.plugin('aparte-desk').service('hub');
  const publish = (conversation: Conversation, change: Change) => hub().publish(conversation.uid, change);

  const hasAssistant = () => Boolean(config().assistant);

  const load = async (uid: string): Promise<Conversation | null> =>
    conversations().findOne({ where: { uid }, populate: { holder: { select: MEMBER_FIELDS } } });

  const update = async (conversation: Conversation, data: Omit<Partial<Conversation>, 'holder'> & { holder?: number | null }) => {
    const updated: Conversation = await conversations().update({
      where: { id: conversation.id },
      data,
      populate: { holder: { select: MEMBER_FIELDS } },
    });
    return updated;
  };

  const publicState = (conversation: Conversation): PublicState => ({
    state: conversation.state,
    holder: conversation.state === 'held' && conversation.holder ? { name: memberName(conversation.holder) } : null,
  });

  /** What the visitor's chat shows of a message. An event shows its notice; one with no notice shows nothing. */
  const publicMessage = (message: Message): PublicMessage | null => {
    if (message.from === 'event' && !message.text) return null;
    const name = message.authorName || memberName(message.author);
    return {
      id: message.uid,
      from: message.from,
      text: message.text ?? '',
      ...(message.event ? { event: message.event } : {}),
      ...(message.from === 'team' && name ? { author: { name } } : {}),
      createdAt: new Date(message.createdAt).toISOString(),
      ...(message.readByName ? { readBy: fill(config().notices.read, { name: message.readByName }) } : {}),
    };
  };

  const record = async (
    conversation: Conversation,
    entry: { from: Message['from']; text?: string; event?: string; meta?: Record<string, unknown>; author?: Member | null; uid?: string }
  ): Promise<Message> => {
    const message: Message = await messages().create({
      data: {
        uid: entry.uid ?? randomUUID(),
        conversation: conversation.id,
        from: entry.from,
        text: entry.text ?? null,
        event: entry.event ?? null,
        meta: entry.meta ?? null,
        author: entry.author?.id ?? null,
        authorName: entry.author ? memberName(entry.author) : null,
      },
    });
    if (entry.from !== 'event') {
      await conversations().update({
        where: { id: conversation.id },
        data: { lastMessageAt: message.createdAt, lastMessage: preview(entry.text ?? ''), lastFrom: entry.from },
      });
    }
    const shown = publicMessage(message);
    if (shown) publish(conversation, { type: 'message', message: shown });
    return message;
  };

  const changed = (conversation: Conversation) => publish(conversation, { type: 'state', state: publicState(conversation) });

  return {
    hasAssistant,
    publicState,
    publicMessage,
    load,

    /** A new conversation, for a widget. The token is given once: the visitor's chat keeps it. */
    async open(input: { visitor?: { name?: string; email?: string; userId?: number }; context?: Record<string, unknown> }) {
      const token = randomBytes(32).toString('base64url');
      const conversation: Conversation = await conversations().create({
        data: {
          uid: randomUUID(),
          tokenHash: hashToken(token),
          state: 'assistant',
          visitorName: input.visitor?.name?.slice(0, 200) || null,
          visitorEmail: input.visitor?.email || null,
          visitorUserId: input.visitor?.userId ?? null,
          context: input.context ?? null,
        },
      });
      return { conversation, token };
    },

    /** The conversation this token opens, or null: a wrong token and an unknown id look alike. */
    async authenticate(uid: string, token: string | undefined): Promise<Conversation | null> {
      if (typeof uid !== 'string' || typeof token !== 'string' || token === '') return null;
      const conversation: Conversation | null = await conversations().findOne({
        where: { uid },
        select: ['id', 'tokenHash'],
      });
      if (!conversation?.tokenHash) return null;
      const given = Buffer.from(hashToken(token), 'hex');
      const kept = Buffer.from(conversation.tokenHash, 'hex');
      if (given.length !== kept.length || !timingSafeEqual(given, kept)) return null;
      return load(uid);
    },

    /** The conversation of this signed-in user, or null: a site's user reaches theirs by their account. */
    async ownedBy(uid: string, userId: number): Promise<Conversation | null> {
      if (typeof uid !== 'string') return null;
      const conversation: Conversation | null = await conversations().findOne({ where: { uid, visitorUserId: userId }, select: ['id'] });
      return conversation ? load(uid) : null;
    },

    /** The messages the visitor's chat shows, oldest first. */
    async transcript(conversation: Conversation, after?: string): Promise<PublicMessage[]> {
      let since: string | undefined;
      if (after) {
        const from: Message | null = await messages().findOne({ where: { uid: after, conversation: conversation.id } });
        since = from?.createdAt;
      }
      const rows: Message[] = await messages().findMany({
        where: { conversation: conversation.id, ...(since ? { createdAt: { $gt: since } } : {}) },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        populate: { author: { select: MEMBER_FIELDS } },
      });
      return rows.map(publicMessage).filter((message): message is PublicMessage => message !== null);
    },

    /**
     * The visitor writes. A closed conversation opens again; in a chat with the team only, the
     * first message hands it over. Says whether the assistant answers it.
     */
    async visitorWrites(conversation: Conversation, text: string, uid?: string) {
      let current = conversation;
      if (!current.title) current = await update(current, { title: preview(text).slice(0, 200) });
      if (current.state === 'closed') {
        current = await update(current, { state: 'assistant', closedAt: null, holder: null });
        changed(current);
      }
      const message = await record(current, { from: 'visitor', text, uid });
      let notice: Message | null = null;
      if (current.state === 'assistant' && !hasAssistant()) {
        const handed = await this.want(current, text, 'message');
        current = handed.conversation;
        notice = handed.notice;
      }
      return { conversation: current, message, notice, assistantAnswers: current.state === 'assistant' && hasAssistant() };
    },

    async assistantWrites(conversation: Conversation, text: string) {
      return record(conversation, { from: 'assistant', text });
    },

    /**
     * The conversation goes to the team: the assistant (its tool), the visitor (a button of the
     * widget) or a chat with the team only (`message`). Once: a conversation that waits or is
     * held already stays as it is, and gives no notice.
     */
    async want(conversation: Conversation, reason: string, source: WantedSource) {
      if (conversation.state === 'wanted' || conversation.state === 'held') return { conversation, notice: null as Message | null };
      const current = await update(conversation, {
        state: 'wanted',
        wantedReason: preview(reason || '').slice(0, 300) || null,
        wantedSource: source,
        wantedAt: new Date().toISOString(),
        holder: null,
        closedAt: null,
      });
      changed(current);
      const notice = await record(current, { from: 'event', event: 'wanted', text: config().notices.wanted, meta: { source } });
      return { conversation: current, notice };
    },

    /** Someone of the team takes the conversation: the assistant goes quiet. */
    async take(conversation: Conversation, member: Member) {
      if (conversation.state === 'held' && conversation.holder?.id === member.id) return conversation;
      const current = await update(conversation, { state: 'held', holder: member.id, takenAt: new Date().toISOString(), closedAt: null });
      changed(current);
      await record(current, { from: 'event', event: 'held', text: fill(config().notices.joined, { name: memberName(member) }), meta: { name: memberName(member) } });
      return current;
    },

    /** Give the conversation to a colleague: they hold it, the visitor reads that they joined. */
    async assign(conversation: Conversation, by: Member, to: Member) {
      const current = await update(conversation, { state: 'held', holder: to.id, takenAt: new Date().toISOString(), closedAt: null });
      changed(current);
      await record(current, {
        from: 'event',
        event: 'assigned',
        text: fill(config().notices.joined, { name: memberName(to) }),
        meta: { by: memberName(by), name: memberName(to) },
      });
      return current;
    },

    /** Back to the assistant, which reads everything that was said. */
    async handBack(conversation: Conversation, member: Member) {
      if (!hasAssistant()) throw new DeskError(409, 'This desk has no assistant to hand the conversation back to.');
      const current = await update(conversation, { state: 'assistant', holder: null, wantedReason: null, wantedSource: null, wantedAt: null });
      changed(current);
      await record(current, { from: 'event', event: 'back', text: config().notices.back, meta: { by: memberName(member) } });
      return current;
    },

    /** Done: the visitor reads it is closed. Nothing is deleted; a new message opens it again. */
    async close(conversation: Conversation, member: Member) {
      if (conversation.state === 'closed') return conversation;
      const current = await update(conversation, { state: 'closed', holder: null, closedAt: new Date().toISOString() });
      changed(current);
      await record(current, { from: 'event', event: 'closed', text: config().notices.closed, meta: { by: memberName(member) } });
      return current;
    },

    /** Someone of the team answers. Only whoever holds the conversation does. */
    async teamWrites(conversation: Conversation, member: Member, text: string) {
      if (conversation.state !== 'held' || conversation.holder?.id !== member.id) {
        throw new DeskError(409, 'Take the conversation over to answer in it.');
      }
      return record(conversation, { from: 'team', text, author: member });
    },

    /** "Read by Marie" under the visitor's messages nobody of the team had read. */
    async markRead(conversation: Conversation, member: Member) {
      const unread: Message[] = await messages().findMany({
        where: { conversation: conversation.id, from: 'visitor', readAt: null },
        select: ['id', 'uid'],
      });
      if (unread.length === 0) return [];
      const name = memberName(member);
      await messages().updateMany({
        where: { id: { $in: unread.map((message) => message.id) } },
        data: { readAt: new Date().toISOString(), readByName: name },
      });
      const ids = unread.map((message) => message.uid);
      publish(conversation, { type: 'read', ids, name, note: fill(config().notices.read, { name }) });
      return ids;
    },

    /** A note for the team: the visitor never sees it, the assistant never reads it. */
    async note(conversation: Conversation, member: Member, text: string) {
      return strapi.db.query(NOTE).create({
        data: { conversation: conversation.id, text, author: member.id, authorName: memberName(member) },
      });
    },

    teamTyping(conversation: Conversation, member: Member) {
      publish(conversation, { type: 'typing', name: memberName(member) });
    },
  };
};

export default desk;
