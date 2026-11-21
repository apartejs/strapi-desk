/** The desk's routes, for whoever may use it: a signed-in admin whose role has "Use the desk". */
const desk = {
  policies: ['admin::isAuthenticatedAdmin', { name: 'admin::hasPermissions', config: { actions: ['plugin::aparte-desk.use'] } }],
};

export default () => ({
  type: 'admin',
  routes: [
    { method: 'GET', path: '/settings', handler: 'admin.settings', config: desk },
    { method: 'GET', path: '/conversations', handler: 'admin.list', config: desk },
    { method: 'GET', path: '/counts', handler: 'admin.counts', config: desk },
    { method: 'GET', path: '/team', handler: 'admin.team', config: desk },
    { method: 'GET', path: '/conversations/:id', handler: 'admin.show', config: desk },
    { method: 'POST', path: '/conversations/:id/take', handler: 'admin.take', config: desk },
    { method: 'POST', path: '/conversations/:id/hand-back', handler: 'admin.handBack', config: desk },
    { method: 'POST', path: '/conversations/:id/close', handler: 'admin.close', config: desk },
    { method: 'POST', path: '/conversations/:id/assign', handler: 'admin.assign', config: desk },
    { method: 'POST', path: '/conversations/:id/messages', handler: 'admin.reply', config: desk },
    { method: 'POST', path: '/conversations/:id/notes', handler: 'admin.note', config: desk },
    { method: 'POST', path: '/conversations/:id/typing', handler: 'admin.typing', config: desk },
    { method: 'GET', path: '/saved-replies', handler: 'admin.savedReplies', config: desk },
    { method: 'POST', path: '/saved-replies', handler: 'admin.createSavedReply', config: desk },
    { method: 'PUT', path: '/saved-replies/:id', handler: 'admin.updateSavedReply', config: desk },
    { method: 'DELETE', path: '/saved-replies/:id', handler: 'admin.deleteSavedReply', config: desk },
  ],
});
