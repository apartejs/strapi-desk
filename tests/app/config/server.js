module.exports = () => ({ host: '127.0.0.1', port: Number(process.env.PORT || 1337), app: { keys: ['test-key-a', 'test-key-b'] } });
