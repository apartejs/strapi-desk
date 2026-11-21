# Example: a shop page with the desk's chat

A page of a shop, on another address than Strapi, with an aparté chat in the corner
(`<aparte-launcher>`) that talks to aparté Desk. Write in it as a guest, sign in with a user of
the site, and the conversation goes on as that user's: the chat says "Signed in as …", and the
desk shows the account's name and email.

`src/desk-chat.js` is the whole binding, with no framework: copy it into your widget. Under
React, Vue, Svelte or Angular, mount their chat component and hand its element to `connectDesk`.

## Run it

1. In your Strapi app, let a page of another site send the conversation's token
   (`config/middlewares.js`, see the plugin's README):

   ```js
   {
     name: 'strapi::cors',
     config: { headers: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Desk-Token'] },
   },
   ```

2. Make a user of the site: Content Manager → User → Create, with a password and
   **confirmed** on.

3. Start the page:

   ```sh
   cd example
   npm install
   VITE_STRAPI_URL=http://localhost:1337 npm run dev
   ```

4. Open http://localhost:5173, write in the chat, then sign in. In the desk, the conversation's
   visitor goes from "Guest" to the user.
