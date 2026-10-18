const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3500}`;

module.exports = {
  baseUrl,
  isProd: process.env.NODE_ENV === 'production',
  redisUrl: process.env.REDIS_URL || '',
  adminEmails: (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  roleClaim: process.env.OIDC_ROLE_CLAIM || '',
  passport: {
    strategy: 'oidc',
    oidc: {
      // Endpoints are discovered from <issuer>/.well-known/openid-configuration
      issuer: process.env.OIDC_ISSUER,
      clientID: process.env.OIDC_CLIENT_ID,
      clientSecret: process.env.OIDC_CLIENT_SECRET,
      redirectURI: `${baseUrl}/login/callback`,
      scope: process.env.OIDC_SCOPE || 'openid profile email',
    },
  },
};
