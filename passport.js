const { Issuer, Strategy } = require('openid-client');
const config = require('./config');

const resolveRole = (claims) => {
  if (config.roleClaim && claims[config.roleClaim]) {
    const claim = claims[config.roleClaim];
    return Array.isArray(claim) ? claim[0] : claim;
  }
  const email = (claims.email || '').toLowerCase();
  return config.adminEmails.includes(email) ? 'admin' : 'user';
};

module.exports = async function (passport) {
  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user));

  const { issuer, clientID, clientSecret, redirectURI, scope } = config.passport.oidc;
  const discovered = await Issuer.discover(issuer);
  const client = new discovered.Client({
    client_id: clientID,
    client_secret: clientSecret,
    redirect_uris: [redirectURI],
    response_types: ['code'],
  });

  passport.use(
    config.passport.strategy,
    new Strategy(
      { client, params: { scope, redirect_uri: redirectURI }, usePKCE: 'S256' },
      (tokenSet, userinfo, done) => {
        try {
          // Prefer ID token claims, fall back to the userinfo response
          const claims = { ...userinfo, ...tokenSet.claims() };
          return done(null, {
            id: claims.sub,
            email: claims.email,
            username: claims.name || claims.preferred_username || claims.email,
            firstName: claims.given_name,
            role: resolveRole(claims),
          });
        } catch (error) {
          console.error('Error in OIDC authentication:', error);
          return done(error);
        }
      }
    )
  );
};
