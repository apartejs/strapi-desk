import { mkdtempSync, rmSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import path from 'node:path';

/**
 * A real Strapi 5 app with the plugin, on SQLite in a temporary folder, listening on a free
 * port. What the tests call is what a widget and the admin panel call: HTTP.
 */
export async function startStrapi({ assistant }: { assistant?: string } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'aparte-desk-'));
  process.env.DESK_TEST_DB = path.join(dir, 'test.db');
  if (assistant) process.env.DESK_TEST_AI = assistant;
  else delete process.env.DESK_TEST_AI;

  // Strapi's CommonJS build, as an app runs it: its ESM one imports lodash by names Node refuses.
  const { createStrapi } = createRequire(__filename)('@strapi/strapi');
  const appDir = path.join(__dirname, 'app');
  const strapi = await createStrapi({ appDir, distDir: appDir, autoReload: false, serveAdminPanel: false }).load();
  await strapi.server.mount();
  const server = strapi.server.httpServer as Server;
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  return {
    strapi,
    base,
    async stop() {
      await strapi.destroy();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

/** An admin of the panel, signed in: a super admin unless a role is given. */
export async function signIn(strapi: any, base: string, { email, firstname, role }: { email: string; firstname: string; role?: 'super' | 'author' }) {
  const roleService = strapi.service('admin::role');
  const roles = await strapi.db.query('admin::role').findMany();
  const code = role === 'author' ? 'strapi-author' : 'strapi-super-admin';
  let found = roles.find((r: { code: string }) => r.code === code);
  if (!found) {
    await roleService.createRolesIfNoneExist?.();
    found = (await strapi.db.query('admin::role').findMany()).find((r: { code: string }) => r.code === code);
  }
  const password = 'Password123!';
  await strapi.service('admin::user').create({ email, firstname, lastname: 'Test', password, isActive: true, roles: [found.id] });
  const response = await fetch(`${base}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = (await response.json()) as { data?: { token: string } };
  if (!body.data?.token) throw new Error(`Sign-in failed: ${JSON.stringify(body)}`);
  const headers = { Authorization: `Bearer ${body.data.token}`, 'Content-Type': 'application/json' };
  return {
    get: async (url: string) => fetch(`${base}/aparte-desk${url}`, { headers }),
    post: async (url: string, data: unknown = {}) => fetch(`${base}/aparte-desk${url}`, { method: 'POST', headers, body: JSON.stringify(data) }),
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
  const headers = { 'Content-Type': 'application/json', 'X-Desk-Token': opened.token };
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
