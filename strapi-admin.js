'use strict';

// Strapi 4's admin of a local plugin reads this file; Strapi 5, and Strapi 4 for an installed
// package, read the `exports` of package.json. Both reach the same admin build.
module.exports = require('./dist/admin/index.js').default;
