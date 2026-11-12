# VoidGram Loader

Windows desktop application for selecting IPA files, detecting connected iOS devices, and requesting installation through the local `libimobiledevice` command-line tools.

## Current status (0.4.1)

This is an early development build, not a complete Apple ID signing application.

Implemented:
- Tauri 2 desktop shell for Windows (NSIS installer target).
- Russian-language interface.
- IPA file picker.
- Device detection through `idevice_id`.
- IPA installation request through `ideviceinstaller`.

Not implemented:
- Apple ID sign-in.
- Apple Developer free-account certificate creation or signing.
- Automatic renewal/re-signing after seven days.
- Bundling and automatic installation of Apple device drivers or libimobiledevice tools.

The computer must have the required Apple device driver and compatible `idevice_id` / `ideviceinstaller` executables available on PATH. A successful desktop build does not prove that device detection, installation, or signing works.

## Build on GitHub

A push to `main` starts the **Build Windows installer** workflow. It uses a Windows GitHub Actions runner, installs Node.js 20 and stable Rust, builds the Tauri application, and uploads the NSIS setup executable as the `VoidGram-Loader-setup` artifact.

Open [GitHub Actions](https://github.com/khoroshilovm2014-svg/VoidGram-Loader/actions), select the latest run, and download its artifact only after the run succeeds.

## Local development

Requirements:
- Node.js 20+
- Rust stable with the MSVC toolchain
- Microsoft C++ Build Tools (Desktop development with C++)
- Microsoft Edge WebView2

Commands:

```powershell
npm install
npm run tauri:dev
```

Create a Windows installer:

```powershell
npm run tauri:build
```

## Safety and signing

Only install IPA files that you are authorized to use. Do not send Apple ID passwords, verification codes, session cookies, or developer credentials to anyone or put them in source code or GitHub Actions logs. Apple ID signing must be designed and tested separately before this project can claim to support it.
