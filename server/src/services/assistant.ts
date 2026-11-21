import type { Core } from '@strapi/strapi';
import { deskConfig, type AssistantConfig, type DeskConfig } from '../config';
import { MESSAGE, type Conversation, type Message } from './desk';
import { postJson } from './post-json';

/** The tool the model calls to hand the conversation to the team. Its name is the model's protocol: English. */
export const HAND_OFF_TOOL = 'ask_for_someone';

const DEFAULT_HAND_OFF =
  'Use it when the user asks to talk to a person, or when you cannot help them: a refund, a complaint, an account you cannot reach.';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface Completion {
  choices?: {
    message?: {
      content?: string | null;
      tool_calls?: { function?: { name?: string; arguments?: string } }[];
    };
  }[];
}

/**
 * What the model reads: the visitor as the user, the assistant as itself, and the team's
 * messages as the assistant's side with the team member's name in front ("Marie: …"), so it
 * answers knowing what was said. Events and the team's notes are never read.
 */
export const historyOf = (rows: Pick<Message, 'from' | 'text' | 'authorName'>[]): ChatMessage[] =>
  rows
    .filter((row) => row.from !== 'event' && row.text)
    .map((row) =>
      row.from === 'visitor'
        ? { role: 'user' as const, content: row.text as string }
        : { role: 'assistant' as const, content: row.from === 'team' ? `${row.authorName || 'Team'}: ${row.text}` : (row.text as string) }
    );

const reasonOf = (raw: string | undefined): string => {
  try {
    const parsed = JSON.parse(raw ?? '{}');
    return typeof parsed?.reason === 'string' ? parsed.reason : '';
  } catch {
    return '';
  }
};

/**
 * The assistant answers a visitor through an OpenAI-compatible API, with one tool: handing the
 * conversation to the team. One request, no stream: the reply reaches the chat as a message.
 */
const assistant = ({ strapi }: { strapi: Core.Strapi }) => {
  const settings = (): AssistantConfig | null => deskConfig(strapi).assistant;
  const desk = () => strapi.plugin('aparte-desk').service('desk');

  return {
    async complete(options: AssistantConfig, history: ChatMessage[]): Promise<{ text: string; handOff: string | null }> {
      const system = [
        options.instructions || 'You are the assistant of this website. Answer the visitor briefly, in their language.',
        `You can hand the conversation to a person of the team with the ${HAND_OFF_TOOL} tool. ${options.handOffWhen || DEFAULT_HAND_OFF}`,
      ].join('\n\n');
      const response = await postJson(
        `${options.baseUrl.replace(/\/+$/, '')}/chat/completions`,
        { 'Content-Type': 'application/json', ...(options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {}) },
        {
          model: options.model,
          messages: [{ role: 'system', content: system }, ...history],
          tools: [
            {
              type: 'function',
              function: {
                name: HAND_OFF_TOOL,
                description: 'Hand the conversation to a person of the team, who will answer the user here.',
                parameters: {
                  type: 'object',
                  properties: { reason: { type: 'string', description: 'Why, in a few words, for the team: "a refund not received".' } },
                  required: ['reason'],
                },
              },
            },
          ],
        },
        options.timeoutMs ?? 60_000
      );
      if (!response.ok) throw new Error(`The assistant's API answered ${response.status}: ${response.text.slice(0, 300)}`);
      const completion = JSON.parse(response.text) as Completion;
      const message = completion.choices?.[0]?.message;
      const call = message?.tool_calls?.find((tool) => tool.function?.name === HAND_OFF_TOOL);
      return { text: (message?.content ?? '').trim(), handOff: call ? reasonOf(call.function?.arguments) || 'The assistant asked for someone of the team' : null };
    },

    /**
     * The assistant's turn in a conversation: its reply, or the conversation handed to the team.
     * A failure of the API is logged and the visitor gets nothing from the assistant: what they
     * wrote stays, for the desk to read.
     */
    async answer(conversation: Conversation) {
      const options = settings();
      if (!options) return { reply: null, notice: null, conversation };
      const rows: Message[] = await strapi.db.query(MESSAGE).findMany({
        where: { conversation: conversation.id },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        limit: options.historyLimit ?? 40,
        select: ['from', 'text', 'authorName', 'createdAt'],
      });
      let result: { text: string; handOff: string | null };
      try {
        result = await this.complete(options, historyOf(rows.reverse()));
      } catch (error) {
        strapi.log.error(`[aparte-desk] The assistant did not answer: ${(error as Error).message}`);
        return { reply: null, notice: null, conversation, failed: true };
      }
      // The desk may have taken it over while the model was writing: then the assistant keeps quiet.
      const current: Conversation | null = await desk().load(conversation.uid);
      if (!current || current.state !== 'assistant') return { reply: null, notice: null, conversation: current ?? conversation };
      const reply: Message | null = result.text ? await desk().assistantWrites(current, result.text) : null;
      if (result.handOff !== null) {
        const handed = await desk().want(current, result.handOff, 'tool');
        return { reply, notice: handed.notice, conversation: handed.conversation };
      }
      return { reply, notice: null, conversation: current };
    },
  };
};

export default assistant;
