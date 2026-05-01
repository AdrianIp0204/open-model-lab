# Open Model Lab Feedback Triage

The public-preview feedback flow stays intentionally small:

- the browser posts to `app/api/feedback/route.ts`
- the route sends a server-side notification email when `RESEND_API_KEY`, `FEEDBACK_FROM_EMAIL`, and `FEEDBACK_TO_EMAIL` are configured
- the UI always keeps a prefilled `mailto:` fallback visible

There is no account system, moderation queue, ticketing backend, or admin dashboard in this release.

## Payload Shape

Server-side feedback deliveries keep a stable triage surface:

- `category` and `categoryLabel` identify the selected feedback bucket
- `page.type`, `page.path`, and `page.title` normalize the route context
- `context` preserves canonical concept, topic, and track metadata when available
- `runtime` keeps the full page URL, referrer, viewport, and widget/page surface
- `triage.bucketKey` gives a compact grouping key such as `bug:concept:projectile-motion`
- `triage.tags` provides sortable tags such as `page:concept`, `concept:projectile-motion`, or `surface:widget`
- `request.host` and `request.origin` record which preview deployment received the note

The email fallback uses the same normalized context, triage bucket, and triage tags in the message body so inbox sorting stays consistent even when direct delivery is unavailable.

## Triage Workflow

1. Group incoming notes by `triage.bucketKey`.
2. Use `triage.tags` to split concept-specific issues from topic, track, or site-wide issues.
3. Reproduce with `page.path` first, then use `runtime.pageHref` and `runtime.referrer` if the report came from a deeper entry point or shared link.
4. Treat `accuracy` and `bug` reports as highest-priority release-readiness checks, then review `controls`, `clarity`, and `request`.
5. When `contact` is present, use it only for follow-up questions or to close the loop after a fix ships.

## Delivery Assumptions

- `RESEND_API_KEY`, `FEEDBACK_FROM_EMAIL`, and `FEEDBACK_TO_EMAIL` are optional as a group. Without them, the route returns a bounded error and the UI keeps the prefilled email fallback active.
- `FEEDBACK_RESEND_API_BASE_URL` is optional and exists mainly for local/dev test doubles.
- `NEXT_PUBLIC_FEEDBACK_EMAIL` controls the visible fallback inbox address.
- Feedback remains local to the public-preview capture flow. No sync, identity, or support tooling is implied by this document.
