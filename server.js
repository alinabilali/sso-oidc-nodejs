require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const config = require('./config');

// Sessions: Redis when REDIS_URL is set, otherwise the in-memory store (dev only)
async function createSessionStore() {
  if (!config.redisUrl) return undefined;
  const { createClient } = require('redis');
  const RedisStore = require('connect-redis').default;
  const redisClient = createClient({ url: config.redisUrl });
  await redisClient.connect();
  return new RedisStore({ client: redisClient, prefix: 'sess:' });
}

const app = express();
const PORT = process.env.PORT || 3500;

async function main() {
  const store = await createSessionStore();
  await require('./passport')(passport);
  if (config.isProd) app.set('trust proxy', 1);

  // Express.js middleware setup
  app.set('view engine', 'ejs');
  app.use(express.static('public'));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(
    session({
      store,
      secret: process.env.SESSION_KEY,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax', // lax so the cookie survives the redirect back from the IdP
        secure: config.isProd,
        maxAge: 1000 * 60 * 60 * 8,
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  const ensureAuth = (req, res, next) =>
    req.isAuthenticated() ? next() : res.redirect('/login');

  const checkRole = (role) => (req, res, next) =>
    req.user && req.user.role === role ? next() : res.status(403).render('forbidden');

  // Routes
  app.get('/', (req, res) => res.redirect('/landing'));

  app.get('/landing', (req, res) => res.render('landing'));

  // Starts the OIDC authorization code flow (redirects to the identity provider)
  app.get('/login', passport.authenticate(config.passport.strategy));

  // The identity provider redirects back here with ?code=...&state=...
  app.get('/login/callback', (req, res, next) => {
    passport.authenticate(config.passport.strategy, (err, user, info) => {
      if (err) {
        console.error('Error in SSO authentication:', err);
        return res.render('login', { error: 'SSO authentication failed' });
      }
      if (!user) {
        console.error('User not found', info);
        return res.render('login', { error: 'User not found' });
      }
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error('Error logging in:', loginErr);
          return res.render('login', { error: 'Login failed' });
        }
        return res.redirect('/home');
      });
    })(req, res, next);
  });

  app.get('/home', ensureAuth, (req, res) => {
    res.render('home', { username: req.user.username, role: req.user.role });
  });

  app.get('/page1', ensureAuth, checkRole('admin'), (req, res) => res.render('page1'));

  app.get('/page2', ensureAuth, (req, res) => res.render('page2'));

  app.get('/logout', (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy(() => res.redirect('/'));
    });
  });

  app.listen(PORT, () => console.log(`Server running at Port ${PORT}`));
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
