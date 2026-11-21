/**
 * What happens in a conversation, told to whoever listens to it right now: the visitor's chat,
 * through the events route. In memory, in this process: with several Strapi instances behind a
 * load balancer, a visitor connected to one does not hear what the desk did on another (their
 * chat still reads it on its next GET).
 */
export type Change =
  | { type: 'message'; message: PublicMessage }
  | { type: 'state'; state: PublicState }
  | { type: 'typing'; name: string }
  | { type: 'read'; ids: string[]; name: string; note: string };

export interface PublicMessage {
  id: string;
  from: 'visitor' | 'assistant' | 'team' | 'event';
  text: string;
  /** For `from: 'event'`: what happened (`wanted`, `held`, `assigned`, `back`, `closed`). */
  event?: string;
  author?: { name: string };
  createdAt: string;
  /** "Read by Marie", once someone of the team has read a visitor's message. */
  readBy?: string;
}

export interface PublicState {
  /** Who answers: the assistant, nobody yet (`wanted`), someone of the team (`held`), or nobody (`closed`). */
  state: 'assistant' | 'wanted' | 'held' | 'closed';
  holder: { name: string } | null;
}

type Listener = (change: Change) => void;

const hub = (_deps?: unknown) => {
  const listeners = new Map<string, Set<Listener>>();
  const visitorTypingUntil = new Map<string, number>();

  return {
    publish(conversation: string, change: Change) {
      for (const listener of listeners.get(conversation) ?? []) {
        try {
          listener(change);
        } catch {
          // One listener that fails (a closed socket) does not keep the others from hearing.
        }
      }
    },

    subscribe(conversation: string, listener: Listener): () => void {
      let set = listeners.get(conversation);
      if (!set) listeners.set(conversation, (set = new Set()));
      set.add(listener);
      return () => {
        set.delete(listener);
        if (set.size === 0) listeners.delete(conversation);
      };
    },

    /** The visitor is writing: true for a few seconds, for the desk to show it. */
    visitorTyping(conversation: string) {
      visitorTypingUntil.set(conversation, Date.now() + 6000);
    },

    isVisitorTyping(conversation: string): boolean {
      const until = visitorTypingUntil.get(conversation);
      if (until === undefined) return false;
      if (until > Date.now()) return true;
      visitorTypingUntil.delete(conversation);
      return false;
    },

    listening(conversation: string): number {
      return listeners.get(conversation)?.size ?? 0;
    },
  };
};

export default hub;
