import { fork } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';

/** The app the suite runs on: `tests/app` (Strapi of this repository's devDependencies), or one made by scripts/strapi-app.mjs. */
const APP_DIR = path.resolve(__dirname, '..', process.env.DESK_APP ?? 'tests/app');

/**
 * A real Strapi app with the plugin, on SQLite in a temporary folder, listening on a free port,
 * in a process of its own (`tests/boot.cjs`), run by DESK_NODE when it is set. What the tests
 * call is what a widget and the admin panel call: HTTP.
 */
export async function startStrapi({ assistant }: { assistant?: string } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'aparte-desk-'));
  const env: NodeJS.ProcessEnv = { ...process.env, DESK_APP_DIR: APP_DIR, DESK_TEST_DB: path.join(dir, 'test.db'), NODE_ENV: 'test' };
  if (assistant) env.DESK_TEST_AI = assistant;
  else delete env.DESK_TEST_AI;
  const child = fork(path.join(__dirname, 'boot.cjs'), [], { env, execPath: process.env.DESK_NODE || process.execPath, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  let output = '';
  child.stdout?.on('data', (chunk) => (output += chunk));
  child.stderr?.on('data', (chunk) => (output += chunk));

  const started = await new Promise<{ base: string; version: string }>((resolve, reject) => {
    child.once('message', (message: any) => (message.ready ? resolve(message) : reject(new Error(`${message.error}\n${output}`))));
    child.once('exit', (code) => reject(new Error(`Strapi stopped (${code}) before it was ready:\n${output}`)));
  });

  let next = 0;
  const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
  child.on('message', (message: any) => {
    const call = pending.get(message.id);
    if (!call) return;
    pending.delete(message.id);
    if (message.ok) call.resolve(message.value);
    else call.reject(new Error(message.error));
  });
  const ask = (type: string, args: Record<string, unknown> = {}) =>
    new Promise<any>((resolve, reject) => {
      const id = ++next;
      pending.set(id, { resolve, reject });
      child.send({ id, type, ...args });
    });

  return {
    base: started.base,
    version: started.version,
    ask,
    async stop() {
      if (child.connected) {
        const exited = new Promise((resolve) => child.once('exit', resolve));
        await ask('stop').catch(() => {});
        await exited;
      }
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

type App = Awaited<ReturnType<typeof startStrapi>>;

/**
 * An admin of the panel, signed in: a super admin unless a role is given, Strapi's author role,
 * or a role of its own allowed only these actions of the desk (`read`, `answer`…).
 */
export async function signIn(app: App, { email, firstname, role, can }: { email: string; firstname: string; role?: 'super' | 'author'; can?: string[] }) {
  const { password } = await app.ask('user', { email, firstname, role, actions: can?.map((action) => `plugin::aparte-desk.${action}`) });
  const response = await fetch(`${app.base}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = (await response.json()) as { data?: { token?: string; accessToken?: string } };
  const token = body.data?.token ?? body.data?.accessToken;
  if (!token) throw new Error(`Sign-in failed: ${JSON.stringify(body)}`);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const url = (rest: string) => `${app.base}/aparte-desk${rest}`;
  return {
    get: async (rest: string) => fetch(url(rest), { headers }),
    post: async (rest: string, data: unknown = {}) => fetch(url(rest), { method: 'POST', headers, body: JSON.stringify(data) }),
    put: async (rest: string, data: unknown = {}) => fetch(url(rest), { method: 'PUT', headers, body: JSON.stringify(data) }),
    del: async (rest: string) => fetch(url(rest), { method: 'DELETE', headers }),
  };
}

/** A visitor's widget: opens a conversation, then speaks with its token. */
export async function visitor(base: string, open: Record<string, unknown> = {}) {
  const response = await fetch(`${base}/api/aparte-desk/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(open),
  });
  const opened = (await response.json()) as { id: string; token: string; state: string };
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${opened.token}` };
  const url = (rest = '') => `${base}/api/aparte-desk/conversations/${opened.id}${rest}`;
  return {
    ...opened,
    status: response.status,
    write: async (text: string) => (await fetch(url('/messages'), { method: 'POST', headers, body: JSON.stringify({ text }) })).json() as Promise<any>,
    human: async () => (await fetch(url('/human'), { method: 'POST', headers })).json() as Promise<any>,
    read: async () => (await fetch(url(), { headers })).json() as Promise<any>,
    url,
  };
}

/**
 * A fake OpenAI-compatible API: it hands the conversation over when the visitor writes
 * "human", and otherwise answers "You said: …". It keeps what it was asked.
 */
export async function fakeModel() {
  const requests: any[] = [];
  const server = createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      const request = JSON.parse(body || '{}');
      requests.push(request);
      const last = [...(request.messages ?? [])].reverse().find((m: { role: string }) => m.role === 'user')?.content ?? '';
      const message = /human/i.test(last)
        ? { role: 'assistant', content: '', tool_calls: [{ id: 'c1', type: 'function', function: { name: 'ask_for_someone', arguments: JSON.stringify({ reason: 'a refund not received' }) } }] }
        : { role: 'assistant', content: `You said: ${last}` };
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ choices: [{ message }] }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`,
    requests,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
