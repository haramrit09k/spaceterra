module.exports = function(io, db) {
  io.on('connection', socket => {
    const leaderboard = db.collection('leaderboard');

    socket.on('send_score', data => {
      const { username, score } = data;
      leaderboard.insertOne({ username, score });
      leaderboard
        .find()
        .limit(7)
        .sort({ score: -1 })
        .toArray((err, response) => {
          if (err) throw err;
          socket.emit('rec_score', response);
        });
    });

    socket.on('fetch_score', () => {
      leaderboard
        .find()
        .limit(7)
        .sort({ score: -1 })
        .toArray((err, response) => {
          if (err) throw err;
          socket.emit('rec_score', response);
        });
    });
  });
};
