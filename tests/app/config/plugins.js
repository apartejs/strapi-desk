const { existsSync } = require('node:fs');
const path = require('node:path');

// An app made by scripts/strapi-app.mjs has the plugin installed from its package; this one
// reads it from the repository.
const installed = existsSync(path.join(__dirname, '..', 'node_modules', '@aparte', 'strapi-desk'));

module.exports = () => ({
  'aparte-desk': {
    enabled: true,
    ...(installed ? {} : { resolve: path.join(__dirname, '..', '..', '..') }),
    config: {
      assistant: process.env.DESK_TEST_AI ? { baseUrl: process.env.DESK_TEST_AI, model: 'fake', apiKey: 'test' } : null,
    },
  },
  'users-permissions': { config: { jwtSecret: 'test-jwt-secret' } },
});
