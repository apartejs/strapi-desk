import { PassThrough } from 'node:stream';
import type { Core } from '@strapi/strapi';
import { deskConfig, type DeskConfig } from '../config';
import { DeskError, type Conversation } from '../services/desk';
import type { Change } from '../services/hub';

/**
 * The chat API, for any widget on the site: open a conversation, write in it, ask for a person,
 * and hear what the team does.
 *
 * A visitor is anonymous, or a user of the site signed in through Strapi's users-permissions:
 * the widget then sends that user's JWT in `Authorization: Bearer …`, the conversation is theirs,
 * with the name and email of their account, and they reach it by that account. An anonymous
 * visitor reaches a conversation with the token its opening gave, in the `X-Desk-Token` header.
 */
type Account = { id: number; name: string | null; email: string | null };

const chat = ({ strapi }: { strapi: Core.Strapi }) => {
  const config = () => deskConfig(strapi);
  const desk = () => strapi.plugin('aparte-desk').service('desk');
  const hub = () => strapi.plugin('aparte-desk').service('hub');
  const assistant = () => strapi.plugin('aparte-desk').service('assistant');

  const refuse = (ctx, status: number, message: string) => {
    ctx.status = status;
    ctx.body = { error: { status, message } };
  };

  /**
   * The site's user this request is signed in as: null without `Authorization`, or without
   * users-permissions to check it with; undefined (and a 401 answered) for a JWT that is not
   * valid, or a blocked user, as Strapi's own API answers.
   */
  const accountOf = async (ctx): Promise<Account | null | undefined> => {
    if (!ctx.get('authorization')) return null;
    const users = strapi.plugin('users-permissions');
    if (!users) return null;
    let payload: { id?: unknown } | null = null;
    try {
      payload = await users.service('jwt').getToken(ctx);
    } catch {
      payload = null;
    }
    const user = payload?.id != null ? await strapi.db.query('plugin::users-permissions.user').findOne({ where: { id: payload.id } }) : null;
    if (!user || user.blocked) {
      refuse(ctx, 401, 'This Authorization is not a valid user of the site.');
      return undefined;
    }
    return { id: user.id, name: user.username ?? null, email: user.email ?? null };
  };

  const conversationOf = async (ctx): Promise<Conversation | null> => {
    const account = await accountOf(ctx);
    if (account === undefined) return null;
    const token = ctx.get('x-desk-token');
    const conversation = (token ? await desk().authenticate(ctx.params.id, token) : null) ?? (account ? await desk().ownedBy(ctx.params.id, account.id) : null);
    if (!conversation) refuse(ctx, 404, 'No conversation for this id and token.');
    return conversation;
  };

  const text = (ctx, value: unknown): string | null => {
    const words = typeof value === 'string' ? value.trim() : '';
    const max = config().maxMessageLength;
    if (words === '' || words.length > max) {
      ctx.status = 400;
      ctx.body = { error: { status: 400, message: `A message is between 1 and ${max} characters.` } };
      return null;
    }
    return words;
  };

  const shown = (message) => (message ? desk().publicMessage(message) : null);

  const fail = (ctx, error: unknown) => {
    if (error instanceof DeskError) {
      ctx.status = error.status;
      ctx.body = { error: { status: error.status, message: error.message } };
      return;
    }
    throw error;
  };

  return {
    async open(ctx) {
      const account = await accountOf(ctx);
      if (account === undefined) return;
      const body = (ctx.request.body ?? {}) as { visitor?: { name?: unknown; email?: unknown }; context?: unknown };
      const name = typeof body.visitor?.name === 'string' ? body.visitor.name.trim() : undefined;
      const email = typeof body.visitor?.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.visitor.email.trim()) ? body.visitor.email.trim() : undefined;
      const context = body.context && typeof body.context === 'object' && !Array.isArray(body.context) && JSON.stringify(body.context).length <= 4000 ? (body.context as Record<string, unknown>) : undefined;
      // A signed-in user is who their account says, never what the widget says.
      const visitor = account ? { name: account.name ?? undefined, email: account.email ?? undefined, userId: account.id } : { name, email };
      const { conversation, token } = await desk().open({ visitor, context });
      ctx.status = 201;
      ctx.body = { id: conversation.uid, token, ...desk().publicState(conversation), assistant: desk().hasAssistant() };
    },

    async show(ctx) {
      const conversation = await conversationOf(ctx);
      if (!conversation) return;
      const after = typeof ctx.query.after === 'string' ? ctx.query.after : undefined;
      ctx.body = { ...desk().publicState(conversation), messages: await desk().transcript(conversation, after) };
    },

    async write(ctx) {
      const conversation = await conversationOf(ctx);
      if (!conversation) return;
      const body = (ctx.request.body ?? {}) as { text?: unknown; id?: unknown };
      const words = text(ctx, body.text);
      if (words === null) return;
      // The widget may name its message, to match it with what it shows. Never one already used.
      const uid = typeof body.id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(body.id) ? body.id : undefined;
      try {
        const written = await desk().visitorWrites(conversation, words, uid);
        let reply = null;
        let notice = written.notice;
        let current = written.conversation;
        if (written.assistantAnswers) {
          const answered = await assistant().answer(current);
          reply = answered.reply;
          notice = answered.notice ?? notice;
          current = answered.conversation;
        }
        ctx.body = { message: shown(written.message), reply: shown(reply), notice: shown(notice), ...desk().publicState(current) };
      } catch (error) {
        if ((error as { code?: string })?.code?.includes?.('UNIQUE') || /unique/i.test(String((error as Error)?.message))) {
          ctx.status = 409;
          ctx.body = { error: { status: 409, message: 'A message with this id exists already.' } };
          return;
        }
        fail(ctx, error);
      }
    },

    /** The visitor asks for a person: the conversation goes to the team, without the model. */
    async human(ctx) {
      const conversation = await conversationOf(ctx);
      if (!conversation) return;
      const { conversation: current, notice } = await desk().want(conversation, 'The visitor asked for a person', 'visitor');
      ctx.body = { notice: shown(notice), ...desk().publicState(current) };
    },

    /** The visitor is writing, while the team is awaited or in the conversation. */
    async typing(ctx) {
      const conversation = await conversationOf(ctx);
      if (!conversation) return;
      if (conversation.state === 'wanted' || conversation.state === 'held') hub().visitorTyping(conversation.uid);
      ctx.status = 204;
    },

    /** What the team does, as it happens: server-sent events, one per change. */
    async events(ctx) {
      const conversation = await conversationOf(ctx);
      if (!conversation) return;
      const stream = new PassThrough();
      const send = (change: Change | { type: 'ready'; state: unknown }) => stream.write(`event: ${change.type}\ndata: ${JSON.stringify(change)}\n\n`);
      ctx.req.socket.setTimeout(0);
      ctx.req.socket.setNoDelay(true);
      ctx.req.socket.setKeepAlive(true);
      ctx.set({ 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
      ctx.status = 200;
      ctx.body = stream;
      send({ type: 'ready', state: desk().publicState(conversation) });
      const stop = hub().subscribe(conversation.uid, send);
      // A comment every 25 s keeps proxies from closing an idle stream.
      const ping = setInterval(() => stream.write(': ping\n\n'), 25_000);
      const end = () => {
        stop();
        clearInterval(ping);
        stream.end();
      };
      ctx.req.on('close', end);
      stream.on('error', end);
    },
  };
};

export default chat;
