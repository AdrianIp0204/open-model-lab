# Repository Identity

Open Model Lab currently has two GitHub repositories with different purposes.

## Public Source Repository

`AdrianIp0204/open-model-lab` is the clean public source repository. It exists so people can read the code, study the architecture, file issues, and propose focused contributions.

Public contributions should target this repository.

This repository does not include old private development history, private operator artifacts, real deployment secrets, real `wrangler.jsonc`, or real `public/ads.txt`.

## Private Working Repository

`AdrianIp0204/OpenModelLab` is the private working/archive repository. It contains old private history and operator context and must remain private unless the owner explicitly changes strategy later.

Do not push private branches, tags, history, ignored files, local QA output, deployment credentials, or private artifacts from `AdrianIp0204/OpenModelLab` into `AdrianIp0204/open-model-lab`.

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
- branch
- HEAD SHA
- whether the working tree is clean

If a task references public repository state but the checkout points at `AdrianIp0204/OpenModelLab`, stop and switch to the public repository or ask for direction.

If a task references private working repository state but the checkout points at `AdrianIp0204/open-model-lab`, stop and ask for direction.

For public repo work, do not use stale private-repo HEADs as the basis for changes, and do not reference old private history or private artifacts.
