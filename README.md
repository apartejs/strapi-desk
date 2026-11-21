<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/desk-strapi-dark.svg">
    <img src=".github/desk-strapi-light.svg" alt="aparté Desk for Strapi" width="96" height="96">
  </picture>
</p>

# aparté Desk for Strapi

> [!WARNING]
> **Work in progress.** aparté Desk is being designed and is **not published on npm yet**: the
> package name below does not install anything today, and the API may still change. Watch this
> repository for the first release.

Your team takes over the AI chat's conversations from the Strapi admin.

A visitor writes in the chat of your site. An assistant answers, through any OpenAI-compatible
API, and hands the conversation to the team when it cannot help, or when the visitor asks for a
person. In the admin, **aparté Desk** lists what waits: someone takes it over, the assistant goes
quiet, and the visitor reads the team's answers in the same chat. Then the team hands it back to
the assistant, or closes it.

- **To take**, **Mine**, **Waiting** and **All**, with a search through everything said.
- Take over, assign to a colleague, hand back, close.
- Internal notes the visitor and the assistant never read.
- Saved replies, inserted with `/` in the composer.
- "Read by …" under the visitor's messages, and "… is writing" both ways.
- The count of what waits in the tab's title, and a system notification when one arrives.
- Without an assistant, it is a chat with the team only: every conversation goes to the desk.

It works with any chat widget: the plugin is a small HTTP API, described below.

Strapi 4 and Strapi 5, one package for both: tested on the first and the last release of each,
4.0, 4.26, 5.0 and the latest 5, each on the Node it runs on (Strapi 4.0 runs on Node 16).

## Install

Once it is published:

```sh
npm install @aparte/strapi-desk
```

Until then, build it from this repository (`npm install && npm run build`) and point your app at
the folder with `resolve: '/path/to/strapi-desk'` in the plugin's entry below.

```js
// config/plugins.js (config/plugins.ts in a TypeScript app)
module.exports = ({ env }) => ({
  'aparte-desk': {
    enabled: true,
    config: {
      assistant: {
        baseUrl: 'https://api.openai.com/v1',
        apiKey: env('OPENAI_API_KEY'),
        model: 'gpt-4.1-mini',
        instructions: 'You answer the questions of the visitors of our shop, briefly, in their language.',
      },
    },
  },
});
```

Then `npm run build` and restart. **aparté Desk** appears in the admin's menu for super admins.

## Who may do what

The desk has five permissions, under **Plugins › aparté Desk** in a role of
*Settings › Administration panel › Roles*. The server checks them on every request, and the desk
shows only the buttons a role may use.

| Permission | What it allows |
|---|---|
| See the conversations | The desk in the menu, the conversations, the visitor and the team's notes. |
| Take over and answer | Take a conversation over, answer the visitor, write a note, hand it back to the assistant. |
| Assign to a colleague | Give a conversation to someone of the team. |
| Close | Close a conversation. |
| Manage the saved replies | Write, change and delete the saved replies (every role that sees the desk may use them). |

A conversation can be assigned only to someone who may take conversations over and answer.
Super admins may do everything.

## Options

| Option | Default | What it does |
|---|---|---|
| `assistant` | `null` | The assistant, or `null` for a chat with the team only. |
| `assistant.baseUrl` | | An OpenAI-compatible API: OpenAI, OpenRouter, Mistral, Ollama, llama.cpp… |
| `assistant.apiKey` | | Sent as `Authorization: Bearer …`. Keep it in an environment variable. |
| `assistant.model` | | The model's name. |
| `assistant.instructions` | a short default | The system prompt: who the assistant is, what it may say. |
| `assistant.handOffWhen` | a refund, a complaint, an account | When to hand a conversation to the team, in your words. |
| `assistant.historyLimit` | `40` | How many of the last messages the model reads. |
| `assistant.timeoutMs` | `60000` | How long a reply may take. |
| `notices` | English | What the visitor reads: `wanted`, `joined`, `back`, `closed`, `read`. `{name}` is the team member's name. |
| `maxMessageLength` | `4000` | The longest message a visitor may send. |
| `allowedOrigins` | `null` | The origins allowed to call the chat API (`['https://shop.example.com']`). `null` leaves it to Strapi's CORS settings. |

The assistant has one tool, `ask_for_someone`, which hands the conversation to the team with a
reason the desk shows ("a refund not received"). It reads the visitor's messages, its own, and
the team's, as "Marie: …"; it never reads the team's notes.

## The chat API

Everything is under `/api/aparte-desk`, with no Strapi token: a conversation is reached with the
token its opening gave, in the `X-Desk-Token` header. The token is given once; keep it where the
widget keeps its conversation (for example `localStorage`). A wrong token answers 404, as if the
conversation did not exist.

| Request | Answer |
|---|---|
| `POST /conversations` `{ visitor?: { name, email }, context?: {…} }` | `201 { id, token, state, holder, assistant }` |
| `GET /conversations/:id` (`?after=<message id>`) | `{ state, holder, messages }` |
| `POST /conversations/:id/messages` `{ text, id? }` | `{ message, reply, notice, state, holder }` |
| `POST /conversations/:id/human` | `{ notice, state, holder }` |
| `POST /conversations/:id/typing` | `204` |
| `GET /conversations/:id/events?token=…` | server-sent events |

- `state` is `assistant`, `wanted` (waiting for the team), `held` (someone of the team answers) or
  `closed`. A message written in a closed conversation opens it again.
- `holder` is `{ name }` while someone holds the conversation, else `null`.
- `reply` is the assistant's answer, when it answered. `notice` is an event to show in the chat:
  "Someone of the team will answer you here…", "Marie joined the conversation"…
- A message is `{ id, from, text, event?, author?, createdAt, readBy? }`, where `from` is
  `visitor`, `assistant`, `team` or `event`.
- `context` is shown to the team beside the conversation: the page, the plan, an order number.
  Flat values, at most 4 000 characters of JSON.

The events stream sends `ready` first, then `message`, `state`, `typing` and `read` as the team
acts. `EventSource` cannot send a header, hence the token in the query.

```js
const api = 'https://cms.example.com/api/aparte-desk';

const { id, token } = await (await fetch(`${api}/conversations`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ visitor: { name: 'Léa' }, context: { page: location.pathname } }),
})).json();

const write = async (text) =>
  (await fetch(`${api}/conversations/${id}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Desk-Token': token },
    body: JSON.stringify({ text }),
  })).json();

const events = new EventSource(`${api}/conversations/${id}/events?token=${token}`);
events.addEventListener('message', (event) => show(JSON.parse(event.data).message));
events.addEventListener('state', (event) => showState(JSON.parse(event.data).state));

const { reply, notice } = await write('Where is my order?');
```

## Limits

- The events stream and "is writing" live in the memory of the Strapi process. With several
  instances behind a load balancer, a visitor connected to one does not hear what is done on
  another, until the widget reads the conversation again (`GET /conversations/:id?after=…`).
- The desk reads its list every five seconds.
- The assistant answers in one request, without streaming.

## Develop

```sh
pnpm install
pnpm build
pnpm test        # boots a real Strapi on SQLite, with a fake OpenAI-compatible API
```

The tests load the plugin's `dist`: build before testing. They run on the Strapi of this
repository's dev dependencies; to run them on another version, make an app of that version with
the plugin installed from its package, as a user installs it:

```sh
DESK_NODE=/path/to/node16/bin/node node scripts/strapi-app.mjs 4.0.0
DESK_APP=.apps/strapi-4.0.0 DESK_NODE=/path/to/node16/bin/node pnpm test
```

`DESK_NODE` is the Node that runs that Strapi (the tests themselves need Node 20 or later). The
CI runs the suite this way on 4.0.0, 4.26.2, 5.0.0 and the latest Strapi 5.

## Licence

MIT
