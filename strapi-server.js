'use strict';

// Strapi 4 loads a plugin's server from this file; Strapi 5 from the `exports` of package.json.
module.exports = require('./dist/server/index.js').default;
