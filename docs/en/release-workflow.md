# Release Workflow

## 1. Pre-release checks

1. clean working tree
2. changelog updated
3. local checks pass:
   - `pnpm build`
   - `pnpm typecheck`
   - `pnpm test`
   - `pnpm docs:build`

## 2. Dry run

```bash
pnpm release:dry-run -- --bump patch
```

## 3. Publish

```bash
pnpm release -- --bump patch
```

Or specify version:

```bash
pnpm release -- --version 0.2.0 --tag latest
```

## 4. Post-release

1. push commit + tag
2. publish GitHub Release notes
3. verify docs workflow and Pages deployment
