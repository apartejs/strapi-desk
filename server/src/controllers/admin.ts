import type { Core } from '@strapi/strapi';
import { DeskError, memberName, type Conversation, type Member } from '../services/desk';
import type { Tab } from '../services/inbox';
import { ACTIONS, action, type Can } from '../permissions';

const SAVED_REPLY = 'plugin::aparte-desk.saved-reply';
const TABS: Tab[] = ['wanted', 'mine', 'waiting', 'all'];

/** The desk's own routes, for the admin panel; each route says which permission it needs. */
const admin = ({ strapi }: { strapi: Core.Strapi }) => {
  const desk = () => strapi.plugin('aparte-desk').service('desk');
  const inbox = () => strapi.plugin('aparte-desk').service('inbox');

  const member = (ctx): Member => ctx.state.user;

  const found = async (ctx): Promise<Conversation | null> => {
    const conversation = await desk().load(ctx.params.id);
    if (!conversation) ctx.notFound('No such conversation.');
    return conversation;
  };

  const words = (ctx, value: unknown, max = 20000): string | null => {
    const text = typeof value === 'string' ? value.trim() : '';
    if (text === '' || text.length > max) {
      ctx.badRequest(`Write between 1 and ${max} characters.`);
      return null;
    }
    return text;
  };

  /** Run an act on a conversation, and answer with it as the desk shows it. */
  const act = async (ctx, run: (conversation: Conversation) => Promise<unknown>) => {
    const conversation = await found(ctx);
    if (!conversation) return;
    try {
      await run(conversation);
    } catch (error) {
      if (error instanceof DeskError) {
        ctx.status = error.status;
        ctx.body = { error: { status: error.status, message: error.message } };
        return;
      }
      throw error;
    }
    ctx.body = await inbox().show(await desk().load(conversation.uid));
  };

  return {
    /** Who is signed in, and what their role lets them do here: the panel hides the rest. */
    async me(ctx) {
      const user = member(ctx);
      const ability = ctx.state.userAbility as { can: (action: string) => boolean } | undefined;
      const can = Object.fromEntries((Object.keys(ACTIONS) as Can[]).map((key) => [key, Boolean(ability?.can(action(key)))]));
      ctx.body = { id: user.id, name: memberName(user), can, assistant: desk().hasAssistant() };
    },

    async settings(ctx) {
      ctx.body = { assistant: desk().hasAssistant() };
    },

    async list(ctx) {
      const tab = TABS.includes(ctx.query.tab) ? ctx.query.tab : 'all';
      const page = Number.parseInt(String(ctx.query.page ?? '1'), 10) || 1;
      ctx.body = await inbox().list(member(ctx), { tab, q: typeof ctx.query.q === 'string' ? ctx.query.q : undefined, page });
    },

    async counts(ctx) {
      ctx.body = await inbox().counts(member(ctx));
    },

    async team(ctx) {
      ctx.body = { results: await inbox().team() };
    },

    /** Open one. Whoever holds it, opening it marks the visitor's messages read. */
    async show(ctx) {
      const conversation = await found(ctx);
      if (!conversation) return;
      if (conversation.state === 'held' && conversation.holder?.id === member(ctx).id) await desk().markRead(conversation, member(ctx));
      ctx.body = await inbox().show(conversation);
    },

    take: (ctx) => act(ctx, (conversation) => desk().take(conversation, member(ctx))),

    handBack: (ctx) => act(ctx, (conversation) => desk().handBack(conversation, member(ctx))),

    close: (ctx) => act(ctx, (conversation) => desk().close(conversation, member(ctx))),

    async assign(ctx) {
      const to = Number(ctx.request.body?.userId);
      const team = await inbox().team();
      const colleague = team.find((user) => user.id === to);
      if (!colleague) return ctx.badRequest('Give the conversation to someone who may take conversations over and answer.');
      const user = await strapi.db.query('admin::user').findOne({ where: { id: to }, select: ['id', 'firstname', 'lastname', 'username', 'email'] });
      return act(ctx, (conversation) => desk().assign(conversation, member(ctx), user));
    },

    async reply(ctx) {
      const text = words(ctx, ctx.request.body?.text);
      if (text === null) return;
      return act(ctx, async (conversation) => {
        await desk().teamWrites(conversation, member(ctx), text);
      });
    },

    async note(ctx) {
      const text = words(ctx, ctx.request.body?.text);
      if (text === null) return;
      return act(ctx, (conversation) => desk().note(conversation, member(ctx), text));
    },

    async typing(ctx) {
      const conversation = await found(ctx);
      if (!conversation) return;
      if (conversation.state === 'held' && conversation.holder?.id === member(ctx).id) desk().teamTyping(conversation, member(ctx));
      ctx.status = 204;
    },

    async savedReplies(ctx) {
      ctx.body = { results: await strapi.db.query(SAVED_REPLY).findMany({ orderBy: [{ title: 'asc' }] }) };
    },

    async createSavedReply(ctx) {
      const title = words(ctx, ctx.request.body?.title, 120);
      if (title === null) return;
      const text = words(ctx, ctx.request.body?.text);
      if (text === null) return;
      ctx.status = 201;
      ctx.body = await strapi.db.query(SAVED_REPLY).create({ data: { title, text } });
    },

    async updateSavedReply(ctx) {
      const title = words(ctx, ctx.request.body?.title, 120);
      if (title === null) return;
      const text = words(ctx, ctx.request.body?.text);
      if (text === null) return;
      const updated = await strapi.db.query(SAVED_REPLY).update({ where: { id: Number(ctx.params.id) }, data: { title, text } });
      if (!updated) return ctx.notFound('No such saved reply.');
      ctx.body = updated;
    },

    async deleteSavedReply(ctx) {
      await strapi.db.query(SAVED_REPLY).delete({ where: { id: Number(ctx.params.id) } });
      ctx.status = 204;
    },
  };
};

export default admin;
