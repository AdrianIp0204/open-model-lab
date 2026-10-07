# Repository Identity

## Current status — 7 October 2026

The owner confirmed that **Open Model Lab is no longer active and its website hosting has been removed**. This supersedes earlier descriptions of an active development repository or live hosted product.

**ExamLantern is a separate project.** Leftover Open Model Lab wording in ExamLantern is stale naming, not evidence of a rebrand, repository migration, or shared product policy. Do not move ExamLantern tasks into this repository.

## Retained public source

`AdrianIp0204/open-model-lab` retains the public source of the inactive Open Model Lab project. Its code, educational content, and brand retain the terms in `LICENSE`, `CONTENT_LICENSE.md`, and `BRAND.md`.

Earlier launch records, support links, roadmaps, and task lists describe the historical project. They do not establish current hosting, an active development commitment, or permission to restart the website. Existing runtime names, capability-based entitlements, and compatibility keys describe this preserved implementation; they are not ExamLantern product requirements.

The repository must not include old private development history, private operator artifacts, real deployment secrets, real `wrangler.jsonc`, real `public/ads.txt`, local database dumps, generated browser output, or private learner/support data.

## Private historical repository

`AdrianIp0204/OpenModelLab` is a private historical/archive repository. Keep it private unless the owner explicitly changes that decision.

Do not push private branches, tags, history, ignored files, local QA output, deployment credentials, or private artifacts into the public repository. Do not port private-history branches into the public repository without an explicitly requested, reviewed cherry-pick.

## Repository guard

Before explicitly requested maintenance, verify the repository and state:

```bash
git remote -v
git branch --show-current
git status --short
git rev-parse HEAD
```

Record the repository full name, remote URL, branch, HEAD SHA, and working-tree state. Use this repository's public `main` as the baseline for its own source maintenance; do not substitute a private archive branch.

If a task references public-source maintenance but the checkout points at `AdrianIp0204/OpenModelLab`, stop and switch to `AdrianIp0204/open-model-lab` before editing. If a task references private archive maintenance but the checkout points at `AdrianIp0204/open-model-lab`, stop and ask for direction.

For ExamLantern work, verify its own repository and current product requirements. An unavailable public repository URL or an old provider-account label is not evidence that Open Model Lab has replaced it. Do not revive the historical Open Model Lab queue or hosting based on old docs.
