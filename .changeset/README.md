# Changesets

Every change to a published package comes with a changeset: run `pnpm changeset`, pick the packages and the kind of bump, and describe the change for the changelog. Each package is versioned on its own.

On `master`, the release workflow opens a "Version packages" pull request that applies the pending changesets. Merging it publishes the new versions to npm.
