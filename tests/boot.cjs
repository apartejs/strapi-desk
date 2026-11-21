/**
 * Boots one Strapi app for the tests, in a process of its own: the Node that runs it may not be
 * the one that runs the tests (Strapi 4.0 runs on Node 16, Vitest does not). The tests speak
 * to it over HTTP, and through this process's channel for what only the server can do: making
 * the admins and their roles. Plain CommonJS, for every Node from 16.
 */
const { createRequire } = require('module');
const path = require('path');

const appDir = path.resolve(process.env.DESK_APP_DIR);
const load = createRequire(path.join(appDir, 'package.json'));

async function main() {
  const exported = load('@strapi/strapi');
  // Strapi 5 exports createStrapi; Strapi 4 exports the factory itself.
  const create = typeof exported === 'function' ? exported : exported.createStrapi || exported.default;
  const options = { appDir, distDir: appDir, dir: appDir, autoReload: false, serveAdminPanel: false };
  const strapi = await create(options).load();
  await strapi.server.mount();
  const server = strapi.server.httpServer;
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const version = load('@strapi/strapi/package.json').version;

  const roles = async () => {
    const service = strapi.service('admin::role');
    let found = await strapi.db.query('admin::role').findMany();
    if (found.length === 0 && service.createRolesIfNoneExist) {
      await service.createRolesIfNoneExist();
      found = await strapi.db.query('admin::role').findMany();
    }
    return found;
  };

  const handlers = {
    /** An admin: a super admin, Strapi's author role, or a role of its own with these actions. */
    async user({ email, firstname, role, actions }) {
      let roleId;
      if (actions) {
        const made = await strapi.service('admin::role').create({ name: `Role of ${email}`, description: 'tests' });
        await strapi.service('admin::role').assignPermissions(
          made.id,
          actions.map((action) => ({ action, subject: null, properties: {}, conditions: [] }))
        );
        roleId = made.id;
      } else {
        const code = role === 'author' ? 'strapi-author' : 'strapi-super-admin';
        roleId = (await roles()).find((r) => r.code === code).id;
      }
      await strapi.service('admin::user').create({ email, firstname, lastname: 'Test', password: 'Password123!', isActive: true, roles: [roleId] });
      return { password: 'Password123!' };
    },
    async stop() {
      await strapi.destroy();
      setImmediate(() => process.exit(0));
      return {};
    },
  };

  process.on('message', async ({ id, type, ...args }) => {
    try {
      process.send({ id, ok: true, value: await handlers[type](args) });
    } catch (error) {
      process.send({ id, ok: false, error: String((error && error.stack) || error) });
    }
  });
  process.send({ ready: true, base: `http://127.0.0.1:${server.address().port}`, version });
}

main().catch((error) => {
  process.send({ ready: false, error: String((error && error.stack) || error) });
  setImmediate(() => process.exit(1));
});
