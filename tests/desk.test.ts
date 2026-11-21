import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fakeModel, signIn, siteUser, startStrapi, visitor } from './helpers';

type App = Awaited<ReturnType<typeof startStrapi>>;

describe('with an assistant', () => {
  let app: App;
  let model: Awaited<ReturnType<typeof fakeModel>>;
  let marie: Awaited<ReturnType<typeof signIn>>;
  let jean: Awaited<ReturnType<typeof signIn>>;

  beforeAll(async () => {
    model = await fakeModel();
    app = await startStrapi({ assistant: model.url });
    marie = await signIn(app, { email: 'marie@example.com', firstname: 'Marie' });
    jean = await signIn(app, { email: 'jean@example.com', firstname: 'Jean' });
  });

  afterAll(async () => {
    await app?.stop();
    await model?.close();
  });

  it('opens a conversation and gives its token once', async () => {
    const chat = await visitor(app.base, { visitor: { name: 'Léa', email: 'lea@example.com' } });
    expect(chat.status).toBe(201);
    expect(chat.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(chat.state).toBe('assistant');
  });

  it('refuses a conversation without its token, as if it did not exist', async () => {
    const chat = await visitor(app.base);
    const wrong = await fetch(chat.url(), { headers: { 'X-Desk-Token': 'nope' } });
    const query = await fetch(`${chat.url()}?token=${chat.token}`);
    const none = await fetch(chat.url());
    expect(wrong.status).toBe(404);
    expect(query.status).toBe(404);
    expect(none.status).toBe(404);
  });

  it('lets a page of another site send X-Desk-Token, once CORS allows it as the README says', async () => {
    const chat = await visitor(app.base);
    const preflight = await fetch(chat.url('/messages'), {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://shop.example.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'x-desk-token,authorization,content-type',
      },
    });
    const allowed = (preflight.headers.get('access-control-allow-headers') ?? '').toLowerCase().split(/\s*,\s*/);
    expect(allowed).toEqual(expect.arrayContaining(['x-desk-token', 'authorization', 'content-type']));
  });

  it("ties a signed-in user's conversation to their account, whatever the widget says", async () => {
    const lea = await siteUser(app, { username: 'lea', email: 'lea@shop.example.com' });
    const chat = await visitor(app.base, { visitor: { name: 'Someone else', email: 'else@example.com' } }, { jwt: lea.jwt });
    expect(chat.status).toBe(201);
    await chat.write('Where is my order?');
    const shown = await (await marie.get(`/conversations/${chat.id}`)).json();
    expect(shown.visitor).toMatchObject({ name: 'lea', email: 'lea@shop.example.com', userId: lea.id });
    // Signed in from the start: nothing changed hands, nothing to say.
    expect(shown.messages.some((m: { event: string | null }) => m.event === 'signed-in')).toBe(false);
  });

  it('lets a signed-in user reach their conversation by their account, and no one else', async () => {
    const paul = await siteUser(app, { username: 'paul', email: 'paul@shop.example.com' });
    const other = await siteUser(app, { username: 'other', email: 'other@shop.example.com' });
    const chat = await visitor(app.base, {}, { jwt: paul.jwt });
    expect((await fetch(chat.url(), { headers: { Authorization: `Bearer ${paul.jwt}` } })).status).toBe(200);
    expect((await fetch(chat.url(), { headers: { Authorization: `Bearer ${other.jwt}` } })).status).toBe(404);
  });

  it('gives a guest\'s conversation to the user who signs in while it goes on', async () => {
    const guest = await visitor(app.base);
    await guest.write('I cannot find my order');
    expect((await (await marie.get(`/conversations/${guest.id}`)).json()).visitor).toMatchObject({ name: null, userId: null });
    const zoe = await siteUser(app, { username: 'zoe', email: 'zoe@shop.example.com' });
    const signedIn = { ...guest.headers, Authorization: `Bearer ${zoe.jwt}` };
    const written = await fetch(guest.url('/messages'), { method: 'POST', headers: signedIn, body: JSON.stringify({ text: 'Now I am signed in' }) });
    expect(written.status).toBe(200);
    expect((await (await marie.get(`/conversations/${guest.id}`)).json()).visitor).toMatchObject({ name: 'zoe', email: 'zoe@shop.example.com', userId: zoe.id });
    // Theirs from now on: the account alone reaches it, and another account signing in takes it from no one.
    const seen = await fetch(guest.url(), { headers: { Authorization: `Bearer ${zoe.jwt}` } });
    expect(seen.status).toBe(200);
    const shown = await seen.json();
    expect(shown.visitor).toEqual({ name: 'zoe', signedIn: true });
    // Said to the team, once, where it happened; never to the visitor.
    expect(shown.messages.some((m: { event?: string }) => m.event === 'signed-in')).toBe(false);
    const desk = (await (await marie.get(`/conversations/${guest.id}`)).json()).messages;
    expect(desk.filter((m: { event: string | null }) => m.event === 'signed-in')).toEqual([expect.objectContaining({ from: 'event', meta: { name: 'zoe' } })]);
    const events = desk.map((m: { event: string | null; text: string }) => m.event ?? m.text);
    expect(events.indexOf('signed-in')).toBe(events.indexOf('Now I am signed in') - 1);
    const other = await siteUser(app, { username: 'other2', email: 'other2@shop.example.com' });
    await fetch(guest.url(), { headers: { ...guest.headers, Authorization: `Bearer ${other.jwt}` } });
    expect((await (await marie.get(`/conversations/${guest.id}`)).json()).visitor).toMatchObject({ userId: zoe.id });
  });

  it('refuses a JWT that is not valid, and a blocked user, as Strapi does', async () => {
    const blocked = await siteUser(app, { username: 'blocked', email: 'blocked@shop.example.com', blocked: true });
    const open = (authorization: string) =>
      fetch(`${app.base}/api/aparte-desk/conversations`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: authorization }, body: '{}' });
    expect((await open('Bearer not-a-jwt')).status).toBe(401);
    expect((await open(`Bearer ${blocked.jwt}`)).status).toBe(401);
  });

  it('lets the assistant answer, and keeps both messages', async () => {
    const chat = await visitor(app.base);
    const answer = await chat.write('Where is my order?');
    expect(answer.message).toMatchObject({ from: 'visitor', text: 'Where is my order?' });
    expect(answer.reply).toMatchObject({ from: 'assistant', text: 'You said: Where is my order?' });
    expect((await chat.read()).messages.map((m: { from: string }) => m.from)).toEqual(['visitor', 'assistant']);
  });

  it('hears the assistant hand over: the conversation waits under To take, with its reason', async () => {
    const chat = await visitor(app.base);
    const answer = await chat.write('I want a human');
    expect(answer.state).toBe('wanted');
    expect(answer.notice).toMatchObject({ from: 'event', event: 'wanted', text: 'Someone of the team will answer you here, usually within a few minutes.' });
    const queue = await (await marie.get('/conversations?tab=wanted')).json();
    const row = queue.results.find((r: { id: string }) => r.id === chat.id);
    expect(row.wanted).toMatchObject({ reason: 'a refund not received', source: 'tool' });
  });

  it('hands over when the visitor asks, without the model, once', async () => {
    const chat = await visitor(app.base);
    const asked = model.requests.length;
    const first = await chat.human();
    const second = await chat.human();
    expect(first.state).toBe('wanted');
    expect(first.notice.event).toBe('wanted');
    expect(second.notice).toBeNull();
    expect(model.requests.length).toBe(asked);
  });

  it('takes over: the assistant goes quiet, the visitor reads who joined, and the team answers', async () => {
    const chat = await visitor(app.base);
    await chat.human();
    await marie.post(`/conversations/${chat.id}/take`);
    const asked = model.requests.length;
    const quiet = await chat.write('Are you there?');
    expect(quiet.reply).toBeNull();
    expect(quiet.holder).toEqual({ name: 'Marie Test' });
    expect(model.requests.length).toBe(asked);

    const replied = await marie.post(`/conversations/${chat.id}/messages`, { text: 'Yes, I am here.' });
    expect(replied.status).toBe(200);
    const shown = (await chat.read()).messages;
    expect(shown.map((m: { text: string }) => m.text)).toContain('Marie Test joined the conversation');
    expect(shown.at(-1)).toMatchObject({ from: 'team', text: 'Yes, I am here.', author: { name: 'Marie Test' } });
  });

  it('refuses a reply from someone who does not hold the conversation', async () => {
    const chat = await visitor(app.base);
    await chat.human();
    expect((await jean.post(`/conversations/${chat.id}/messages`, { text: 'Hi' })).status).toBe(409);
    await marie.post(`/conversations/${chat.id}/take`);
    expect((await jean.post(`/conversations/${chat.id}/messages`, { text: 'Hi' })).status).toBe(409);
  });

  it("keeps the team's notes from the visitor and from the assistant", async () => {
    const chat = await visitor(app.base);
    await chat.human();
    await marie.post(`/conversations/${chat.id}/notes`, { text: 'SECRET-NOTE refund #123' });
    await marie.post(`/conversations/${chat.id}/hand-back`);
    await chat.write('Thanks');
    expect(JSON.stringify(await chat.read())).not.toContain('SECRET-NOTE');
    expect(JSON.stringify(model.requests.at(-1))).not.toContain('SECRET-NOTE');
    const detail = await (await marie.get(`/conversations/${chat.id}`)).json();
    expect(detail.notes[0]).toMatchObject({ text: 'SECRET-NOTE refund #123', author: { name: 'Marie Test' } });
  });

  it('hands back: the assistant answers again, having read what the team wrote', async () => {
    const chat = await visitor(app.base);
    await chat.human();
    await marie.post(`/conversations/${chat.id}/take`);
    await marie.post(`/conversations/${chat.id}/messages`, { text: 'Your parcel left today.' });
    await marie.post(`/conversations/${chat.id}/hand-back`);
    const answer = await chat.write('And when does it arrive?');
    expect(answer.reply?.from).toBe('assistant');
    const history = model.requests.at(-1).messages;
    expect(history).toContainEqual({ role: 'assistant', content: 'Marie Test: Your parcel left today.' });
  });

  it('marks the visitor messages read when the holder opens the conversation', async () => {
    const chat = await visitor(app.base);
    await chat.human();
    await marie.post(`/conversations/${chat.id}/take`);
    await chat.write('Hello?');
    await marie.get(`/conversations/${chat.id}`);
    const mine = (await chat.read()).messages.filter((m: { from: string }) => m.from === 'visitor');
    expect(mine.at(-1).readBy).toBe('Read by Marie Test');
  });

  it('assigns to a colleague, who then holds it', async () => {
    const chat = await visitor(app.base);
    await chat.human();
    const team = (await (await marie.get('/team')).json()).results;
    const jeanId = team.find((member: { name: string }) => member.name === 'Jean Test').id;
    await marie.post(`/conversations/${chat.id}/assign`, { userId: jeanId });
    const mine = await (await jean.get('/conversations?tab=mine')).json();
    expect(mine.results.map((r: { id: string }) => r.id)).toContain(chat.id);
    expect((await chat.read()).holder).toEqual({ name: 'Jean Test' });
  });

  it('closes, and a new message opens it again for the assistant', async () => {
    const chat = await visitor(app.base);
    await chat.human();
    await marie.post(`/conversations/${chat.id}/take`);
    await marie.post(`/conversations/${chat.id}/close`);
    expect((await chat.read()).state).toBe('closed');
    const answer = await chat.write('One more thing');
    expect(answer.state).toBe('assistant');
    expect(answer.reply?.from).toBe('assistant');
  });

  it('counts what waits for someone, and what waits for me', async () => {
    const before = await (await jean.get('/counts')).json();
    const chat = await visitor(app.base);
    await chat.human();
    const waiting = await (await jean.get('/counts')).json();
    expect(waiting.wanted).toBe(before.wanted + 1);
    await jean.post(`/conversations/${chat.id}/take`);
    await chat.write('Still there?');
    const held = await (await jean.get('/counts')).json();
    expect(held.wanted).toBe(before.wanted);
    expect(held.mine).toBe(before.mine + 1);
  });

  it('finds a conversation by anything said in it', async () => {
    const chat = await visitor(app.base);
    await chat.write('My zebra-coloured umbrella broke');
    const found = await (await marie.get('/conversations?q=zebra')).json();
    expect(found.results.map((r: { id: string }) => r.id)).toEqual([chat.id]);
  });

  it('tells the visitor what the team does, as it happens', async () => {
    const chat = await visitor(app.base);
    await chat.human();
    const controller = new AbortController();
    const response = await fetch(chat.url('/events'), { headers: chat.headers, signal: controller.signal });
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let seen = '';
    const until = async (needle: string) => {
      while (!seen.includes(needle)) seen += decoder.decode((await reader.read()).value);
    };
    await until('event: ready');
    await marie.post(`/conversations/${chat.id}/take`);
    await marie.post(`/conversations/${chat.id}/messages`, { text: 'Live answer' });
    await until('Live answer');
    controller.abort();
    expect(seen).toContain('"state":"held"');
    expect(seen).toContain('Marie Test joined the conversation');
  });

  it('keeps the desk to whoever may use it', async () => {
    const author = await signIn(app, { email: 'author@example.com', firstname: 'Ann', role: 'author' });
    expect((await author.get('/conversations')).status).toBe(403);
    const anonymous = await fetch(`${app.base}/aparte-desk/conversations`);
    expect(anonymous.status).toBe(401);
  });
});

describe('with the team only', () => {
  let app: App;
  let marie: Awaited<ReturnType<typeof signIn>>;

  beforeAll(async () => {
    app = await startStrapi();
    marie = await signIn(app, { email: 'marie@example.com', firstname: 'Marie' });
  });

  afterAll(async () => {
    await app?.stop();
  });

  it("puts the visitor's first message in To take, as the reason", async () => {
    const chat = await visitor(app.base);
    const answer = await chat.write('Do you ship to Belgium?');
    expect(answer.reply).toBeNull();
    expect(answer.state).toBe('wanted');
    expect(answer.notice.event).toBe('wanted');
    const queue = await (await marie.get('/conversations?tab=wanted')).json();
    expect(queue.results[0]).toMatchObject({ id: chat.id, wanted: { reason: 'Do you ship to Belgium?', source: 'message' } });
  });

  it('offers no hand back, since there is no assistant', async () => {
    const chat = await visitor(app.base);
    await chat.write('Hello');
    await marie.post(`/conversations/${chat.id}/take`);
    expect((await marie.post(`/conversations/${chat.id}/hand-back`)).status).toBe(409);
    expect(await (await marie.get('/settings')).json()).toEqual({ assistant: false });
  });
});

describe('the rights of each role', () => {
  let app: App;
  let reader: Awaited<ReturnType<typeof signIn>>;
  let agent: Awaited<ReturnType<typeof signIn>>;
  let lead: Awaited<ReturnType<typeof signIn>>;

  beforeAll(async () => {
    app = await startStrapi();
    lead = await signIn(app, { email: 'lead@example.com', firstname: 'Lea' });
    reader = await signIn(app, { email: 'reader@example.com', firstname: 'Rita', can: ['read'] });
    agent = await signIn(app, { email: 'agent@example.com', firstname: 'Alex', can: ['read', 'answer'] });
  });

  afterAll(async () => {
    await app?.stop();
  });

  it('tells the panel what each one may do', async () => {
    expect(await (await reader.get('/me')).json()).toMatchObject({ can: { read: true, answer: false, assign: false, close: false, savedReplies: false } });
    expect(await (await agent.get('/me')).json()).toMatchObject({ can: { read: true, answer: true, assign: false, close: false, savedReplies: false } });
    expect(await (await lead.get('/me')).json()).toMatchObject({ can: { read: true, answer: true, assign: true, close: true, savedReplies: true } });
  });

  it('lets a reader read, and nothing more', async () => {
    const chat = await visitor(app.base);
    await chat.write('Where is my order?');
    expect((await reader.get(`/conversations/${chat.id}`)).status).toBe(200);
    expect((await reader.post(`/conversations/${chat.id}/take`)).status).toBe(403);
    expect((await reader.post(`/conversations/${chat.id}/notes`, { text: 'hm' })).status).toBe(403);
    expect((await reader.post(`/conversations/${chat.id}/close`)).status).toBe(403);
    expect((await reader.post('/saved-replies', { title: 'hi', text: 'Hello!' })).status).toBe(403);
    expect((await reader.get('/saved-replies')).status).toBe(200);
  });

  it('lets an agent take over and answer, but not assign nor close', async () => {
    const chat = await visitor(app.base);
    await chat.write('I need help');
    expect((await agent.post(`/conversations/${chat.id}/take`)).status).toBe(200);
    expect((await agent.post(`/conversations/${chat.id}/messages`, { text: 'Here I am.' })).status).toBe(200);
    expect((await agent.get('/team')).status).toBe(403);
    expect((await agent.post(`/conversations/${chat.id}/close`)).status).toBe(403);
  });

  it('assigns only to someone who may answer', async () => {
    const team = (await (await lead.get('/team')).json()).results as { name: string }[];
    expect(team.map((member) => member.name).sort()).toEqual(['Alex Test', 'Lea Test']);
  });
});
