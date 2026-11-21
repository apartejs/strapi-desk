/**
 * An aparté chat on the desk's chat API: what a widget needs, in one function, with no framework.
 * Under React, Vue, Svelte or Angular, mount their chat component and hand its element to
 * `connectDesk` the same way: everything here talks to the element and to the API.
 *
 * The desk answers, the page does not run a model: the assistant (when Strapi has one) answers on
 * the server, and its reply comes back with the message. So the chat's own AI is turned off, and
 * every message goes to the API.
 */
import { aparteGlobalConfig } from '@aparte/core';

const KEPT = 'aparte-desk:conversation';

/** A message of the API, as the chat draws it. */
function toChat(message) {
  const timestamp = Date.parse(message.createdAt) || Date.now();
  if (message.from === 'event') return { id: message.id, role: 'assistant', kind: 'notice', content: message.text, timestamp };
  return {
    id: message.id,
    role: message.from === 'visitor' ? 'user' : 'assistant',
    content: message.text,
    timestamp,
    ...(message.from === 'team' ? { author: { name: message.author?.name ?? 'Team', type: 'human' } } : {}),
    ...(message.readBy ? { note: message.readBy } : {}),
  };
}

/** Each `event:` and `data:` pair of a server-sent events stream read with fetch. */
async function readEvents(response, on) {
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += value;
    let end;
    while ((end = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      const type = /^event: (.*)$/m.exec(block)?.[1];
      const data = /^data: (.*)$/m.exec(block)?.[1];
      if (type && data) on(type, JSON.parse(data));
    }
  }
}

/**
 * Binds `chat` (an `<aparte-chat>`) to the desk at `api` (`https://cms.example.com/api/aparte-desk`).
 * `jwt()` gives the JWT of the user signed in on the site, or null for a guest: every request
 * sends it, as any request to Strapi does, and nothing else is called when the user signs in.
 * The desk ties the conversation to the account on the first request that brings it.
 * `onState` hears who answers and who the desk sees.
 */
export function connectDesk(chat, { api, jwt, onState = () => {} }) {
  aparteGlobalConfig.setAutoReply(false);

  let conversation = JSON.parse(localStorage.getItem(KEPT) ?? 'null');
  let listening = null;

  const headers = () => {
    const signedIn = jwt();
    return {
      'Content-Type': 'application/json',
      ...(conversation ? { 'X-Desk-Token': conversation.token } : {}),
      ...(signedIn ? { Authorization: `Bearer ${signedIn}` } : {}),
    };
  };
  const call = async (path, init = {}) => {
    const response = await fetch(`${api}/conversations${path}`, { ...init, headers: headers() });
    if (!response.ok) throw new Error(`The desk answered ${response.status}`);
    return response.status === 204 ? null : response.json();
  };

  const viewport = () => chat.viewport;
  const show = (message) => {
    if (!message) return;
    const shown = viewport()?.getMessages() ?? [];
    if (!shown.some((one) => one.id === message.id)) viewport()?.appendMessage(toChat(message));
  };

  const listen = () => {
    listening?.abort();
    if (!conversation) return;
    const controller = new AbortController();
    listening = controller;
    fetch(`${api}/conversations/${conversation.id}/events`, { headers: headers(), signal: controller.signal })
      .then((response) =>
        readEvents(response, (type, change) => {
          if (type === 'message') show(change.message);
          if (type === 'state' || type === 'ready') onState(change.state);
          if (type === 'read') for (const id of change.ids) viewport()?.updateMessage(id, { note: change.note });
        })
      )
      .catch(() => {});
  };

  /** The conversation as the desk has it: its messages, who answers, and who the visitor is. */
  const load = async () => {
    if (!conversation) return onState({ state: 'assistant', holder: null, visitor: null });
    try {
      const current = await call(`/${conversation.id}`);
      viewport()?.setMessages(current.messages.map(toChat));
      onState(current);
      listen();
    } catch {
      // Closed for good, or a token the desk no longer knows: a new conversation starts at the next message.
      conversation = null;
      localStorage.removeItem(KEPT);
      onState({ state: 'assistant', holder: null, visitor: null });
    }
  };

  const onSend = (event) => {
    // After the chat has drawn the message and written its id into the event.
    queueMicrotask(async () => {
      const { content, messageId } = event.detail ?? {};
      try {
        if (!conversation) {
          const opened = await call('', { method: 'POST', body: JSON.stringify({ context: { page: location.pathname } }) });
          conversation = { id: opened.id, token: opened.token };
          localStorage.setItem(KEPT, JSON.stringify(conversation));
          listen();
        }
        const answer = await call(`/${conversation.id}/messages`, { method: 'POST', body: JSON.stringify({ id: messageId, text: content }) });
        show(answer.notice);
        show(answer.reply);
        onState(answer);
      } catch (error) {
        console.warn('The message did not reach the desk.', error);
      }
    });
  };

  chat.addEventListener('aparte-send', onSend);
  void load();

  return {
    /** A new conversation, for a user who signs out. */
    forget() {
      listening?.abort();
      conversation = null;
      localStorage.removeItem(KEPT);
      viewport()?.setMessages([]);
      onState({ state: 'assistant', holder: null, visitor: null });
    },
    stop() {
      listening?.abort();
      chat.removeEventListener('aparte-send', onSend);
    },
  };
}
