# Releasing

Publishable packages use [Changesets](https://github.com/changesets/changesets) and GitHub Actions with npm **Trusted Publisher** (OIDC). No long-lived `NPM_TOKEN` is required once Trusted Publisher is configured for this repo.

## npm Trusted Publisher (one-time)

On [npmjs.com](https://www.npmjs.com/) → `@aisdkagents/react` → **Settings** → **Trusted Publisher**:

| Field               | Value           |
| ------------------- | --------------- |
| Provider            | GitHub Actions  |
| Organization / user | `nolly-studio`  |
| Repository          | `ai-sdk-agents` |
| Workflow filename   | `release.yml`   |
| Environment         | _(leave empty)_ |
| Allow npm publish   | ✅              |

The workflow path must match exactly: `.github/workflows/release.yml`.

## Day-to-day

1. On a feature branch, after the change lands in review:

   ```bash
   pnpm changeset
   ```

   Choose `@aisdkagents/react` (or other publishable packages), bump type, and a short summary. Commit the file under `.changeset/`.

2. Merge the feature PR into `main`.

3. CI runs **Release**: if there are pending changesets, it opens/updates a **Version Packages** PR (versions + `CHANGELOG.md`).

4. Merge the Version Packages PR. The same workflow publishes to npm with provenance.

## Local scripts

```bash
pnpm changeset          # create a changeset
pnpm version-packages   # apply versions (usually done in CI)
pnpm release            # build packages + changeset publish
```

## Manual publish (escape hatch)

See [packages/react/PUBLISH.md](./packages/react/PUBLISH.md). Prefer the automated path above.
