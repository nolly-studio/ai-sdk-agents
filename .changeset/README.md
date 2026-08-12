# Changesets

Hello! This folder stores upcoming release notes for publishable packages.

## Workflow

1. On a feature PR, run `pnpm changeset` and commit the generated markdown file.
2. Merge the PR into `main`.
3. The [Release](../.github/workflows/release.yml) workflow opens (or updates) a **Version Packages** PR.
4. Merge that PR to publish to npm via Trusted Publisher (OIDC).

See [RELEASING.md](../RELEASING.md).
