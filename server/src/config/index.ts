/**
 * The plugin's options, in the app's `config/plugins.ts`:
 *
 * ```ts
 * 'aparte-desk': {
 *   config: {
 *     assistant: {
 *       baseUrl: 'https://api.openai.com/v1',
 *       apiKey: env('OPENAI_API_KEY'),
 *       model: 'gpt-4.1-mini',
 *       instructions: 'You answer the questions of the visitors of our shop.',
 *     },
 *   },
 * },
 * ```
 *
 * Without `assistant`, it is a chat with the team only: every conversation goes to the desk.
 */
export interface AssistantConfig {
  /** An OpenAI-compatible API: OpenAI, OpenRouter, Mistral, a local llama.cpp or Ollama. */
  baseUrl: string;
  apiKey?: string;
  model: string;
  /** The system prompt: who the assistant is, what it may say. */
  instructions?: string;
  /** When to hand a conversation to the team, in your words. */
  handOffWhen?: string;
  /** How many of the last messages the model reads. */
  historyLimit?: number;
  /** How long a reply may take, in milliseconds. */
  timeoutMs?: number;
}

export interface DeskConfig {
  assistant: AssistantConfig | null;
  /** What the visitor reads. `{name}` is the team member's name. */
  notices: {
    wanted: string;
    joined: string;
    back: string;
    closed: string;
    read: string;
  };
  /** The longest message a visitor may send, in characters. */
  maxMessageLength: number;
  /**
   * The origins whose pages may call the chat API (`https://shop.example.com`). A request from
   * any other `Origin` is refused. `null` leaves it to Strapi's CORS settings.
   */
  allowedOrigins: string[] | null;
}

export const defaults: DeskConfig = {
  assistant: null,
  notices: {
    wanted: 'Someone of the team will answer you here, usually within a few minutes.',
    joined: '{name} joined the conversation',
    back: 'The assistant is back',
    closed: 'This conversation is closed. You can write here again at any time.',
    read: 'Read by {name}',
  },
  maxMessageLength: 4000,
  allowedOrigins: null,
};

export default {
  default: defaults,
  validator(config: Partial<DeskConfig>) {
    const assistant = config.assistant;
    if (assistant != null) {
      if (typeof assistant !== 'object') throw new Error('aparte-desk: `assistant` must be an object or null.');
      if (typeof assistant.baseUrl !== 'string' || !/^https?:\/\//.test(assistant.baseUrl)) {
        throw new Error('aparte-desk: `assistant.baseUrl` must be the http(s) address of an OpenAI-compatible API.');
      }
      if (typeof assistant.model !== 'string' || assistant.model === '') {
        throw new Error('aparte-desk: `assistant.model` must name a model.');
      }
    }
    if (config.maxMessageLength !== undefined && !(Number.isInteger(config.maxMessageLength) && config.maxMessageLength > 0)) {
      throw new Error('aparte-desk: `maxMessageLength` must be a positive integer.');
    }
    if (config.allowedOrigins != null && !Array.isArray(config.allowedOrigins)) {
      throw new Error('aparte-desk: `allowedOrigins` must be a list of origins, or null.');
    }
  },
};
