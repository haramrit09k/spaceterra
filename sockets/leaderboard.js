module.exports = function(io, db) {
  io.on('connection', socket => {
    const leaderboard = db.collection('leaderboard');
    console.log(`New socket connection established: ${socket.id}`);

    socket.on('send_score', data => {
      const { username, score } = data;
      console.log(`Updating leaderboard - User: ${username}, Score: ${score}`);
      
      leaderboard.insertOne({ username, score }, (err, result) => {
        if (err) {
          console.error('Error inserting score:', err);
          return;
        }
        console.log(`Score successfully inserted with ID: ${result.insertedId}`);
        
        leaderboard
          .find()
          .limit(7)
          .sort({ score: -1 })
          .toArray((err, response) => {
            if (err) {
              console.error('Error fetching updated leaderboard:', err);
              throw err;
            }
            console.log('Top 7 scores retrieved after update:', 
              response.map(item => `${item.username}: ${item.score}`).join(', '));
            socket.emit('rec_score', response);
          });
      });
    });

    socket.on('fetch_score', () => {
      console.log(`Fetching leaderboard scores - Request from socket: ${socket.id}`);
      
      leaderboard
        .find()
        .limit(7)
        .sort({ score: -1 })
        .toArray((err, response) => {
          if (err) {
            console.error('Error fetching leaderboard:', err);
            throw err;
          }
          console.log('Top 7 scores retrieved:', 
            response.map(item => `${item.username}: ${item.score}`).join(', '));
          socket.emit('rec_score', response);
        });
    });
  });
};
