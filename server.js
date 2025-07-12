require('dotenv').config();
const http = require('http');
const { MongoClient } = require('mongodb');
const socketio = require('socket.io');
const app = require('./app');
const config = require('./config');

const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: config.origin,
    methods: ['GET', 'POST'],
    credentials: true,
    transports: ['websocket', 'polling'],
  },
});

// Use the configured MongoDB URI. The value can be overridden with the
// MONGODB_URI environment variable for local testing or production
// deployments, and otherwise defaults to the local spaceterra database.
const client = new MongoClient(config.mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

client.connect(err => {
  if (err) {
    throw err;
  }
  console.log('Connection to DB established!');
  console.log(config.mongoUri);
  const db = client.db('spaceterra');
  app.locals.db = db;
  require('./sockets/leaderboard')(io, db);
});

server.listen(config.port, () => {
  console.debug(`Server listening on port ${config.port}`);
});
