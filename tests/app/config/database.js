const path = require('node:path');

module.exports = () => ({
  connection: {
    client: 'sqlite',
    connection: { filename: process.env.DESK_TEST_DB ?? path.join(__dirname, '..', '.tmp', 'test.db') },
    useNullAsDefault: true,
  },
});
