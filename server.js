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

MongoClient.connect(config.mongoUri, (err, client) => {
  if (err) {
    throw err;
  }
  console.log('Connection to DB established!');
  console.log(config.mongoUri);
  const db = client.db('spaceterra');
  require('./sockets/leaderboard')(io, db);
});

server.listen(config.port, () => {
  console.debug(`Server listening on port ${config.port}`);
});
