# GitHub Label Setup

Open Model Lab keeps recommended public-intake labels in `.github/labels.yml`. This file is the source of truth for label names, colors, and descriptions, but it does not create labels by itself.

## Manual Setup

Before public contribution intake, create the labels in the GitHub UI:

1. Open the repository in GitHub.
2. Go to **Issues** -> **Labels**.
3. Create or update each label from `.github/labels.yml`.
4. Keep names exact, including prefixes such as `type:`, `area:`, and `priority:`.
5. Confirm issue templates render and attach the expected type labels.

The templates under `.github/ISSUE_TEMPLATE/` reference these labels. Missing labels do not change product behavior, but they make public triage noisier.

## Optional CLI Planning

You can inspect the label plan without mutating GitHub:

```bash
pnpm github:labels:plan
```

To print optional `gh label create --force` commands for review:

```bash
pnpm github:labels:plan -- --emit-gh-commands
```

In this mode, commands are printed only. The script does not call the GitHub API, does not require a token, and does not store credentials. Review commands before running them manually.

After owner approval, the same helper can apply the labels through the GitHub CLI:

```bash
pnpm github:labels:plan -- --apply
```

Apply mode is intentionally opt-in. It uses the authenticated `gh` session for the current repository and prints label names only.

## Security Label Boundary

`type: security` is for private triage tracking only. Do not ask reporters to post vulnerability details in public issues. Public security reports should be redirected to `SECURITY.md` and handled privately.

## Owner Review Labels

Use `needs owner decision` for work that touches:

- billing, Stripe, Supporter checkout, or webhook behavior
- entitlement gates or internal `free | premium` values
- auth, sessions, account sync, or user data
- ads, AdSense policy, or private `ads.txt` setup
- database migrations or stored data models
- security, privacy, licensing, content-license, or brand policy

Use `good first issue` only when the intended change is small, clear, and unlikely to touch protected product seams.
