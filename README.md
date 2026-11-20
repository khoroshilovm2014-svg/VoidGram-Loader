# NovaStore

NovaStore is an iOS app-store project based on the public SideStore codebase.

## Current status

This branch starts the iOS migration. The previous desktop VoidGram Loader code remains untouched on `main`, and a snapshot is preserved in `backup/pre-novastore-2026-11-20`.

The iOS engine is tracked as the `NovaStoreCore` Git submodule, pinned by Git to the upstream SideStore repository's current `develop` commit. This avoids copying or silently relicensing upstream code.

## License

The SideStore codebase is licensed under **GNU AGPL-3.0**. Any distributed derivative that incorporates that code must preserve the applicable license and source-availability obligations. NovaStore branding and original assets do not change the license of upstream components.

## Checkout

```bash
git clone --recurse-submodules https://github.com/khoroshilovm2014-svg/VoidGram-Loader.git
cd VoidGram-Loader
git checkout novastore-ios
git submodule update --init --recursive
```

## Build status

The first CI workflow checks out the iOS source and lists the available Xcode schemes on a macOS runner. It does not yet produce a signed IPA. A distributable IPA requires a configured Apple signing identity, provisioning profile, bundle identifier, and the required app-specific configuration.

## Roadmap

- [ ] Establish reproducible iOS source checkout and Xcode scheme discovery
- [ ] Apply NovaStore name, bundle identifiers, app icon, and interface branding
- [ ] Validate signing and refresh/install flows on a real device
- [ ] Add a signed IPA workflow after signing configuration is available
