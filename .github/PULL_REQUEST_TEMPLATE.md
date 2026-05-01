## Summary

Describe the change and the user-facing or maintainer-facing reason for it.

## Checklist

- [ ] Scope is bounded to the linked issue or stated task.
- [ ] Linked issue or context is included when applicable.
- [ ] No secrets, private user data, vendor dashboard exports, customer records, or private screenshots are included.
- [ ] Real `wrangler.jsonc` is not committed.
- [ ] Real `public/ads.txt` is not committed.
- [ ] Billing, entitlement, auth, security, ad, or data-model behavior changes are either absent or explicitly explained.
- [ ] Internal `premium` entitlement naming is not renamed casually.
- [ ] Content registry and related generated artifacts were regenerated when content/catalog changes required it.
- [ ] i18n/message updates are included when public copy changes.
- [ ] License, educational-content, and brand boundaries are respected.
- [ ] Screenshots are included only when safe and useful.
- [ ] Relevant checks were run and listed below.

## Checks

List commands run, for example:

```bash
pnpm public-release:hygiene
pnpm lint
pnpm typecheck
pnpm test
```
