/**
 * What a role may do with the desk, ticked in Settings › Administration panel › Roles ›
 * Plugins. The super admins may do all of it. Each admin route asks for one of them, and the
 * admin panel hides what the signed-in member may not do.
 */
export const ACTIONS = {
  /** See the desk in the menu, its conversations, the visitor and the team's notes. */
  read: { uid: 'read', displayName: 'See the conversations' },
  /** Take a conversation over, answer the visitor, write a note, hand it back to the assistant. */
  answer: { uid: 'answer', displayName: 'Take over and answer' },
  /** Give a conversation to a colleague. */
  assign: { uid: 'assign', displayName: 'Assign to a colleague' },
  /** Close a conversation. */
  close: { uid: 'close', displayName: 'Close' },
  /** Write, change and delete the saved replies. Everyone who answers may use them. */
  savedReplies: { uid: 'saved-replies', displayName: 'Manage the saved replies' },
} as const;

export type Can = keyof typeof ACTIONS;

export const action = (can: Can) => `plugin::aparte-desk.${ACTIONS[can].uid}`;

/** The policies of a route that needs `can`: a signed-in admin whose role allows it. */
export const policies = (can: Can) => ['admin::isAuthenticatedAdmin', { name: 'admin::hasPermissions', config: { actions: [action(can)] } }];
