import { useCallback, useEffect, useRef, useState } from 'react';
import { http } from './kit/http';

export type State = 'assistant' | 'wanted' | 'held' | 'closed';
export type Tab = 'wanted' | 'mine' | 'waiting' | 'all';

export interface Row {
  id: string;
  title: string | null;
  visitor: { name: string | null; email: string | null };
  state: State;
  holder: { id: number; name: string } | null;
  wanted: { reason: string | null; source: 'tool' | 'visitor' | 'message' | null; at: string | null } | null;
  lastMessage: string | null;
  lastFrom: 'visitor' | 'assistant' | 'team' | null;
  lastMessageAt: string | null;
  waiting: boolean;
  createdAt: string;
}

export interface Message {
  id: string;
  from: 'visitor' | 'assistant' | 'team' | 'event';
  text: string;
  event: string | null;
  meta: Record<string, string> | null;
  author: { id: number | null; name: string } | null;
  readBy: string | null;
  createdAt: string;
}

export interface Note {
  id: number;
  text: string;
  author: { id: number | null; name: string };
  createdAt: string;
}

export interface Detail {
  conversation: Row & { context: Record<string, unknown> | null };
  messages: Message[];
  notes: Note[];
  visitor: {
    name: string | null;
    email: string | null;
    userId: number | null;
    typing: boolean;
    conversations: { id: string; title: string | null; state: State; lastMessageAt: string | null }[];
  };
}

export interface SavedReply {
  id: number;
  title: string;
  text: string;
}

export const BASE = '/aparte-desk';

/** What the signed-in member may do here, as their role allows. */
export interface Me {
  id: number;
  name: string;
  assistant: boolean;
  can: { read: boolean; answer: boolean; assign: boolean; close: boolean; savedReplies: boolean };
}

/** How often the list and the open conversation look for news. */
export const POLL_MS = 5000;

/**
 * Asks the desk's API every few seconds while the page is open: no websocket, no extra server.
 * `key` changes what is asked; `null` asks nothing.
 */
export function usePolled<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const current = useRef(path);
  current.current = path;

  const load = useCallback(async () => {
    const asked = current.current;
    if (!asked) return;
    try {
      const { data: answer } = await http.get<T>(`${BASE}${asked}`);
      // An answer to a question no longer asked (another conversation opened meanwhile) is dropped.
      if (current.current === asked) {
        setData(answer);
        setError(null);
      }
    } catch (failure) {
      if (current.current === asked) setError(failure);
    }
  }, []);

  useEffect(() => {
    setData(null);
    if (!path) return;
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [path, load]);

  return { data, setData, error, reload: load };
}
