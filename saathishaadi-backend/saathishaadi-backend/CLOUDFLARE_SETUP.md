# Cloudflare Setup

Backend Cloudflare-aware security is already wired in code.

## Local development

Keep:

```env
CLOUDFLARE_ONLY=false
FRONTEND_URL=http://localhost:3000
ADMIN_URL=http://localhost:3001
NODE_ENV=development
```

## Production

Set production URLs:

```env
FRONTEND_URL=https://saathishaadi.com
ADMIN_URL=https://admin.saathishaadi.com
NODE_ENV=production
CLOUDFLARE_ONLY=true
```

## Cloudflare dashboard

1. Add the domain to Cloudflare.
2. Change nameservers at the domain registrar to Cloudflare nameservers.
3. Add DNS records:
   - `A` or `CNAME` for `saathishaadi.com`
   - `A` or `CNAME` for `admin.saathishaadi.com`
   - `A` or `CNAME` for API backend, if hosted separately
4. Turn on the orange cloud proxy for public records.
5. SSL/TLS mode: use `Full (strict)` after installing a valid origin certificate.
6. Enable:
   - Always Use HTTPS
   - Automatic HTTPS Rewrites
   - Bot Fight Mode or WAF managed rules
   - Rate limiting rules for `/api/auth/*` and `/api/admin/*`

## Important

`CLOUDFLARE_ONLY=true` blocks requests that do not include Cloudflare forwarding headers. For strong origin protection, also restrict the server firewall to Cloudflare IP ranges so direct traffic cannot reach the origin.
