# ControlPlane Compatibility Matrix

Use this page as a release-time compatibility checkpoint.

## Current matrix (2026-04-14)

| core (`colony-harness`) | controlplane-runtime | controlplane-sdk-adapter | colony-bee-sdk | Status |
| --- | --- | --- | --- | --- |
| `1.0.x` | `1.0.x` | `1.0.x` | `1.1.x` | ✅ Recommended |
| `1.0.x` | `1.0.x` | `1.0.x` | `1.0.x` | ⚠️ Requires regression checks |

## Compatibility policy

- patch/minor: backward compatible by default, must pass contract tests + eval gate.
- major: breaking changes are allowed but require migration notes and matrix updates.
- Any direct `core -> sdk` dependency is a hard red line and must be blocked.

## Pre-release checks

1. `pnpm test`
2. `pnpm eval:gate`
3. Contract tests for both mock adapter and sdk adapter
4. Update this matrix with verified versions and date

