#!/usr/bin/env python3
"""Apply NovaStore product branding to the upstream SideStore iOS source."""
from pathlib import Path
import plistlib

root = Path(__file__).resolve().parents[1] / "NovaStoreCore"
plist_path = root / "AltStore" / "Info.plist"
onboarding_path = root / "SideStore" / "Views" / "Onboarding" / "OnboardingView.swift"
if not plist_path.is_file() or not onboarding_path.is_file():
    raise SystemExit("Expected upstream iOS files are missing; refusing a partial branding patch.")
with plist_path.open("rb") as f:
    info = plistlib.load(f)
info["CFBundleDisplayName"] = "NovaStore"
url_types = info.setdefault("CFBundleURLTypes", [])
general = next((item for item in url_types if item.get("CFBundleURLName") == "SideStore General"), None)
if general is not None:
    schemes = general.setdefault("CFBundleURLSchemes", [])
    if "novastore" not in schemes:
        schemes.append("novastore")
with plist_path.open("wb") as f:
    plistlib.dump(info, f, sort_keys=False)
source = onboarding_path.read_text()
source = source.replace("Welcome to SideStore", "Welcome to NovaStore")
source = source.replace("SideStore can use local network access", "NovaStore can use local network access")
onboarding_path.write_text(source)
print("NovaStore branding applied.")
