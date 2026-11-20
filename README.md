# NovaStore

NovaStore is a branded continuation built on the SideStore iOS codebase. This branch keeps the upstream installation, signing, pairing and refresh implementation as a Git submodule and applies NovaStore presentation metadata during CI.

## Current state

- Product display name: **NovaStore**
- Adds the `novastore://` URL scheme while retaining `sidestore://` compatibility.
- Replaces the onboarding welcome title with NovaStore.
- Generates a custom dark-blue NovaStore app icon in the macOS workflow.
- Preserves upstream signing, install, refresh, pairing and entitlement code.

## Build status

GitHub Actions validates the upstream Xcode project and applies the branding patch. This is a source validation job, **not yet a signed IPA release workflow**. An installable IPA still requires a deliberate signing/export configuration and valid Apple provisioning credentials.

## License

SideStore is licensed under AGPL-3.0. This derivative must retain the applicable AGPL obligations; see the upstream license and notices.
