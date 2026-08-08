const express = require('express');
const path = require('path');
const session = require('express-session');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const config = require('./config');
const { createPublicHealthHandler } = require('./routes/public-health');

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({
  // The legacy Phaser client uses inline assets; retain the other Helmet protections.
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const sessionMiddleware = session({
    // Use the session secret configured via the SESSION_SECRET environment
    // variable. This allows different values in production versus local
    // development and avoids hardcoding secrets in the repository.
    secret: config.sessionSecret,
    name: 'spaceterra.sid',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
    },
  });

app.use(sessionMiddleware);
app.locals.sessionMiddleware = sessionMiddleware;

app.use('/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
}));

app.use('/api', rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
}));

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
      callbackURL: `${config.origin}/auth/google/callback`,
      state: true,
    },
    (accessToken, refreshToken, profile, done) => done(null, profile)
  )
);

console.log(`Server running at ${config.origin}`);

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

app.get('/api/public/health', createPublicHealthHandler());

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
