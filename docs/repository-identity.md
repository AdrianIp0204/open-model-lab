# Repository Identity

Open Model Lab currently has two GitHub repositories with different purposes.

## Active Public Source Repository

`AdrianIp0204/open-model-lab` is the active public development repository and current source of truth. It exists so people can read the code, study the architecture, file issues, propose focused contributions, and continue future development from the clean public history.

Public-facing issues, pull requests, documentation updates, CI changes, and future development should target this repository.

This repository does not include old private development history, private operator artifacts, real deployment secrets, real `wrangler.jsonc`, or real `public/ads.txt`.

## Private Historical Archive

`AdrianIp0204/OpenModelLab` is a private historical/archive repository only. It contains old private history and operator context and must remain private unless the owner explicitly changes strategy later.

Do not use `AdrianIp0204/OpenModelLab` for new public-facing development. Branches there may be stale, private-history-based, or behind the public repository.

Do not push private branches, tags, history, ignored files, local QA output, deployment credentials, or private artifacts from `AdrianIp0204/OpenModelLab` into `AdrianIp0204/open-model-lab`.

Do not port private-history branches into the public repository unless the owner explicitly asks for a reviewed cherry-pick.

## Agent And Contributor Guard

Before editing, verify the current repository and state:

```bash
git remote -v
git branch --show-current
git status --short
git rev-parse HEAD
```

For agent/Codex sessions, report or record:

- repository full name
- remote URL
- branch
- HEAD SHA
- whether the working tree is clean

If a task references public repository state but the checkout points at `AdrianIp0204/OpenModelLab`, stop and switch to `AdrianIp0204/open-model-lab` before editing.

If a task references private archive maintenance but the checkout points at `AdrianIp0204/open-model-lab`, stop and ask for direction.

For public repo work, use public `main` as the baseline. Do not use stale private-repo HEADs as the basis for changes, and do not reference old private history or private artifacts.
