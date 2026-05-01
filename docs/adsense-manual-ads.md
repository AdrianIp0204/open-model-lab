# AdSense Manual Ads

This doc describes the current pre-approval ad architecture for Open Model Lab.
It is intentionally dormant by default and requires explicit post-approval
activation.

## Audit Findings

- The old AdSense bootstrap lived in the root layout and could activate from env
  presence alone.
- The old ad seam auto-derived an `adsense` render mode when a client id and one
  slot existed, even without an explicit approval-ready feature flag.
- The old implementation included a development-only placeholder mode that kept
  reserved sponsor shells visible instead of failing closed.
- Manual ad slots already existed on:
  - `/`
  - `/concepts`
  - `/concepts/topics`
  - `/guided`
- Premium suppression already existed at the component level through
  `entitlement.capabilities.shouldShowAds`, but the provider bootstrap itself was
  not route-aware or entitlement-aware.
- No Auto ads bootstrap was found as an active production path, but the old
  layout-level bootstrap was still too broad for a pre-approval ship.

## Final Architecture

- `lib/ads/slots.ts`
  - Central placement registry
  - Route-group policy
  - Placement-to-route ownership
  - Safe placement notes for each placement
- `lib/ads/adsense.ts`
  - Explicit feature flag parsing
  - AdSense client-id validation
  - Slot-id validation
  - Manual unit config resolution by placement
- `lib/ads/policy.ts`
  - Global activation gate
  - Route eligibility gate
  - Placement eligibility gate
  - Shared bootstrap gate
  - Explicit session-readiness guard before bootstrap or placement activation
- `public/ads.example.txt`
  - Placeholder-only seller-line format reference for private `ads.txt` setup
- `scripts/write-ads-txt.mjs`
  - Materializes the ignored `public/ads.txt` from a private env value or private source file
  - Kept outside App Router runtime handling so production still serves a crawler-safe static file
- `components/ads/AdsProviderScript.tsx`
  - Single client-side bootstrap path
  - Injects the AdSense script only once
  - Loads only for ad-eligible free sessions on ad-eligible routes
- `components/account/PremiumSubscriptionActions.tsx`
  - Triggers a one-time route refresh after a free-to-premium billing return so
    the current page re-renders into a Premium-clean state without loops
- `components/ads/AdSlot.tsx`
  - Placement-driven manual unit renderer
  - Thin wrappers for `DisplayAd`, `InFeedAd`, `InArticleAd`, and `MultiplexAd`
  - Safe no-op when disabled, misconfigured, premium, or route-ineligible

## Dormant-By-Default Activation Model

Ads stay off unless all of these are true:

1. `NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_ENABLED=true`
2. A valid AdSense client id exists
3. The current user is ad-eligible through the existing entitlement capability
4. The current route is ad-eligible
5. The placement belongs to that route
6. The placement has a valid slot id

If any of those are false, the placement renders nothing and the bootstrap script
does not load.

## Route Policy

### Ad-eligible routes

- `/`
- `/search`
- `/guided`
- `/concepts`
- `/concepts/topics`
- `/concepts/topics/[slug]`
- `/concepts/subjects`
- `/concepts/subjects/[slug]`
- `/concepts/[slug]`

### Always ad-free routes

- Auth and password flows
- Account pages
- Dashboard and analytics pages
- Billing and subscription management routes
- Contact / feedback flows
- Privacy / terms / ads / other trust-policy routes
- `/about`
- Challenge flows
- Developer harness routes
- Guided collection detail routes

## Placement Registry

### Homepage

- `home.heroBelow` -> Display
- `home.discoveryMid` -> Display
- `home.footerMultiplex` -> Multiplex

### Library / browse

- `library.browserDisplay` -> Display
- `library.footerMultiplex` -> Multiplex
- `topicDirectory.headerDisplay` -> Display
- `topicDirectory.footerMultiplex` -> Multiplex
- `subjectDirectory.headerDisplay` -> Display

### Topic / subject detail

- `topic.headerDisplay` -> Display
- `topic.footerMultiplex` -> Multiplex
- `subject.headerDisplay` -> Display
- `subject.footerMultiplex` -> Multiplex

### Guided / search

- `guided.headerDisplay` -> Display
- `guided.footerMultiplex` -> Multiplex
- `search.resultsDisplay` -> Display

### Concept pages

- `concept.bodyInArticle` -> In-article
- `concept.postLabDisplay` -> Display
- `concept.footerMultiplex` -> Multiplex

## Concept Page Safety Rules

Concept pages are now ad-eligible only in safe non-interactive zones.

### Never place ads in:

- The simulation stage
- The primary control column
- Graph panels
- Equation panels
- Time controls
- Compare / prediction / challenge interactive regions
- The immediate protected live-lab container

### Current safe concept placements:

- One in-article unit after overview prose sections
- One post-lab display unit after the main explanation region
- One footer multiplex unit below the lower-page sections

The live bench is explicitly marked as a protected learning zone in the rendered
markup so tests can verify ads stay outside it.

## Current Ad Types By Surface

- Display:
  - Home
  - Library / browse directories
  - Topic / subject detail headers
  - Guided
  - Search
  - Concept post-lab zone
- In-article:
  - Concept explanatory prose
- Multiplex:
  - Lower-page recommendation zones on home, library, topic, subject, guided,
    and concept pages
- In-feed:
  - Supported by the component layer, but intentionally not used yet because the
    current layouts do not need a feed-native insertion point badly enough to
    justify forcing one.

## Required Env Vars

### Global gate

```bash
NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_ENABLED=false
```

### Shared provider

```bash
NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_CLIENT_ID=ca-pub-your-publisher-id
```

### Existing slot ids already wired in the repo

```bash
NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_HOME_DISCOVERY=...
NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_CONCEPT_LIBRARY_DISCOVERY=...
NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_TOPIC_DIRECTORY_DISCOVERY=...
NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_GUIDED_DIRECTORY_DISCOVERY=...
```

### Additional activation-ready slot ids

```bash
NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_HOME_HERO_BELOW=...
NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_HOME_FOOTER_MULTIPLEX=...
NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_CONCEPT_LIBRARY_FOOTER_MULTIPLEX=...
NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_TOPIC_DIRECTORY_FOOTER_MULTIPLEX=...
NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_SUBJECT_DIRECTORY_HEADER_DISPLAY=...
NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_TOPIC_HEADER_DISPLAY=...
NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_TOPIC_FOOTER_MULTIPLEX=...
NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_SUBJECT_HEADER_DISPLAY=...
NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_SUBJECT_FOOTER_MULTIPLEX=...
NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_GUIDED_DIRECTORY_FOOTER_MULTIPLEX=...
NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_SEARCH_RESULTS_DISPLAY=...
NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_CONCEPT_BODY_IN_ARTICLE=...
NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_CONCEPT_POST_LAB_DISPLAY=...
NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_CONCEPT_FOOTER_MULTIPLEX=...
```

### Private ads.txt materialization

Use one of these private inputs when production AdSense is enabled:

```bash
OPEN_MODEL_LAB_ADS_TXT_CONTENT=google.com, pub-your-publisher-id, DIRECT, your-certification-authority-id
OPEN_MODEL_LAB_ADS_TXT_SOURCE=path/to/private/ads.txt
```

Run `pnpm ads:check` to validate the private input without writing the file, or
`pnpm ads:write` to write the ignored `public/ads.txt`. Do not commit the real
seller metadata file.

## Legacy Paths Removed Or Disabled

- Removed the old layout-level always-on script injection behavior.
- Removed the auto-activation behavior that inferred live ads from env presence.
- Removed placeholder-mode rendering from the active path so disabled or
  incomplete config now collapses cleanly.
- Removed `/about` from the ad-eligible route policy so trust/story copy stays ad-free.
- Kept Premium suppression on the existing entitlement capability seam instead of
  adding a second ad-eligibility model.

## Post-Approval Activation Steps

1. Get AdSense approval for the production domain.
2. Create the manual units you actually want to enable first.
3. Add the corresponding slot ids to the deployment environment.
4. Keep `NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_ENABLED=false` until the slot envs
   are in place and `/ads`, `/privacy`, `/terms`, and `/pricing` have been
   reviewed.
5. Set `NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_ENABLED=true`.
6. Confirm:
   - free users on eligible routes see ads
   - premium users stay fully ad-free
   - sensitive routes stay ad-free
   - concept pages only show ads outside the protected live-lab container
7. Provide the real `ads.txt` privately, then run `pnpm ads:check` and
   `pnpm ads:write` in the deploy/setup environment.
8. Verify the static `/ads.txt` asset on the public origin resolves after
   deployment. If the publisher changes, update the private input or source
   file and rerun the materialization step instead of committing the real file
   or reintroducing a runtime route.

## Future Optional Extension Path

If overlay or Auto-ad formats are ever reconsidered later, treat that as a new
policy change and not as an extension of this manual-first architecture. Any
future overlay/Auto path should be evaluated separately against Premium
suppression, concept-page safety, consent requirements, and route policy.
