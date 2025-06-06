const port = process.env.PORT || 3008;
const origin = process.env.NODE_ENV === 'production'
  ? 'https://spaceterra.herokuapp.com'
  : `http://localhost:${port}`;
const mongoUri = process.env.NODE_ENV === 'production'
  ? process.env.MONGODB_URI
  : 'mongodb://127.0.0.1/spaceterra';
module.exports = { port, origin, mongoUri };
