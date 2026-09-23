// Minimal static server for the AI-player harness.
//
// The real server.js requires MongoDB and Google OAuth before it will even
// start listening. None of that is needed to *play* the game - login and
// the leaderboard are optional features layered on top - so this harness
// serves the same public/ assets directly and stubs the two endpoints
// landing.js calls on load, instead of standing up the full stack.
const express = require('express');
const path = require('path');

const PORT = 3008; // must match public/javascripts/config.js's hardcoded dev origin

function startHarnessServer() {
  const app = express();

  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'harness.html'));
  });

  // landing.js fetches these on load; answering "logged out" keeps it happy.
  app.get('/api/user', (req, res) => res.json({ user: null }));
  app.get('/api/user/stats', (req, res) => res.json({ score: null, rank: null }));

  return new Promise((resolve) => {
    const server = app.listen(PORT, () => resolve(server));
  });
}

module.exports = { startHarnessServer, PORT };
