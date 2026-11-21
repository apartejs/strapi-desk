// The middlewares of a new app of each version: Strapi 4.0 had no session middleware yet.
const [major, minor] = require('@strapi/strapi/package.json').version.split('.').map(Number);

module.exports = [
  'strapi::errors',
  'strapi::security',
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::logger',
  'strapi::query',
  'strapi::body',
  ...(major > 4 || minor >= 1 ? ['strapi::session'] : []),
  'strapi::favicon',
  'strapi::public',
];
