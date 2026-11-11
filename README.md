# VoidGram Loader

Windows desktop application for working with IPA files and connected iOS devices.

## Build

Open GitHub Actions and run the workflow named Build Windows installer.

## Requirements

- Node.js 20+
- Rust stable
- Tauri 2 dependencies

## Development

```powershell
npm install
npm run tauri:dev
```

Only use correctly signed IPA files. This application does not bypass Apple signing.