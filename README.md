# Implementing SSO with OpenID Connect (OIDC) in Node.js

Companion to [sso-saml-nodejs](https://github.com/alinabilali/sso-saml-nodejs): the same dummy app
(landing, home, admin-only page 1, all-users page 2), but authenticating with the OIDC
authorization code flow via `openid-client` (endpoints auto-discovered, PKCE S256 enabled).

> **Status:** reference implementation. It follows the standard flow and the redirect step has been
> checked, but it has not been run against a live identity provider.

## How it works
1. `GET /login` redirects the browser to the provider's authorization endpoint with `client_id`,
   `redirect_uri`, `scope`, a random `state` and a PKCE `code_challenge`.
2. The user signs in at the provider, which redirects back to `GET /login/callback?code=...&state=...`.
3. The server checks `state`, then exchanges the `code` (plus the PKCE `code_verifier` and client secret)
   for tokens at the token endpoint.
4. ID token / userinfo claims are mapped to a user and a role in `passport.js`.
5. The user is stored in the session and redirected to `/home`.

## Setup
1. Create an OIDC application in your IdP (JumpCloud, Auth0, Okta, Keycloak...) with redirect URI `BASE_URL/login/callback`.
2. `cp .env.EXAMPLE .env` and fill in the issuer, client ID and client secret.
3. `npm install && npm run dev`, then open http://localhost:3500.

## Roles
`admin` is granted to emails in `ADMIN_EMAILS`, or taken from the claim named in `OIDC_ROLE_CLAIM`.
Everyone else is `user` and gets a 403 on `/page1`.

## Sessions and security notes
- `REDIS_URL` stores sessions in Redis; without it the in-memory store is used (dev only).
- Cookies are `httpOnly` and `sameSite=lax`; with `NODE_ENV=production` they are also `secure` and `trust proxy` is on.
- `state` protects against CSRF, PKCE protects against authorization code interception.
- Not implemented: refresh tokens and provider (single) logout.

## SAML vs OIDC
| | SAML | OIDC |
|---|---|---|
| Callback | POST XML assertion | GET `code`, exchanged for tokens |
| Trust | X.509 cert file | client ID/secret + issuer |
| Profile | assertion attributes | ID token / userinfo claims |
