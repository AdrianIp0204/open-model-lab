# Platform Stability Checklist

Use this compact route matrix before expanding the concept library or adding another subject.

## Query And State Rules

- Canonical concept slug redirects preserve the incoming query string.
- `state` is the authoritative exact-state restore input for supported concepts.
- `experiment` decorates the setup card and share copy, but does not replace the bench state on its own.
- `challenge` layers on top of the restored or default bench. It does not override a valid `state`.
- Compare benches restored through `state` stay in compare mode and route save/manage actions to the compare library, not the single saved-setups flow.
- Invalid or stale `state` values fall back to the default bench and should surface the invalid-link notice instead of breaking the page.

## Manual QA Matrix

- Signed-out:
  - `/`
  - `/start`
  - `/search?q=graph&subject=math`
  - one subject page per subject
  - one supported concept with an exact-state setup link
  - one supported concept in compare mode
- Signed-in premium via `/dev/account-harness`:
  - `/account/setups`
  - `/account/compare-setups`
  - save and reopen one single setup
  - save and reopen one compare setup
  - copy one exact-state setup link
  - copy one compare link
  - one challenge deep link on top of restored state
- Fallbacks:
  - invalid `state` on a supported concept
  - empty saved-setup library
  - empty compare library
  - sync retry state after a forced offline or failed request

## Launch-Readiness Matrix

- Public entry:
  - `/`
  - `/about`
  - `/start`
  - `/search`
  - `/concepts`
  - `/concepts/subjects`
  - one subject page per subject
  - one topic page
  - one starter-track page and one track completion page
- Study tools:
  - one setup-capable concept with a valid `state` link
  - one compare-capable concept with compare mode active
  - `/account/setups` signed out, signed-in free, and signed-in premium
  - `/account/compare-setups` signed out, signed-in free, and signed-in premium
  - save and reopen one single setup from the account library
  - save and reopen one compare setup from the compare library
  - verify a second signed-in browser sees synced saved study objects when the harness is available
- Trust and support:
  - `/pricing`
  - `/billing`
  - `/privacy`
  - `/terms`
  - `/contact`
- Release sanity:
  - empty or no-results state points to a useful next step
  - premium-gated notices explain that signing in alone does not upgrade the account
  - invalid `state` falls back safely and keeps the user on a usable concept page
