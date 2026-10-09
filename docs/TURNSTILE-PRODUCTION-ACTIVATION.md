# Turnstile activation for public StudioTasker forms

Cloudflare Turnstile is wired to **owner registration, password-reset requests,
verification-link resend, and the public contact form**.

The site currently enforces the challenge only when the deployment sets
`TURNSTILE_REQUIRED=true`. **Do not mark bot protection operational until
the following is completed in the production environment.**

1. Create a Cloudflare Turnstile widget bound to the exact public hostname(s)
   where these forms are served. Configure temporary preview hostnames separately.
2. Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in the **Next build environment**
   (Docker `--build-arg NEXT_PUBLIC_TURNSTILE_SITE_KEY=...`) and
   `TURNSTILE_SECRET_KEY` in the **runtime secrets manager only**.
3. Set `TURNSTILE_REQUIRED=true`. Optionally provide a comma-separated
   `TURNSTILE_ALLOWED_HOSTNAMES` for strict hostname verification.
4. Rebuild the frontend whenever the public widget key changes.
5. Test challenge rendering/expiry/refresh on `/workspace` register/forgot/
   resend and `/contact`; verify a forged or missing token receives 403,
   a valid one is accepted only once, and an unavailable siteverify returns
   an honest error without creating an account or dispatching email.
6. Configure reverse-proxy and/or CDN rate limiting as a second line of
   defense. `TRUST_PROXY_IP_HEADERS` and `LAUNCH_TRUSTED_PROXY_VERIFIED`
   must be true only behind a trusted origin proxy, and
   `LOGIN_RATE_HMAC_KEY` must be random, private and at least 32 characters.
7. Confirm the deployed Content-Security-Policy allows
   `https://challenges.cloudflare.com` for challenge scripts/frames and that
   owner login / Paddle checkout still work.

Local development without keys continues to work to support isolated CI;
this is **not production proof**. Do not store the secret in NEXT_PUBLIC
variables or GitHub history.
