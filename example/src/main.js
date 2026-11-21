import '@aparte/core/styles.css';
import { AparteClient } from '@aparte/core';
import { connectDesk } from './desk-chat.js';

/** Where Strapi runs: `VITE_STRAPI_URL=http://localhost:1338 npm run dev` for another address. */
const STRAPI = (import.meta.env.VITE_STRAPI_URL ?? 'http://localhost:1337').replace(/\/+$/, '');
const SESSION = 'example-shop:session';

let session = JSON.parse(localStorage.getItem(SESSION) ?? 'null');

const launcher = document.querySelector('aparte-launcher');
const chat = document.querySelector('aparte-chat');
const form = document.querySelector('#sign-in');
const error = document.querySelector('#error');

// The chat's client shows what the visitor writes; the desk answers, not a model of the page.
new AparteClient().start();

const desk = connectDesk(chat, {
  api: `${STRAPI}/api/aparte-desk`,
  jwt: () => session?.jwt ?? null,
  // Who the desk sees in this conversation: the proof that it went from guest to the account.
  onState: ({ visitor }) => {
    launcher.setAttribute('subheading', visitor?.signedIn ? `Signed in as ${visitor.name}` : 'You are a guest');
  },
});

const showSession = () => {
  document.querySelector('#who').textContent = session ? session.user.username : 'Guest';
  document.querySelector('#name').textContent = session?.user.username ?? '';
  form.hidden = Boolean(session);
  document.querySelector('#signed-in').hidden = !session;
};
showSession();

// The site's own sign-in: Strapi's users-permissions, as any front of a Strapi app.
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  error.hidden = true;
  const fields = new FormData(form);
  const response = await fetch(`${STRAPI}/api/auth/local`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: fields.get('identifier'), password: fields.get('password') }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.jwt) {
    error.textContent = body.error?.message ?? `Strapi answered ${response.status}`;
    error.hidden = false;
    return;
  }
  session = { jwt: body.jwt, user: { id: body.user.id, username: body.user.username } };
  localStorage.setItem(SESSION, JSON.stringify(session));
  form.reset();
  showSession();
  // The conversation goes on, and is the account's from now on.
  await desk.refresh();
});

document.querySelector('#sign-out').addEventListener('click', () => {
  session = null;
  localStorage.removeItem(SESSION);
  showSession();
  desk.forget();
});
