const port = process.env.PORT || 3008;
const origin = process.env.NODE_ENV === 'production'
  ? `https://spaceterra.herokuapp.com`
  : `http://localhost:${port}`;
// Allow overriding the MongoDB connection string via the MONGODB_URI
// environment variable. This lets local development specify a different
// database URL such as mongodb://127.0.0.1:27017 while production can use the
// value configured on the host. If the variable isn't provided, fall back to
// a local database named "spaceterra".
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1/spaceterra';
const googleClientID = process.env.GOOGLE_CLIENT_ID || '';
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
// Read the session secret from the environment so deployments like Heroku can
// inject a secure value via configuration variables. A default placeholder is
// provided for local development.
const sessionSecret = process.env.SESSION_SECRET || 'changeme';

module.exports = {
  port,
  origin,
  mongoUri,
  googleClientID,
  googleClientSecret,
  sessionSecret,
};
