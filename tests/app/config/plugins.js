const path = require('node:path');

module.exports = () => ({
  'aparte-desk': {
    enabled: true,
    resolve: path.join(__dirname, '..', '..', '..'),
    config: {
      assistant: process.env.DESK_TEST_AI ? { baseUrl: process.env.DESK_TEST_AI, model: 'fake', apiKey: 'test' } : null,
    },
  },
  'users-permissions': { config: { jwtSecret: 'test-jwt-secret' } },
});
