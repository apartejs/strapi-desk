// The middlewares of a new app of each version (Strapi 4.0 had no session middleware yet), and
// the line the README asks for: a widget on another site sends the conversation's X-Desk-Token.
const [major, minor] = require('@strapi/strapi/package.json').version.split('.').map(Number);

module.exports = [
  'strapi::errors',
  'strapi::security',
  { name: 'strapi::cors', config: { headers: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Desk-Token'] } },
  'strapi::poweredBy',
  'strapi::logger',
  'strapi::query',
  'strapi::body',
  ...(major > 4 || minor >= 1 ? ['strapi::session'] : []),
  'strapi::favicon',
  'strapi::public',
];
