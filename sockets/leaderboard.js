const MAX_SCORE = 1_000_000_000;
const SCORE_SUBMISSION_INTERVAL_MS = 5_000;

function normalizeScore(value) {
  const score = Number(value);
  return Number.isSafeInteger(score) && score >= 0 && score <= MAX_SCORE ? score : null;
}

function sessionUsername(socket) {
  const user = socket.request.session?.passport?.user;
  const username = user?.displayName || user?.email;
  return typeof username === 'string' && username.trim()
    ? username.trim().slice(0, 120)
    : null;
}

module.exports = function(io, db) {
  io.on('connection', socket => {
    const leaderboard = db.collection('leaderboard');
    let lastScoreSubmissionAt = 0;

    socket.on('send_score', data => {
      const username = sessionUsername(socket);
      const score = normalizeScore(data?.score);
      const now = Date.now();

      if (!username) {
        socket.emit('score_error', { code: 'authentication_required' });
        return;
      }

      if (score === null) {
        socket.emit('score_error', { code: 'invalid_score' });
        return;
      }

      if (now - lastScoreSubmissionAt < SCORE_SUBMISSION_INTERVAL_MS) {
        socket.emit('score_error', { code: 'rate_limited' });
        return;
      }

      lastScoreSubmissionAt = now;

      // Bound database growth: retain one row per authenticated player and only improve it.
      leaderboard.updateOne(
        { username },
        { $max: { score }, $setOnInsert: { username } },
        { upsert: true },
        err => {
          if (err) {
            console.error('Error updating score:', err);
            return;
          }

          leaderboard
            .find()
            .limit(7)
            .sort({ score: -1 })
            .toArray((findError, response) => {
              if (findError) {
                console.error('Error fetching updated leaderboard:', findError);
                return;
              }
              socket.emit('rec_score', response);
            });
        }
      );
    });

    socket.on('fetch_score', () => {
      leaderboard
        .find()
        .limit(7)
        .sort({ score: -1 })
        .toArray((err, response) => {
          if (err) {
            console.error('Error fetching leaderboard:', err);
            return;
          }
          socket.emit('rec_score', response);
        });
    });
  });
};

module.exports.normalizeScore = normalizeScore;
