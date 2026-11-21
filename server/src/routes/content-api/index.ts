/**
 * The chat API, at `/api/aparte-desk/…`. Open to the visitors of the site, without Strapi's
 * users-permissions: a conversation is reached with the token its opening gave.
 */
const open = { auth: false as const, policies: [] };

export default () => ({
  type: 'content-api',
  routes: [
    { method: 'POST', path: '/conversations', handler: 'chat.open', config: open },
    { method: 'GET', path: '/conversations/:id', handler: 'chat.show', config: open },
    { method: 'POST', path: '/conversations/:id/messages', handler: 'chat.write', config: open },
    { method: 'POST', path: '/conversations/:id/human', handler: 'chat.human', config: open },
    { method: 'POST', path: '/conversations/:id/typing', handler: 'chat.typing', config: open },
    { method: 'GET', path: '/conversations/:id/events', handler: 'chat.events', config: open },
  ],
});
