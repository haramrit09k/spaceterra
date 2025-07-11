const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const config = require('./config');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: 'change_this_secret',
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

passport.use(
  new GoogleStrategy(
    {
      clientID: config.googleClientID,
      clientSecret: config.googleClientSecret,
      callbackURL: '/auth/google/callback',
    },
    (accessToken, refreshToken, profile, done) => done(null, profile)
  )
);

app.set('views', path.join(__dirname, 'views'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
}));

app.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/');
  }
);

app.get('/api/user', (req, res) => {
  res.json({ user: req.user || null });
});

app.get('/api/user/stats', async (req, res, next) => {
  if (!req.user) {
    return res.json({ score: null, rank: null });
  }

  try {
    const db = req.app.locals.db;
    if (!db) {
      throw new Error('Database not initialized');
    }
    const leaderboard = db.collection('leaderboard');
    const username = req.user.displayName || req.user.email;

    const topEntry = await leaderboard
      .find({ username })
      .sort({ score: -1 })
      .limit(1)
      .toArray();

    const score = topEntry[0] ? topEntry[0].score : 0;

    const betterCount = await leaderboard.countDocuments({ score: { $gt: score } });
    const rank = score > 0 ? betterCount + 1 : null;

    res.json({ score, rank });
  } catch (err) {
    next(err);
  }
});

app.get('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) {
      return next(err);
    }
    res.redirect('/');
  });
});

module.exports = app;
