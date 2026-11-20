# NovaStore

NovaStore is a branded continuation built on the SideStore iOS codebase. The upstream installation, signing, pairing, refresh, and app-management implementation remains in the pinned Git submodule.

## NovaStore identity

- App display name: **NovaStore**
- Main Bundle ID: `com.novastore.app`
- App Group namespace: `group.com.novastore.app`
- URL schemes: `novastore://` plus retained `sidestore://` compatibility
- Dark near-black surfaces with violet/indigo accents
- Generated NovaStore app icon is applied to the upstream app icon asset

## CI artifacts

The macOS GitHub Actions workflow:
1. Checks out the pinned upstream source.
2. Applies NovaStore branding, Bundle ID, and palette.
3. Compiles the iOS Simulator target.
4. Archives the iOS device target without a signing identity.
5. Packages the archived app into `NovaStore-unsigned.ipa`.

The IPA artifact is **unsigned**. It is a build output, not an install-ready signed release. To install on an iPhone, it must be signed with a valid Apple Development certificate and matching provisioning profile (or re-signed by a supported sideloading tool). GitHub Actions cannot create a valid personal Apple signing identity without the owner's credentials and provisioning setup.

Open **Actions → NovaStore iOS build** and download the `NovaStore-unsigned-IPA` artifact after the workflow completes.

## License

The upstream SideStore code is licensed under AGPL-3.0. This derivative retains the applicable AGPL obligations and upstream notices.
