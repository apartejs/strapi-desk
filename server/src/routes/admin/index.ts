import { policies, type Can } from '../../permissions';

/** The desk's routes: each one for a signed-in admin whose role allows what it does. */
const route = (method: string, path: string, handler: string, can: Can) => ({ method, path, handler: `admin.${handler}`, config: { policies: policies(can) } });

// An object, not a function: Strapi 4 reads a plugin's routers as objects.
export default {
  type: 'admin',
  routes: [
    route('GET', '/me', 'me', 'read'),
    route('GET', '/settings', 'settings', 'read'),
    route('GET', '/conversations', 'list', 'read'),
    route('GET', '/counts', 'counts', 'read'),
    route('GET', '/conversations/:id', 'show', 'read'),
    route('GET', '/saved-replies', 'savedReplies', 'read'),
    route('POST', '/conversations/:id/take', 'take', 'answer'),
    route('POST', '/conversations/:id/hand-back', 'handBack', 'answer'),
    route('POST', '/conversations/:id/messages', 'reply', 'answer'),
    route('POST', '/conversations/:id/notes', 'note', 'answer'),
    route('POST', '/conversations/:id/typing', 'typing', 'answer'),
    route('GET', '/team', 'team', 'assign'),
    route('POST', '/conversations/:id/assign', 'assign', 'assign'),
    route('POST', '/conversations/:id/close', 'close', 'close'),
    route('POST', '/saved-replies', 'createSavedReply', 'savedReplies'),
    route('PUT', '/saved-replies/:id', 'updateSavedReply', 'savedReplies'),
    route('DELETE', '/saved-replies/:id', 'deleteSavedReply', 'savedReplies'),
  ],
};
